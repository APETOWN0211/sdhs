<script setup lang="ts">
/**
 * 작품 이미지 업로더 (관리자 페이지용)
 *
 * - Controlled component: keepIds / newFiles 를 부모가 v-model 로 관리한다.
 * - 기존 이미지는 표시만 하고, 클릭 시 부모의 keepIds 에서 제거/복원 토글 요청.
 * - 새 파일 선택 시 미리보기 생성 + 부모의 newFiles 에 추가.
 * - 컴포넌트 자체에 내부 상태가 없으므로, 데이터 동기화 문제가 원천 차단됨.
 */

import type { ProjectImage, ResolvedImage } from '~/types/project'

interface Props {
  /** 기존 DB 이미지 (수정 페이지에서 사용) */
  existingImages?: ProjectImage[]
  /** 공개 URL 변환 함수 (Storage path → URL) */
  resolveImageUrl: (img: ProjectImage) => ResolvedImage
  /** 유지할 기존 이미지 ID 목록 (v-model) */
  keepIds: string[]
  /** 새로 업로드할 파일 목록 (v-model) */
  newFiles: File[]
}

const props = withDefaults(defineProps<Props>(), {
  existingImages: () => [],
  keepIds: () => [],
  newFiles: () => []
})

interface Emits {
  (e: 'update:keepIds', ids: string[]): void
  (e: 'update:newFiles', files: File[]): void
}

const emit = defineEmits<Emits>()

const ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

const fileInput = ref<HTMLInputElement | null>(null)
const uploadError = ref<string | null>(null)
const uploading = ref(false)

/** 새 파일 미리보기 URL (id 기반 key) */
const newPreviewUrls = ref<Record<string, string>>({})
let nextPreviewKey = 0

/** keepIds Set (탐색 성능) */
const keepSet = computed(() => new Set(props.keepIds))

/** 새 파일들에 대한 미리보기 생성 (lifecycle 안전) */
watchEffect(() => {
  // props.newFiles 에는 있는데 미리보기가 없는 파일 → URL 생성
  for (const file of props.newFiles) {
    const id = (file as File & { __previewKey?: string }).__previewKey
    if (id && !newPreviewUrls.value[id]) {
      newPreviewUrls.value[id] = URL.createObjectURL(file)
    }
  }
  // props.newFiles 에서 빠진 파일 → 미리보기 해제
  const aliveKeys = new Set(
    props.newFiles
      .map((f) => (f as File & { __previewKey?: string }).__previewKey)
      .filter((k): k is string => !!k)
  )
  for (const key of Object.keys(newPreviewUrls.value)) {
    if (!aliveKeys.has(key)) {
      URL.revokeObjectURL(newPreviewUrls.value[key])
      delete newPreviewUrls.value[key]
    }
  }
})

onBeforeUnmount(() => {
  for (const url of Object.values(newPreviewUrls.value)) {
    URL.revokeObjectURL(url)
  }
  newPreviewUrls.value = {}
})

const openFilePicker = () => {
  fileInput.value?.click()
}

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  await addFiles(files)
  input.value = ''
}

const onDrop = async (event: DragEvent) => {
  event.preventDefault()
  const files = Array.from(event.dataTransfer?.files ?? [])
  await addFiles(files)
}

const addFiles = async (files: File[]) => {
  uploadError.value = null
  const accepted: File[] = []
  for (const file of files) {
    const okType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!okType) {
      uploadError.value = `'${file.name}' 은(는) 지원하지 않는 형식입니다. (jpg, png, webp 만 허용)`
      continue
    }
    if (file.size > MAX_FILE_SIZE) {
      uploadError.value = `'${file.name}' 은(는) 파일 크기가 너무 큽니다. (최대 ${formatBytes(MAX_FILE_SIZE)})`
      continue
    }
    accepted.push(file)
  }
  if (accepted.length === 0) return

  uploading.value = true
  try {
    // 각 파일에 고유 키 부여 (미리보기 추적용)
    for (const file of accepted) {
      ;(file as File & { __previewKey?: string }).__previewKey = `new-${++nextPreviewKey}`
    }
    emit('update:newFiles', [...props.newFiles, ...accepted])
  } finally {
    uploading.value = false
  }
}

const removeNewImage = (file: File) => {
  emit(
    'update:newFiles',
    props.newFiles.filter((f) => f !== file)
  )
}

/** 기존 이미지 keep 토글 (삭제 ↔ 복원) */
const toggleKeepExisting = (id: string) => {
  const set = new Set(props.keepIds)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  emit('update:keepIds', Array.from(set))
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

const getPreviewUrl = (file: File): string | null => {
  const key = (file as File & { __previewKey?: string }).__previewKey
  return key ? newPreviewUrls.value[key] ?? null : null
}
</script>

<template>
  <div class="image-uploader">
    <!-- 업로드 영역 -->
    <div
      class="image-uploader__dropzone"
      @click="openFilePicker"
      @dragover.prevent
      @drop="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        :accept="ACCEPT"
        hidden
        @change="onFileChange"
      />
      <p class="image-uploader__hint">
        클릭하거나 파일을 여기로 드래그하세요
      </p>
      <p class="image-uploader__sub">
        JPG / PNG / WEBP · 최대 {{ formatBytes(MAX_FILE_SIZE) }}
      </p>
    </div>

    <p v-if="uploadError" class="image-uploader__error" role="alert">
      {{ uploadError }}
    </p>
    <p v-if="uploading" class="image-uploader__loading">업로드 준비 중…</p>

    <!-- 기존 이미지 (수정 페이지에서 표시) -->
    <div v-if="existingImages.length > 0" class="image-uploader__section">
      <h4 class="image-uploader__section-title">기존 이미지</h4>
      <div class="image-uploader__grid">
        <div
          v-for="img in existingImages"
          :key="img.id"
          class="image-uploader__item"
          :class="{ 'image-uploader__item--removed': !keepSet.has(img.id) }"
        >
          <img
            :src="resolveImageUrl(img).url"
            :alt="img.alt || '작품 이미지'"
            class="image-uploader__thumb"
          />
          <button
            type="button"
            class="image-uploader__remove"
            @click="toggleKeepExisting(img.id)"
          >
            {{ keepSet.has(img.id) ? '삭제' : '복원' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 새 이미지 미리보기 -->
    <div v-if="newFiles.length > 0" class="image-uploader__section">
      <h4 class="image-uploader__section-title">새로 추가할 이미지</h4>
      <div class="image-uploader__grid">
        <div
          v-for="file in newFiles"
          :key="(file as File & { __previewKey?: string }).__previewKey"
          class="image-uploader__item"
        >
          <img
            v-if="getPreviewUrl(file)"
            :src="getPreviewUrl(file) ?? ''"
            :alt="file.name"
            class="image-uploader__thumb"
          />
          <div v-else class="image-uploader__thumb image-uploader__thumb--placeholder" />
          <button
            type="button"
            class="image-uploader__remove"
            @click="removeNewImage(file)"
          >
            제거
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-uploader {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.image-uploader__dropzone {
  width: 100%;
  min-height: 140px;
  padding: 28px 20px;
  border: 2px dashed #c5c5c5;
  border-radius: 8px;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s ease-in-out, background-color 0.15s ease-in-out;
}

.image-uploader__dropzone:hover {
  border-color: var(--color-black);
  background-color: #f3f3f3;
}

.image-uploader__hint {
  font-family: var(--font-family-base);
  font-size: 15px;
  font-weight: var(--font-weight-medium);
  color: var(--color-black);
  margin: 0;
}

.image-uploader__sub {
  font-family: var(--font-family-base);
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
}

.image-uploader__error {
  font-family: var(--font-family-base);
  font-size: 13px;
  color: #c0392b;
  background-color: #fdecea;
  padding: 8px 12px;
  border-radius: 4px;
  margin: 0;
}

.image-uploader__loading {
  font-family: var(--font-family-base);
  font-size: 13px;
  color: #444;
  margin: 0;
}

.image-uploader__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.image-uploader__section-title {
  font-family: var(--font-family-base);
  font-size: 14px;
  font-weight: var(--font-weight-semi-bold);
  color: var(--color-black);
  margin: 0;
}

.image-uploader__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.image-uploader__item {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  background-color: #f0f0f0;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-uploader__item--removed {
  opacity: 0.4;
}

.image-uploader__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-uploader__thumb--placeholder {
  background-color: #e0e0e0;
}

.image-uploader__remove {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 4px 10px;
  font-family: var(--font-family-base);
  font-size: 12px;
  color: var(--color-white);
  background-color: rgba(0, 0, 0, 0.7);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.image-uploader__remove:hover {
  background-color: rgba(0, 0, 0, 0.9);
}
</style>

<script setup lang="ts">
/**
 * 작품 등록/수정 공용 폼
 *
 * - 작품 이미지 payload (keepIds + newFiles) 를 v-model 로 직접 제어한다.
 * - slug / thumbnail_path / sort_order 등은 자동 처리.
 * - 관리자가 입력하는 필드: 작품명, 학생 이름, 카테고리, 설명, 공개 여부
 */

import type { ProjectFormInput, ProjectImage } from '~/types/project'
import { slugify } from '~/composables/useProjects'

interface ImagePayload {
  keepIds: string[]
  newFiles: File[]
}

interface Props {
  form: ProjectFormInput
  /** 이미지 payload (v-model) */
  images: ImagePayload
  /** 기존 작품 이미지 (수정 페이지에서만 사용) */
  existingImages?: ProjectImage[]
  loading?: boolean
  submitLabel?: string
  /** 이미지 URL 변환 함수 (Storage → public URL) */
  resolveImageUrl: (img: ProjectImage) => { url: string; storage_path: string; alt: string | null }
}

const props = withDefaults(defineProps<Props>(), {
  existingImages: () => [],
  loading: false,
  submitLabel: '저장'
})

interface Emits {
  (e: 'update:form', form: ProjectFormInput): void
  (e: 'update:images', images: ImagePayload): void
  (e: 'submit'): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

const updateForm = <K extends keyof ProjectFormInput>(key: K, value: ProjectFormInput[K]) => {
  const next: ProjectFormInput = { ...props.form, [key]: value }
  // 작품명 변경 시 slug 자동 동기화
  if (key === 'title') {
    next.slug = slugify(value as string)
  }
  emit('update:form', next)
}

const updateImages = (next: ImagePayload) => {
  emit('update:images', next)
}

const onKeepIdsChange = (ids: string[]) => {
  updateImages({ keepIds: ids, newFiles: props.images.newFiles })
}

const onNewFilesChange = (files: File[]) => {
  updateImages({ keepIds: props.images.keepIds, newFiles: files })
}

const handleSubmit = () => {
  emit('submit')
}

const categories: Array<ProjectFormInput['category']> = [
  '편집',
  'UI/UX',
  '브랜딩',
  '패키지'
]
</script>

<template>
  <form class="project-form" @submit.prevent="handleSubmit">
    <!-- 작품명 / 학생 이름 -->
    <div class="project-form__row">
      <div class="project-form__field">
        <label for="title" class="project-form__label">작품명 *</label>
        <input
          id="title"
          type="text"
          class="project-form__input"
          :value="form.title"
          required
          @input="(e) => updateForm('title', (e.target as HTMLInputElement).value)"
        />
      </div>

      <div class="project-form__field">
        <label for="student_name" class="project-form__label">학생 이름 *</label>
        <input
          id="student_name"
          type="text"
          class="project-form__input"
          :value="form.student_name"
          required
          @input="(e) => updateForm('student_name', (e.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- 카테고리 -->
    <div class="project-form__row project-form__row--single">
      <div class="project-form__field">
        <label for="category" class="project-form__label">카테고리</label>
        <select
          id="category"
          class="project-form__input"
          :value="form.category ?? ''"
          @change="(e) => updateForm('category', (e.target as HTMLSelectElement).value || null)"
        >
          <option value="">선택 안 함</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </div>

    <!-- 작품 설명 -->
    <div class="project-form__field">
      <label for="description" class="project-form__label">설명</label>
      <textarea
        id="description"
        class="project-form__input project-form__textarea"
        rows="6"
        :value="form.description ?? ''"
        @input="(e) => updateForm('description', (e.target as HTMLTextAreaElement).value || null)"
      />
    </div>

    <!-- 작품 이미지 -->
    <div class="project-form__field">
      <label class="project-form__label">작품 이미지 *</label>
      <p class="project-form__hint">
        첫 번째 이미지가 목록 썸네일로 자동 사용됩니다. (jpg / png / webp)
      </p>
      <AdminProjectImageUploader
        :existing-images="existingImages"
        :resolve-image-url="resolveImageUrl"
        :keep-ids="images.keepIds"
        :new-files="images.newFiles"
        @update:keep-ids="onKeepIdsChange"
        @update:new-files="onNewFilesChange"
      />
    </div>

    <!-- 공개 여부 -->
    <div class="project-form__field project-form__field--inline">
      <input
        id="is_published"
        type="checkbox"
        :checked="form.is_published"
        @change="(e) => updateForm('is_published', (e.target as HTMLInputElement).checked)"
      />
      <label for="is_published" class="project-form__label project-form__label--inline">
        공개 (체크 시 일반 사용자에게 노출)
      </label>
    </div>

    <!-- 액션 -->
    <div class="project-form__actions">
      <button
        type="button"
        class="project-form__btn project-form__btn--ghost"
        :disabled="loading"
        @click="emit('cancel')"
      >
        취소
      </button>
      <button
        type="submit"
        class="project-form__btn project-form__btn--primary"
        :disabled="loading"
      >
        {{ loading ? '저장 중…' : submitLabel }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.project-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.project-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.project-form__row--single {
  grid-template-columns: 1fr;
}

@media (max-width: 768px) {
  .project-form__row {
    grid-template-columns: 1fr;
  }
}

.project-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-form__field--inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.project-form__label {
  font-family: var(--font-family-base);
  font-size: 14px;
  font-weight: var(--font-weight-semi-bold);
  color: var(--color-black);
}

.project-form__label--inline {
  font-weight: var(--font-weight-medium);
  font-size: 14px;
}

.project-form__input {
  width: 100%;
  padding: 10px 12px;
  font-family: var(--font-family-base);
  font-size: 15px;
  color: var(--color-black);
  background-color: var(--color-white);
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s ease-in-out;
  box-sizing: border-box;
}

.project-form__input:focus {
  border-color: var(--color-black);
}

.project-form__textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
  font-family: var(--font-family-base);
}

.project-form__hint {
  font-family: var(--font-family-base);
  font-size: 12px;
  color: #6b6b6b;
  margin: 0 0 6px;
}

.project-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--color-gray);
}

.project-form__btn {
  padding: 10px 20px;
  font-family: var(--font-family-base);
  font-size: 14px;
  font-weight: var(--font-weight-semi-bold);
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s ease-in-out, background-color 0.15s ease-in-out;
}

.project-form__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.project-form__btn--primary {
  color: var(--color-white);
  background-color: var(--color-black);
}

.project-form__btn--primary:hover:not(:disabled) {
  opacity: 0.85;
}

.project-form__btn--ghost {
  color: var(--color-black);
  background-color: transparent;
  border-color: #c5c5c5;
}

.project-form__btn--ghost:hover:not(:disabled) {
  background-color: #f5f5f5;
}
</style>

<script setup lang="ts">
import type { ProjectFormInput, ProjectWithImages } from '~/types/project'

definePageMeta({
  layout: 'admin',
  // id 변경 시 컴포넌트 강제 remount (페이지 전환 시 폼/이미지 상태가 섞이지 않도록)
  key: (route) => `admin-project-${route.params.id}`
})

const route = useRoute()
const router = useRouter()
const { fetchById, update } = useAdminProjects()
const supabase = useSupabaseClient()

const projectId = computed(() => route.params.id as string)

const submitError = ref<string | null>(null)
const submitting = ref(false)
const notFound = ref(false)

const form = ref<ProjectFormInput>({
  title: '',
  slug: '',
  student_name: '',
  student_number: null,
  category: null,
  short_description: null,
  description: null,
  is_published: false,
  sort_order: 0
})

const imagePayload = ref<{ keepIds: string[]; newFiles: File[] }>({
  keepIds: [],
  newFiles: []
})

/**
 * useAsyncData 로 SSR 단계에서도 데이터를 가져온다.
 * - SSR 에서 supabase 쿠키 세션으로 인증 → 데이터 fetch → hydration 시 그대로 전달
 * - 새로고침해도 데이터가 즉시 보이고, admin 인증도 안정적
 */
const {
  data: project,
  pending: loading,
  error: loadError
} = await useAsyncData<ProjectWithImages | null>(
  () => `admin-project-${projectId.value}`,
  async () => {
    const data = await fetchById(projectId.value)
    return data
  },
  {
    watch: [projectId]
  }
)

// 데이터가 로드되면 form / imagePayload 초기화 (watch 로 데이터 도착 시점에 반영)
watch(
  project,
  (next) => {
    if (!next) {
      notFound.value = true
      return
    }
    notFound.value = false
    form.value = {
      title: next.title,
      slug: next.slug,
      student_name: next.student_name,
      student_number: next.student_number,
      category: next.category,
      short_description: next.short_description,
      description: next.description,
      is_published: next.is_published,
      sort_order: next.sort_order
    }
    imagePayload.value = {
      keepIds: next.images.map((i) => i.id),
      newFiles: []
    }
  },
  { immediate: true }
)

const handleSubmit = async () => {
  submitError.value = null

  if (!form.value.title.trim() || !form.value.student_name.trim()) {
    submitError.value = '작품명과 학생 이름은 필수입니다.'
    return
  }
  // 기존 이미지가 있고 새 이미지도 있으면 OK
  // 기존 이미지를 모두 삭제했고 새 이미지도 없으면 → 최소 1장 필요
  if (imagePayload.value.keepIds.length === 0 && imagePayload.value.newFiles.length === 0) {
    submitError.value = '작품 이미지를 최소 1장 이상 유지하거나 추가해주세요.'
    return
  }

  submitting.value = true
  try {
    const result = await update(
      projectId.value,
      form.value,
      imagePayload.value.newFiles,
      imagePayload.value.keepIds
    )
    if (result.ok) {
      await router.push('/admin/projects')
    } else {
      submitError.value = result.error
    }
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : '저장에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  router.push('/admin/projects')
}

/**
 * AdminProjectForm 의 :resolve-image-url 프롭이 기대하는 시그니처:
 *   (img: { id, storage_path, alt, ... }) => { url, storage_path, alt }
 * storage_path 만 알면 public URL 을 만들 수 있으므로 supabase.storage.getPublicUrl 사용.
 */
const resolveForForm = (img: { id: string; storage_path: string; alt: string | null }) => {
  const { data } = supabase.storage.from('project-images').getPublicUrl(img.storage_path)
  return {
    url: data.publicUrl,
    storage_path: img.storage_path,
    alt: img.alt
  }
}
</script>

<template>
  <div class="admin-edit">
    <div class="admin-edit__container">
      <header class="admin-edit__header">
        <div>
          <h1 class="admin-edit__title">작품 수정</h1>
          <p class="admin-edit__subtitle">
            {{ project?.title || '불러오는 중…' }}
          </p>
        </div>
        <button
          type="button"
          class="admin-edit__btn admin-edit__btn--ghost"
          @click="handleCancel"
        >
          ← 목록으로
        </button>
      </header>

      <p v-if="loading" class="admin-edit__loading">불러오는 중…</p>
      <p v-else-if="loadError" class="admin-edit__error" role="alert">
        {{ loadError.message || '작품을 불러오지 못했습니다.' }}
      </p>
      <p v-else-if="notFound" class="admin-edit__error">
        작품을 찾을 수 없습니다.
      </p>
      <template v-else-if="project">
        <p v-if="submitError" class="admin-edit__error" role="alert">{{ submitError }}</p>

        <AdminProjectForm
          v-model:form="form"
          v-model:images="imagePayload"
          :existing-images="project.images"
          :loading="submitting"
          submit-label="수정 저장"
          :resolve-image-url="resolveForForm"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.admin-edit {
  width: 100%;
  background-color: var(--color-white);
  min-height: calc(100vh - var(--header-height));
}

.admin-edit__container {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px var(--header-padding-x) 80px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-edit__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.admin-edit__title {
  font-family: var(--font-family-base);
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  color: var(--color-black);
  margin: 0;
}

.admin-edit__subtitle {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #666;
  margin: 6px 0 0;
}

.admin-edit__error,
.admin-edit__loading {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #c0392b;
  background-color: #fdecea;
  padding: 12px 14px;
  border-radius: 4px;
  margin: 0;
}

.admin-edit__loading {
  color: #444;
  background-color: #f5f5f5;
}

.admin-edit__btn {
  padding: 10px 18px;
  font-family: var(--font-family-base);
  font-size: 14px;
  font-weight: var(--font-weight-semi-bold);
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
}

.admin-edit__btn--ghost {
  color: var(--color-black);
  background-color: transparent;
  border-color: #c5c5c5;
}

.admin-edit__btn--ghost:hover {
  background-color: #f5f5f5;
}

@media (max-width: 768px) {
  .admin-edit__container {
    padding: 24px var(--footer-padding-x-mobile) 60px;
  }

  .admin-edit__title {
    font-size: 24px;
  }
}
</style>

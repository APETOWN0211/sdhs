<script setup lang="ts">
import type { ProjectFormInput } from '~/types/project'

definePageMeta({
  layout: 'admin'
})

const router = useRouter()
const { create } = useAdminProjects()

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

const submitting = ref(false)
const submitError = ref<string | null>(null)

const onFormUpdate = (next: ProjectFormInput) => {
  form.value = next
}
const onImagesChange = (payload: { keepIds: string[]; newFiles: File[] }) => {
  imagePayload.value = payload
}

const handleSubmit = async () => {
  submitError.value = null

  if (!form.value.title.trim() || !form.value.student_name.trim()) {
    submitError.value = '작품명과 학생 이름은 필수입니다.'
    return
  }
  if (imagePayload.value.newFiles.length === 0) {
    submitError.value = '작품 이미지를 최소 1장 이상 업로드해주세요.'
    return
  }

  submitting.value = true
  try {
    const result = await create(form.value, imagePayload.value.newFiles)
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

// resolveImageUrl 은 신규 등록에서는 사용 안됨 (이미지가 아직 없음)
const noopResolve = () => ({ url: '', storage_path: '', alt: null })
</script>

<template>
  <div class="admin-new">
    <div class="admin-new__container">
      <header class="admin-new__header">
        <div>
          <h1 class="admin-new__title">새 작품 등록</h1>
          <p class="admin-new__subtitle">필수 항목을 입력하고 저장하세요.</p>
        </div>
        <button
          type="button"
          class="admin-new__btn admin-new__btn--ghost"
          @click="handleCancel"
        >
          ← 목록으로
        </button>
      </header>

      <p v-if="submitError" class="admin-new__error" role="alert">{{ submitError }}</p>

      <AdminProjectForm
        v-model:form="form"
        v-model:images="imagePayload"
        :existing-images="[]"
        :loading="submitting"
        submit-label="등록"
        :resolve-image-url="noopResolve"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>

<style scoped>
.admin-new {
  width: 100%;
  background-color: var(--color-white);
  min-height: calc(100vh - var(--header-height));
}

.admin-new__container {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px var(--header-padding-x) 80px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-new__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.admin-new__title {
  font-family: var(--font-family-base);
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  color: var(--color-black);
  margin: 0;
}

.admin-new__subtitle {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #666;
  margin: 6px 0 0;
}

.admin-new__error {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #c0392b;
  background-color: #fdecea;
  padding: 12px 14px;
  border-radius: 4px;
  margin: 0;
}

.admin-new__btn {
  padding: 10px 18px;
  font-family: var(--font-family-base);
  font-size: 14px;
  font-weight: var(--font-weight-semi-bold);
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
}

.admin-new__btn--ghost {
  color: var(--color-black);
  background-color: transparent;
  border-color: #c5c5c5;
}

.admin-new__btn--ghost:hover {
  background-color: #f5f5f5;
}

@media (max-width: 768px) {
  .admin-new__container {
    padding: 24px var(--footer-padding-x-mobile) 60px;
  }

  .admin-new__title {
    font-size: 24px;
  }
}
</style>

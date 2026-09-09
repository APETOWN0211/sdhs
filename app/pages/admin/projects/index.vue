<script setup lang="ts">
import type { ProjectWithImages } from '~/types/project'

definePageMeta({
  layout: 'admin'
})

const router = useRouter()
const { list, loading, error, fetchAll, remove, thumbnailUrl } = useAdminProjects()

interface DeleteTarget {
  id: string
  title: string
}

const deleteTarget = ref<DeleteTarget | null>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

onMounted(async () => {
  await fetchAll()
})

const openDelete = (id: string, title: string) => {
  deleteTarget.value = { id, title }
  deleteError.value = null
}

const cancelDelete = () => {
  deleteTarget.value = null
  deleteError.value = null
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = null
  const result = await remove(deleteTarget.value.id)
  deleting.value = false
  if (result.ok) {
    deleteTarget.value = null
    await fetchAll()
  } else {
    deleteError.value = result.error
  }
}

const goEdit = (id: string) => {
  router.push(`/admin/projects/${id}`)
}

const goNew = () => {
  router.push('/admin/projects/new')
}

const goHome = () => {
  router.push('/admin')
}

const formatDate = (iso: string): string => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return iso
  }
}

/**
 * 작품의 실제 썸네일 경로.
 * thumbnail_path 가 비어있으면 첫 번째 gallery image 로 fallback.
 */
const thumbnailPathFor = (project: ProjectWithImages): string | null => {
  if (project.thumbnail_path) return project.thumbnail_path
  if (project.images.length > 0 && project.images[0]) return project.images[0].storage_path
  return null
}

const thumbUrlFor = (project: ProjectWithImages): string | null => {
  const p = thumbnailPathFor(project)
  return p ? thumbnailUrl(p) : null
}
</script>

<template>
  <div class="admin-projects">
    <div class="admin-projects__container">
      <header class="admin-projects__header">
        <div>
          <h1 class="admin-projects__title">ROLL ON! ADMIN</h1>
          <p class="admin-projects__subtitle">작품 관리</p>
        </div>
        <div class="admin-projects__actions">
          <button
            type="button"
            class="admin-projects__btn admin-projects__btn--ghost"
            @click="goHome"
          >
            ← 대시보드
          </button>
          <button
            type="button"
            class="admin-projects__btn admin-projects__btn--primary"
            @click="goNew"
          >
            + 작품 등록
          </button>
        </div>
      </header>

      <section class="admin-projects__list">
        <div class="admin-projects__list-head">
          <span class="admin-projects__col admin-projects__col--thumb">썸네일</span>
          <span class="admin-projects__col admin-projects__col--title">작품명</span>
          <span class="admin-projects__col admin-projects__col--author">학생</span>
          <span class="admin-projects__col admin-projects__col--category">카테고리</span>
          <span class="admin-projects__col admin-projects__col--status">공개상태</span>
          <span class="admin-projects__col admin-projects__col--order">순서</span>
          <span class="admin-projects__col admin-projects__col--actions">관리</span>
        </div>

        <p v-if="loading" class="admin-projects__loading">불러오는 중…</p>
        <p v-else-if="error" class="admin-projects__error">에러: {{ error }}</p>
        <p v-else-if="list.length === 0" class="admin-projects__empty">
          등록된 작품이 없습니다.
        </p>

        <ul v-else class="admin-projects__rows">
          <li
            v-for="project in list"
            :key="project.id"
            class="admin-projects__row"
          >
            <span class="admin-projects__col admin-projects__col--thumb">
              <div class="admin-projects__thumb">
                <img
                  v-if="thumbUrlFor(project)"
                  :src="thumbUrlFor(project) ?? ''"
                  :alt="project.title"
                />
                <span v-else class="admin-projects__thumb-empty">없음</span>
              </div>
            </span>
            <span class="admin-projects__col admin-projects__col--title">
              <strong>{{ project.title }}</strong>
              <small>{{ formatDate(project.created_at) }}</small>
            </span>
            <span class="admin-projects__col admin-projects__col--author">
              {{ project.student_name }}
            </span>
            <span class="admin-projects__col admin-projects__col--category">
              {{ project.category ?? '—' }}
            </span>
            <span class="admin-projects__col admin-projects__col--status">
              <span
                class="admin-projects__badge"
                :class="project.is_published ? 'admin-projects__badge--on' : 'admin-projects__badge--off'"
              >
                {{ project.is_published ? '공개' : '비공개' }}
              </span>
            </span>
            <span class="admin-projects__col admin-projects__col--order">
              {{ project.sort_order }}
            </span>
            <span class="admin-projects__col admin-projects__col--actions">
              <button
                type="button"
                class="admin-projects__row-btn admin-projects__row-btn--edit"
                @click="goEdit(project.id)"
              >
                수정
              </button>
              <button
                type="button"
                class="admin-projects__row-btn admin-projects__row-btn--delete"
                @click="openDelete(project.id, project.title)"
              >
                삭제
              </button>
            </span>
          </li>
        </ul>
      </section>
    </div>

    <!-- 삭제 확인 모달 -->
    <Teleport to="body">
      <div
        v-if="deleteTarget"
        class="confirm-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="cancelDelete"
      >
        <div class="confirm-modal">
          <h2 class="confirm-modal__title">작품 삭제</h2>
          <p class="confirm-modal__body">
            <strong>"{{ deleteTarget.title }}"</strong> 작품을 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </p>
          <p v-if="deleteError" class="confirm-modal__error">{{ deleteError }}</p>
          <div class="confirm-modal__actions">
            <button
              type="button"
              class="admin-projects__btn admin-projects__btn--ghost"
              :disabled="deleting"
              @click="cancelDelete"
            >
              취소
            </button>
            <button
              type="button"
              class="admin-projects__btn admin-projects__btn--danger"
              :disabled="deleting"
              @click="confirmDelete"
            >
              {{ deleting ? '삭제 중…' : '삭제' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-projects {
  width: 100%;
  background-color: var(--color-white);
  min-height: calc(100vh - var(--header-height));
}

.admin-projects__container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 40px var(--header-padding-x) 80px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.admin-projects__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.admin-projects__title {
  font-family: var(--font-family-base);
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  color: var(--color-black);
  margin: 0;
  letter-spacing: 0.04em;
}

.admin-projects__subtitle {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #666;
  margin: 6px 0 0;
}

.admin-projects__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-projects__btn {
  padding: 10px 18px;
  font-family: var(--font-family-base);
  font-size: 14px;
  font-weight: var(--font-weight-semi-bold);
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s ease-in-out, background-color 0.15s ease-in-out;
}

.admin-projects__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-projects__btn--primary {
  color: var(--color-white);
  background-color: var(--color-black);
}
.admin-projects__btn--primary:hover:not(:disabled) { opacity: 0.85; }

.admin-projects__btn--ghost {
  color: var(--color-black);
  background-color: transparent;
  border-color: #c5c5c5;
}
.admin-projects__btn--ghost:hover:not(:disabled) { background-color: #f5f5f5; }

.admin-projects__btn--danger {
  color: var(--color-white);
  background-color: #c0392b;
}
.admin-projects__btn--danger:hover:not(:disabled) { background-color: #a8311f; }

.admin-projects__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--color-gray);
  border-radius: 8px;
  overflow: hidden;
}

.admin-projects__list-head,
.admin-projects__row {
  display: grid;
  grid-template-columns: 110px 1.4fr 1fr 1fr 110px 60px 180px;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.admin-projects__list-head {
  background-color: #f7f7f7;
  font-family: var(--font-family-base);
  font-size: 13px;
  font-weight: var(--font-weight-semi-bold);
  color: #555;
}

.admin-projects__rows {
  list-style: none;
  padding: 0;
  margin: 0;
}

.admin-projects__row {
  border-top: 1px solid var(--color-gray);
  font-family: var(--font-family-base);
  font-size: 14px;
  color: var(--color-black);
}

.admin-projects__row:hover {
  background-color: #fafafa;
}

.admin-projects__col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.admin-projects__col--title strong {
  font-weight: var(--font-weight-semi-bold);
}

.admin-projects__col--title small {
  font-size: 12px;
  color: #888;
}

.admin-projects__thumb {
  width: 100px;
  aspect-ratio: 16 / 9;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-projects__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-projects__thumb-empty {
  font-size: 12px;
  color: #888;
}

.admin-projects__badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-family: var(--font-family-base);
  font-size: 12px;
  font-weight: var(--font-weight-semi-bold);
  border-radius: 12px;
  align-self: flex-start;
}

.admin-projects__badge--on {
  color: #fff;
  background-color: #2ecc71;
}

.admin-projects__badge--off {
  color: #555;
  background-color: #e8e8e8;
}

.admin-projects__col--actions {
  display: flex;
  gap: 6px;
  flex-direction: row;
}

.admin-projects__row-btn {
  padding: 6px 12px;
  font-family: var(--font-family-base);
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid;
}

.admin-projects__row-btn--edit {
  color: var(--color-black);
  background-color: var(--color-white);
  border-color: var(--color-black);
}

.admin-projects__row-btn--edit:hover {
  background-color: #f5f5f5;
}

.admin-projects__row-btn--delete {
  color: #fff;
  background-color: #c0392b;
  border-color: #c0392b;
}

.admin-projects__row-btn--delete:hover {
  background-color: #a8311f;
}

.admin-projects__loading,
.admin-projects__error,
.admin-projects__empty {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #666;
  padding: 32px;
  text-align: center;
  margin: 0;
}

.admin-projects__error { color: #c0392b; }

/* 모달 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.confirm-modal {
  width: 100%;
  max-width: 420px;
  background-color: var(--color-white);
  border-radius: 8px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.confirm-modal__title {
  font-family: var(--font-family-base);
  font-size: 20px;
  font-weight: var(--font-weight-bold);
  color: var(--color-black);
  margin: 0;
}

.confirm-modal__body {
  font-family: var(--font-family-base);
  font-size: 15px;
  color: #333;
  line-height: 1.5;
  margin: 0;
}

.confirm-modal__error {
  font-family: var(--font-family-base);
  font-size: 13px;
  color: #c0392b;
  background-color: #fdecea;
  padding: 8px 12px;
  border-radius: 4px;
  margin: 0;
}

.confirm-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

@media (max-width: 1024px) {
  .admin-projects__list-head,
  .admin-projects__row {
    grid-template-columns: 80px 1.4fr 1fr 90px 60px 160px;
  }
  .admin-projects__col--category { display: none; }
}

@media (max-width: 768px) {
  .admin-projects__container {
    padding: 24px var(--footer-padding-x-mobile) 60px;
  }

  .admin-projects__title {
    font-size: 24px;
  }

  .admin-projects__list-head { display: none; }

  .admin-projects__row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .admin-projects__col--actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>

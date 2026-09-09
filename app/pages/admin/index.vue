<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

const { user, isAdmin, signOut } = useAdminAuth()
const router = useRouter()

const { list, loading, error, fetchAll } = useAdminProjects()

const totalCount = computed(() => list.value.length)
const publishedCount = computed(() => list.value.filter((p) => p.is_published).length)
const draftCount = computed(() => totalCount.value - publishedCount.value)

onMounted(async () => {
  await fetchAll()
})

const handleSignOut = async () => {
  await signOut()
  await router.push('/admin/login')
}
</script>

<template>
  <div class="admin-home">
    <div class="admin-home__container">
      <header class="admin-home__header">
        <div>
          <h1 class="admin-home__title">ROLL ON! ADMIN</h1>
          <p class="admin-home__subtitle">
            {{ user?.email }} · 관리자
          </p>
        </div>
        <div class="admin-home__actions">
          <NuxtLink to="/admin/projects/new" class="admin-home__btn admin-home__btn--primary">
            + 새 작품 등록
          </NuxtLink>
          <NuxtLink to="/admin/projects" class="admin-home__btn admin-home__btn--secondary">
            작품 관리
          </NuxtLink>
          <button
            type="button"
            class="admin-home__btn admin-home__btn--ghost"
            @click="handleSignOut"
          >
            로그아웃
          </button>
        </div>
      </header>

      <section class="admin-home__stats">
        <div class="admin-home__stat">
          <span class="admin-home__stat-num">{{ totalCount }}</span>
          <span class="admin-home__stat-label">전체 작품</span>
        </div>
        <div class="admin-home__stat">
          <span class="admin-home__stat-num">{{ publishedCount }}</span>
          <span class="admin-home__stat-label">공개</span>
        </div>
        <div class="admin-home__stat">
          <span class="admin-home__stat-num">{{ draftCount }}</span>
          <span class="admin-home__stat-label">비공개</span>
        </div>
      </section>

      <section class="admin-home__panel">
        <h2 class="admin-home__panel-title">최근 작품</h2>
        <p v-if="loading" class="admin-home__loading">불러오는 중…</p>
        <p v-else-if="error" class="admin-home__error">에러: {{ error }}</p>
        <p v-else-if="list.length === 0" class="admin-home__empty">
          등록된 작품이 없습니다. 새 작품을 추가해 보세요.
        </p>
        <ul v-else class="admin-home__recent">
          <li v-for="p in list.slice(0, 5)" :key="p.id" class="admin-home__recent-item">
            <span class="admin-home__recent-title">{{ p.title }}</span>
            <span class="admin-home__recent-author">{{ p.student_name }}</span>
            <span
              class="admin-home__badge"
              :class="p.is_published ? 'admin-home__badge--on' : 'admin-home__badge--off'"
            >
              {{ p.is_published ? '공개' : '비공개' }}
            </span>
            <NuxtLink :to="`/admin/projects/${p.id}`" class="admin-home__recent-link">
              수정 →
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-home {
  width: 100%;
  background-color: var(--color-white);
  min-height: calc(100vh - var(--header-height));
}

.admin-home__container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 40px var(--header-padding-x) 80px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.admin-home__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.admin-home__title {
  font-family: var(--font-family-base);
  font-size: 36px;
  font-weight: var(--font-weight-bold);
  color: var(--color-black);
  margin: 0;
  letter-spacing: 0.04em;
}

.admin-home__subtitle {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #666;
  margin: 6px 0 0;
}

.admin-home__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-home__btn {
  padding: 10px 18px;
  font-family: var(--font-family-base);
  font-size: 14px;
  font-weight: var(--font-weight-semi-bold);
  text-decoration: none;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s ease-in-out, background-color 0.15s ease-in-out;
}

.admin-home__btn--primary {
  color: var(--color-white);
  background-color: var(--color-black);
}
.admin-home__btn--primary:hover { opacity: 0.85; }

.admin-home__btn--secondary {
  color: var(--color-black);
  background-color: var(--color-white);
  border-color: var(--color-black);
}
.admin-home__btn--secondary:hover { background-color: #f5f5f5; }

.admin-home__btn--ghost {
  color: var(--color-black);
  background-color: transparent;
  border-color: #c5c5c5;
}
.admin-home__btn--ghost:hover { background-color: #f5f5f5; }

.admin-home__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.admin-home__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px 24px;
  border: 1px solid var(--color-gray);
  border-radius: 8px;
  background-color: #fafafa;
}

.admin-home__stat-num {
  font-family: var(--font-family-base);
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  color: var(--color-black);
  line-height: 1;
}

.admin-home__stat-label {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #666;
}

.admin-home__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  border: 1px solid var(--color-gray);
  border-radius: 8px;
}

.admin-home__panel-title {
  font-family: var(--font-family-base);
  font-size: 18px;
  font-weight: var(--font-weight-semi-bold);
  color: var(--color-black);
  margin: 0;
}

.admin-home__loading,
.admin-home__error,
.admin-home__empty {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #666;
  margin: 0;
}

.admin-home__error {
  color: #c0392b;
}

.admin-home__recent {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.admin-home__recent-item {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-gray);
  font-family: var(--font-family-base);
  font-size: 15px;
}

.admin-home__recent-item:last-child {
  border-bottom: none;
}

.admin-home__recent-title {
  color: var(--color-black);
  font-weight: var(--font-weight-semi-bold);
}

.admin-home__recent-author {
  color: #666;
}

.admin-home__badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-family: var(--font-family-base);
  font-size: 12px;
  font-weight: var(--font-weight-semi-bold);
  border-radius: 12px;
}

.admin-home__badge--on {
  color: #fff;
  background-color: #2ecc71;
}

.admin-home__badge--off {
  color: #555;
  background-color: #e8e8e8;
}

.admin-home__recent-link {
  font-family: var(--font-family-base);
  font-size: 13px;
  color: var(--color-black);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
}

.admin-home__recent-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .admin-home__container {
    padding: 24px var(--footer-padding-x-mobile) 60px;
  }

  .admin-home__title {
    font-size: 26px;
  }

  .admin-home__stats {
    grid-template-columns: 1fr;
  }

  .admin-home__recent-item {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>

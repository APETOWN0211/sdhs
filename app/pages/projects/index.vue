<script setup lang="ts">
/**
 * 작품 목록 페이지
 * - 데이터 소스: Supabase projects (RLS 가 is_published=true 만 반환)
 * - 디자인/레이아웃/반응형은 기존 그대로 유지
 */

type Category = '전체' | '편집' | 'UI/UX' | '브랜딩' | '패키지'
type ProjectCategory = Exclude<Category, '전체'>

const categories: Category[] = ['전체', '편집', 'UI/UX', '브랜딩', '패키지']
const activeCategory = ref<Category>('전체')

const { list: projects, loading, error, fetchAll, thumbnailUrl } = usePublicProjects()

onMounted(async () => {
  await fetchAll()
})

/** 카테고리 필터링 */
const filteredProjects = computed(() => {
  const base = activeCategory.value === '전체'
    ? projects.value
    : projects.value.filter((p) => p.category === activeCategory.value)
  // 가나다순 정렬
  return [...base].sort((a, b) =>
    a.student_name.localeCompare(b.student_name, 'ko-KR')
  )
})

/** 카드 썸네일 배경 URL (thumbnail_path 없으면 fallback_thumbnail_path 사용) */
const cardBg = (project: { thumbnail_path: string | null; fallback_thumbnail_path: string | null }): string | null => {
  const path = project.thumbnail_path ?? project.fallback_thumbnail_path
  return thumbnailUrl(path)
}

// 카테고리 변경 시 카드 재진입 애니메이션 트리거
const animKey = ref(0)
const isInitialMount = ref(true)

onMounted(() => {
  // 초기 마운트 후 다음 프레임에 플래그 해제
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      isInitialMount.value = false
    })
  })
})

const setCategory = (category: Category) => {
  if (activeCategory.value === category) return
  activeCategory.value = category
  animKey.value++
}
</script>

<template>
  <div class="projects">
    <div class="projects__container">
      <!-- 카테고리 필터 -->
      <div class="projects__categories">
        <button
          v-for="category in categories"
          :key="category"
          type="button"
          class="projects__category"
          :class="{ 'projects__category--active': activeCategory === category }"
          @click="setCategory(category)"
        >
          {{ category }}
        </button>
      </div>

      <!-- 로딩 / 에러 / 빈 상태 -->
      <p v-if="loading" class="projects__status">불러오는 중…</p>
      <p v-else-if="error" class="projects__status projects__status--error">
        {{ error }}
      </p>
      <p v-else-if="filteredProjects.length === 0" class="projects__status">
        등록된 작품이 없습니다.
      </p>

      <!-- 작품 그리드 -->
      <div
        v-else
        :key="`${activeCategory}-${animKey}`"
        class="projects__grid"
        :class="{ 'projects__grid--enter': !isInitialMount }"
      >
        <a
          v-for="(project, index) in filteredProjects"
          :key="project.id"
          :href="`/projects/${project.slug}`"
          class="projects__card"
          :style="{ '--card-index': index }"
          @click.prevent="navigateTo(`/projects/${project.slug}`)"
        >
          <div
            class="projects__card-image"
            :style="cardBg(project) ? { backgroundImage: `url(${cardBg(project)})` } : undefined"
          />
          <div class="projects__card-info">
            <h3 class="projects__card-title">{{ project.title }}</h3>
            <p class="projects__card-author">{{ project.student_name }}</p>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.projects {
  width: 100%;
  background-color: var(--color-white);
}

.projects__container {
  max-width: 1920px;
  margin: 0 auto;
  padding: 40px 64px 90px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* 카테고리 필터 */
.projects__categories {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 30px;
  font-family: var(--font-family-base);
  font-size: 48px;
  line-height: normal;
}

.projects__category {
  font-family: var(--font-family-base);
  font-size: 48px;
  font-weight: var(--font-weight-semi-bold);
  line-height: normal;
  color: #d3d3d3;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.3s ease-in-out;
}

.projects__category:hover {
  color: var(--color-black);
}

.projects__category--active {
  color: var(--color-black);
  font-weight: var(--font-weight-bold);
}

/* 그리드 */
.projects__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  column-gap: 51px;
  row-gap: 60px;
  width: 100%;
}

/* 카드 */
@keyframes cardRise {
  0% {
    opacity: 0;
    transform: translateY(48px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.projects__card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 410px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  position: relative;
  z-index: 1;

  /* 부드러운 호버 전환 */
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1);

  /* 진입 애니메이션 (밑에서 위로 올라오며) */
  opacity: 0;
  transform: translateY(48px);
  animation: cardRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(var(--card-index) * 0.15s + 0.1s);
}

.projects__grid--enter .projects__card {
  animation: cardRise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.projects__card:hover {
  transform: translateY(-6px);
}

.projects__card-image {
  width: 100%;
  aspect-ratio: 410 / 230;
  background-color: #7b7b7b;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: background-color 0.3s ease-in-out;
}

.projects__card:hover .projects__card-image {
  background-color: #5a5a5a;
}

.projects__card-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  justify-content: center;
}

.projects__card-title {
  font-family: var(--font-family-base);
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  line-height: normal;
  color: var(--color-black);
  margin: 0;
  white-space: nowrap;
}

.projects__card-author {
  font-family: var(--font-family-base);
  font-size: 28px;
  font-weight: var(--font-weight-regular);
  line-height: normal;
  color: var(--color-black);
  margin: 0;
  white-space: nowrap;
}

.projects__status {
  font-family: var(--font-family-base);
  font-size: 18px;
  color: #666;
  padding: 40px 0;
  margin: 0;
  text-align: center;
}

.projects__status--error {
  color: #c0392b;
}

/* prefers-reduced-motion: 애니메이션 최소화 */
@media (prefers-reduced-motion: reduce) {
  .projects__card {
    opacity: 1;
    transform: none;
    animation: none;
  }
}

/* 태블릿 */
@media (max-width: 1280px) {
  .projects__grid {
    grid-template-columns: repeat(3, 1fr);
    column-gap: 40px;
  }
}

/* 모바일 */
@media (max-width: 768px) {
  .projects__container {
    padding: 24px 20px 60px;
    gap: 24px;
  }

  .projects__categories {
    font-size: 24px;
    gap: 0 16px;
  }

  .projects__category {
    font-size: 24px;
  }

  .projects__grid {
    grid-template-columns: repeat(2, 1fr);
    column-gap: 20px;
    row-gap: 32px;
  }

  .projects__card {
    --card-translate: 28px;
    --card-stagger-step: 0.1s;
    --card-stagger-base: 0.05s;

    animation-name: cardRiseMobile;
    animation-delay: calc(var(--card-index) * var(--card-stagger-step) + var(--card-stagger-base));
    transform: translateY(var(--card-translate));
  }

  @keyframes cardRiseMobile {
    0% {
      opacity: 0;
      transform: translateY(28px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .projects__card-title {
    font-size: 18px;
  }

  .projects__card-author {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .projects__grid {
    grid-template-columns: 1fr;
  }
}
</style>

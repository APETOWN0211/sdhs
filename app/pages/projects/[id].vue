<script setup lang="ts">
/**
 * 작품 상세 페이지
 * - 라우트 파라미터: slug (string)
 * - 데이터 소스: Supabase projects + project_images
 * - 디자인/레이아웃/반응형은 그대로 유지 (Tablet 다른작품 overflow 수정 포함)
 */

definePageMeta({
  // slug 별로 페이지 캐시 분리
  key: (route) => `project-${route.params.id}`
})

const route = useRoute()

// ── 모달 전환 UX: 슬러그가 바뀌면 즉시 이전 작품 잔상을 지우고 오버레이 표시 ──
// - useState('public-project') 가 글로벌 키라 stale 데이터가 잠깐 보이지 않도록
//   새 슬러그 fetch 직전에 project/images 를 비웁니다.
const {
  project,
  images,
  loading,
  error,
  notFound,
  fetchBySlug,
  thumbnailUrl,
  resolveImage
} = usePublicProject()
const otherProjects = useOtherProjects(computed(() => project.value?.id ?? null), 2)

const slug = computed(() => route.params.id as string)

// 슬러그 변경 → 즉시 stale 비우기 → 새 fetch 시작
// (오버레이 표시 트리거는 switchingFlag 가 담당)
const switchingFlag = ref(false)

const loadAll = async () => {
  switchingFlag.value = true
  // 즉시 이전 작품 잔상 제거
  project.value = null
  images.value = []
  await fetchBySlug(slug.value)
  switchingFlag.value = false
}

watch(slug, loadAll, { immediate: true })

/**
 * 텍스트 필드 hydration 상태:
 * - 데이터 아직 안 옴 (project === null) 또는 전환 중 (switchingFlag) → true
 * - 데이터 도착한 후에는 false → 빈 값이라도 skeleton 안 보임 (요소 자체 미렌더)
 */
const isHydrating = computed(() => project.value === null || switchingFlag.value)

/** 텍스트 필드가 "실제로 들어있는지" 검사 (null/undefined/'' 모두 false) */
const hasText = (field: 'title' | 'student_name' | 'category' | 'description'): boolean => {
  const v = project.value
  if (!v) return false
  const val = (v as Record<string, unknown>)[field]
  return typeof val === 'string' && val.trim().length > 0
}

/**
 * 다른작품 list sanitize:
 * - SSR/CSR hydration mismatch 또는 stale payload 로 인해 일시적으로
 *   list 자체가 배열이 아니거나 (예전 페이지가 객체로 set 한 경우),
 *   id/slug 가 없는 원소가 섞여 들어와도 template 가 깨지지 않도록 방어.
 */
const safeOtherProjects = computed(() => {
  const raw = otherProjects.list
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (p): p is { id: string; slug: string; thumbnail_path: string | null; fallback_thumbnail_path: string | null } =>
      !!p && typeof p === 'object' && typeof (p as { id?: unknown }).id === 'string' && typeof (p as { slug?: unknown }).slug === 'string'
  )
})

/** 작품 thumbnail URL (thumbnail_path 없으면 첫 번째 이미지로 fallback) */
const heroThumbUrl = computed<string | null>(() => {
  if (!project.value) return null
  // 1순위: 작품 thumbnail_path
  if (project.value.thumbnail_path) return thumbnailUrl(project.value.thumbnail_path)
  // 2순위: 첫 번째 gallery image
  if (images.value.length > 0 && images.value[0]) {
    return thumbnailUrl(images.value[0].storage_path)
  }
  return null
})

const heroStyle = computed(() =>
  heroThumbUrl.value ? { backgroundImage: `url(${heroThumbUrl.value})` } : undefined
)

/** 갤러리 이미지 (DB 데이터) → resolved list */
const galleryImages = computed(() => images.value.map((img) => resolveImage(img)))

/** 갤러리 표시:
 *  - 기존 UI 는 hero + row(2개) + hero 구조
 *  - DB 의 첫 번째 이미지를 hero(상단), 그 다음 2개를 row, 그 다음을 두 번째 hero 로 사용
 *  - 이미지가 부족하면 placeholder 배경색만 유지
 */
const galleryFirstImage = computed(() => galleryImages.value[0] ?? null)
const galleryRowImages = computed(() => galleryImages.value.slice(1, 3))
const gallerySecondImage = computed(() => galleryImages.value[3] ?? null)

const imgStyle = (url: string | null | undefined) =>
  url ? { backgroundImage: `url(${url})` } : undefined

/** 다른작품 카드 thumbnail URL (thumbnail_path 없으면 fallback_thumbnail_path 사용) */
const otherCardUrl = (p: { thumbnail_path: string | null; fallback_thumbnail_path: string | null }) =>
  thumbnailUrl(p.thumbnail_path ?? p.fallback_thumbnail_path)
const otherCardStyle = (p: { thumbnail_path: string | null; fallback_thumbnail_path: string | null }) => {
  const url = otherCardUrl(p)
  return url ? { backgroundImage: `url(${url})` } : undefined
}

/** 다른작품 카드 클릭 시 slug 기반 상세로 이동 */
const onOtherClick = (e: MouseEvent, slug: string) => {
  e.preventDefault()
  navigateTo(`/projects/${slug}`)
}

/** SEO */
useSeoMeta({
  title: () => (project.value ? `${project.value.title} | ROLL ON!` : 'ROLL ON!'),
  description: () =>
    project.value?.short_description ?? project.value?.description ?? '서울디자인고등학교 크리에이티브 디자인과 졸업작품',
  ogTitle: () => (project.value ? `${project.value.title} | ROLL ON!` : 'ROLL ON!'),
  ogDescription: () =>
    project.value?.short_description ?? project.value?.description ?? '',
  ogImage: () => heroThumbUrl.value ?? undefined
})
</script>

<template>
  <div class="detail">
    <div class="detail__container">
      <!-- 좌측 sticky 메타 정보 -->
      <aside class="detail__sidebar">
        <div class="detail__meta">
          <!-- skeleton은 "데이터 아직 안 옴" 일 때만 표시.
               데이터 도착했는데 값이 비어있으면 skeleton 도 안 보임 (요소 자체 미렌더) -->
          <h1 v-if="hasText('title')" class="detail__title">{{ project!.title }}</h1>
          <div v-else-if="isHydrating" class="detail__title-skel" aria-hidden="true" />

          <div v-if="hasText('student_name')" class="detail__author-wrap">
            <p class="detail__author">{{ project!.student_name }}</p>
          </div>
          <div v-else-if="isHydrating" class="detail__author-skel" aria-hidden="true" />
        </div>

        <div v-if="hasText('category')" class="detail__category-wrap">
          <p class="detail__category">{{ project!.category }}</p>
        </div>
        <div v-else-if="isHydrating" class="detail__category-skel" aria-hidden="true" />

        <div v-if="hasText('description')" class="detail__description">
          <!-- description 이 있을 때만 줄 단위로 표시.
               비어있으면 아예 영역을 그리지 않음 (이전 작품/기본 문구 잔상 차단) -->
          <p
            v-for="(line, i) in project.description.split(/\n+/).filter(Boolean)"
            :key="i"
          >
            {{ line }}
          </p>
        </div>

        <!-- 다른작품 (데스크톱용, 사이드바 안) -->
        <section class="detail__other detail__other--desktop">
          <h2 class="detail__other-title">다른작품</h2>
          <div class="detail__other-list">
            <a
              v-for="other in safeOtherProjects"
              :key="other.id"
              :href="`/projects/${other.slug}`"
              class="detail__other-item"
              @click="(e) => onOtherClick(e, other.slug)"
            >
              <div
                class="detail__other-thumb"
                :style="otherCardStyle(other)"
              />
            </a>
          </div>
        </section>
      </aside>

      <!-- 우측 이미지 갤러리 -->
      <section class="detail__gallery">
        <p v-if="notFound" class="detail__loading detail__loading--error">
          작품을 찾을 수 없습니다.
        </p>
        <p v-else-if="error" class="detail__loading detail__loading--error">
          {{ error }}
        </p>

        <template v-else>
          <div class="detail__hero">
            <div
              class="detail__hero-image"
              :style="imgStyle(galleryFirstImage?.url) ?? heroStyle"
            />
          </div>          <div v-if="galleryRowImages.length > 0" class="detail__row">
            <div
              v-for="(img, i) in galleryRowImages"
              :key="img.id ?? i"
              class="detail__image detail__image--half"
              :style="imgStyle(img.url)"
            />
            <!-- 이미지가 1개만 있을 때 나머지 1개는 비워둠 -->
            <div
              v-if="galleryRowImages.length < 2"
              class="detail__image detail__image--half detail__image--empty"
            />
          </div>

          <div v-if="gallerySecondImage" class="detail__hero">
            <div
              class="detail__hero-image"
              :style="imgStyle(gallerySecondImage.url)"
            />
          </div>
        </template>

        <!-- 다른작품 (모바일용, 갤러리 맨 아래) -->
        <section class="detail__other detail__other--mobile">
          <h2 class="detail__other-title">다른작품</h2>
          <div class="detail__other-list">
            <a
              v-for="other in safeOtherProjects"
              :key="other.id"
              :href="`/projects/${other.slug}`"
              class="detail__other-item"
              @click="(e) => onOtherClick(e, other.slug)"
            >
              <div
                class="detail__other-thumb"
                :style="otherCardStyle(other)"
              />
            </a>
          </div>
        </section>
      </section>
    </div>

    <!-- 모달식 전환 오버레이:
         - 작품 -> 작품 이동 시 / 초기 진입 시 표시
         - 데이터 도착하면 부드럽게 fade-out -->
    <Transition name="fade">
      <div
        v-if="switchingFlag || loading"
        class="detail__overlay"
        role="status"
        aria-live="polite"
      >
        <div class="detail__overlay-card">
          <div class="detail__overlay-spinner" aria-hidden="true" />
          <p class="detail__overlay-text">작품을 불러오는 중…</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.detail {
  width: 100%;
  background-color: var(--color-white);
}

.detail__container {
  max-width: 1920px;
  margin: 0 auto;
  padding: 34px 64px 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 40px;
}

/* 좌측 사이드바 (sticky) */
.detail__sidebar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  width: 390px;
  /* flex item 내부 콘텐츠가 부모보다 커지면 기본적으로
     min-width: auto 로 인해 sidebar 가 늘어나 버림.
     min-width: 0 으로 명시적으로 축소 허용 */
  min-width: 0;
  flex-shrink: 0;
  padding: 70px 0 34px;
  position: sticky;
  top: var(--header-height);
  align-self: flex-start;
  /* sticky 동작 안정화: 자체 컨테이너에서 transform/filter가 있으면 깨지므로 명시적으로 해제 */
  transform: none;
  filter: none;
  /* 부드러운 시각 전환 */
  transition: opacity 0.2s ease-in-out;
}

.detail__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-bottom: 20px;
  font-family: var(--font-family-base);
  color: var(--color-black);
  line-height: normal;
  white-space: nowrap;
}

.detail__title {
  font-family: var(--font-family-base);
  font-size: 36px;
  font-weight: var(--font-weight-bold);
  line-height: normal;
  color: var(--color-black);
  margin: 0;
}

.detail__author {
  font-family: var(--font-family-base);
  font-size: 24px;
  font-weight: var(--font-weight-regular);
  line-height: normal;
  color: var(--color-black);
  margin: 0;
}

.detail__category {
  font-family: var(--font-family-base);
  font-size: 24px;
  font-weight: var(--font-weight-semi-bold);
  line-height: normal;
  color: var(--color-black);
  white-space: nowrap;
  margin: 0;
}

.detail__description {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 20px;
  width: 100%;
}

.detail__description p {
  font-family: var(--font-family-base);
  font-size: 22px;
  font-weight: var(--font-weight-regular);
  line-height: 1.32;
  color: var(--color-black);
  white-space: pre-wrap;
  margin: 0;
  width: 394px;
}

.detail__loading {
  font-family: var(--font-family-base);
  font-size: 16px;
  color: #666;
  padding: 40px;
  text-align: center;
  width: 100%;
  margin: 0;
}

.detail__loading--error {
  color: #c0392b;
}

.detail__other {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 40px;
  width: 100%;
  /* flex/grid item 내부 콘텐츠가 부모보다 커져도
     sidebar 자체는 부모 너비에 맞춰 줄어들도록 허용 */
  min-width: 0;
}

.detail__other-title {
  font-family: var(--font-family-base);
  font-size: 32px;
  font-weight: var(--font-weight-semi-bold);
  line-height: normal;
  color: var(--color-black);
  margin: 0;
  white-space: nowrap;
}

/* 카드 2개를 항상 부모 컬럼 폭에 맞춰 fluid하게 배치
   - 고정 px width 사용 X
   - grid item의 minmax(0, 1fr)로 인해 min-content까지 줄어들 수 있도록
   - 부모(.detail__sidebar)에 min-width: 0을 함께 줘야 효과 발생 */
.detail__other-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: flex-start;
  padding: 20px 0;
  width: 100%;
  min-width: 0;
}

.detail__other-item {
  display: block;
  width: 100%;
  min-width: 0;
  aspect-ratio: 16 / 9;
  text-decoration: none;
}

.detail__other-thumb {
  width: 100%;
  height: 100%;
  background-color: #d3d3d3;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: transform 0.2s ease-in-out;
}

.detail__other-item:hover .detail__other-thumb {
  transform: scale(1.03);
}

/* 우측 갤러리 */
.detail__gallery {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  flex: 1;
  max-width: 1250px;
  overflow: hidden;
}

.detail__hero {
  width: 100%;
}

.detail__hero-image {
  width: 100%;
  aspect-ratio: 1230 / 692;
  background-color: #7b7b7b;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.detail__row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 1250px;
  max-width: 100%;
  gap: 20px;
}

.detail__image--half {
  width: 615px;
  height: 346px;
  background-color: #7b7b7b;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.detail__image--empty {
  background-color: transparent;
}

/* 태블릿 */
@media (max-width: 1280px) {
  .detail__container {
    padding: 24px 32px 10px;
    gap: 32px;
  }

  .detail__sidebar {
    width: 320px;
    /* 320px - 10px(gap) = 카드가 약 155px씩
       16:9 비율이므로 높이는 약 87px 정도가 되어 충분히 보임 */
  }

  .detail__description p {
    width: 100%;
  }

  .detail__image--half {
    width: 48%;
    height: auto;
    aspect-ratio: 615 / 346;
  }
}

/* 태블릿 - 작은 구간
   카드 2열이 너무 좁아져서 1열이 더 보기 좋은 경우만 1열로 전환.
   우선순위: 기존 2열 유지 → 너무 좁으면 1열.
   912px / sidebar 320px 에서 카드 폭은 약 155px (16:9 → ~87px 높이) 로
   충분히 보기 좋으므로 2열 유지.
   모바일 (<=768px) 에서만 모바일 레이아웃이 발동되므로
   1열 fallback 도 동일하게 모바일 미디어 쿼리에서 처리. */

/* 모바일 */
@media (max-width: 768px) {
  .detail__container {
    flex-direction: column;
    padding: 8px 20px 40px;
    gap: 0;
    justify-content: flex-start;
  }

  .detail__sidebar {
    width: 100%;
    padding: 0;
    position: static;
    align-items: flex-start;
    gap: 14px;
  }

  .detail__gallery {
    flex: none;
    width: 100%;
    max-width: 100%;
    align-items: stretch;
    gap: 12px;
    padding-top: 16px;
  }

  .detail__title {
    font-size: 26px;
  }

  .detail__author {
    font-size: 16px;
  }

  .detail__category {
    font-size: 16px;
    padding-top: 0;
  }

  .detail__meta {
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 0;
  }

  .detail__description {
    align-items: flex-start;
    padding-top: 0;
  }

  .detail__description p {
    font-size: 14px;
    width: 100%;
    text-align: left;
    line-height: 1.4;
  }

  .detail__description p + p {
    margin-top: 10px;
  }

  .detail__other-title {
    font-size: 18px;
  }

  .detail__other-item {
    /* 모바일: sidebar 가 width: 100% 이므로 카드도 fluid 하게 50% 차지.
       height 는 aspect-ratio 가 고정해주므로 별도 height 지정 불필요 */
    width: 100%;
    height: auto;
  }

  .detail__row {
    flex-direction: column;
    width: 100%;
    gap: 12px;
  }

  .detail__image--half {
    width: 100%;
    height: auto;
    aspect-ratio: 615 / 346;
  }

  .detail__other {
    align-items: flex-start;
    padding-top: 16px;
  }

  .detail__other-list {
    justify-content: flex-start;
    padding: 10px 0 0;
    gap: 8px;
  }

  .detail__other--desktop {
    display: none;
  }

  .detail__other--mobile {
    display: flex;
  }
}

/* 데스크톱에서 모바일용 다른작품 숨김 */
@media (min-width: 769px) {
  .detail__other--mobile {
    display: none;
  }
}

/* ─────────────────────────────────────────────
   모달식 전환 오버레이 (stale-data flash 차단)
   ───────────────────────────────────────────── */
.detail__overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.detail__overlay-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px 36px;
  background-color: var(--color-white);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.detail__overlay-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(0, 0, 0, 0.12);
  border-top-color: var(--color-black, #111);
  border-radius: 50%;
  animation: detail-overlay-spin 0.9s linear infinite;
}

.detail__overlay-text {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: 14px;
  color: var(--color-black);
  letter-spacing: 0.02em;
}

@keyframes detail-overlay-spin {
  to { transform: rotate(360deg); }
}

/* 오버레이 fade 전환 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ─────────────────────────────────────────────
   Skeleton placeholder (텍스트 영역)
   - 데이터 도착 전엔 회색 박스, 도착하면 진짜 텍스트
   - 이전 작품 잔상이 잠깐 보이는 문제 차단
   ───────────────────────────────────────────── */
@keyframes detail-skel-shimmer {
  0%   { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}
.detail__title-skel,
.detail__author-skel,
.detail__category-skel {
  display: block;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.06) 25%,
    rgba(0, 0, 0, 0.12) 50%,
    rgba(0, 0, 0, 0.06) 75%
  );
  background-size: 400px 100%;
  animation: detail-skel-shimmer 1.4s ease-in-out infinite;
  border-radius: 6px;
}
.detail__title-skel {
  width: 220px;
  height: 40px;
  margin: 0;
}
.detail__author-skel {
  width: 140px;
  height: 26px;
  margin: 8px 0 0;
}
.detail__category-skel {
  width: 100px;
  height: 22px;
  margin: 4px 0 0;
}

</style>

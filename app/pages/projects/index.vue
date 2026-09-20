<script setup lang="ts">
/**
 * 작품 목록 페이지
 * - 데이터 소스: Supabase projects (RLS 가 is_published=true 만 반환)
 * - 데이터 fetch: usePublicProjects 내부의 useAsyncData 가 SSR 단계에서 자동 실행.
 *   /works 진입 시 HTML 자체에 작품 정보가 포함되어 즉시 표시된다.
 * - 디자인/레이아웃/반응형은 기존 그대로 유지
 */

type Category = '전체' | '편집' | 'UI/UX' | '브랜딩' | '패키지'
type ProjectCategory = Exclude<Category, '전체'>

const categories: Category[] = ['전체', '편집', 'UI/UX', '브랜딩', '패키지']
const activeCategory = ref<Category>('전체')

const { list: projects, loading, error, thumbnailUrl } = usePublicProjects()

/**
 * 첫 viewport 에 보이는 작품 카드 개수.
 * - Desktop 4열 / Tablet 3열 / Mobile 2열 기준
 * - LCP 후보(이미지 1장)와 첫 줄/둘째 줄만 eager + high fetchpriority.
 * - 나머지는 lazy + async 로 미뤄 main thread decode 부담을 줄인다.
 * - 모든 이미지에 high 를 주면 첫 paint 가 늦어지므로 권장하지 않음.
 */
const EAGER_COUNT = 8

/**
 * Skeleton 카드 개수.
 * - 첫 화면이 비어 보이지 않도록 Desktop 4열 기준 약 2줄(8개) 채움.
 * - SSR 단계에서 즉시 렌더되어 첫 paint 시 회색 카드가 보여
 *   데이터 fetch 지연 동안 layout shift 가 발생하지 않는다.
 */
const SKELETON_COUNT = 8

/**
 * 정렬된 작품 목록 (가나다순)
 * - 매번 새 배열을 spread+sort 하면 reactive deps 가 바뀔 때마다 전체 grid 가 재계산됨.
 *   → projects/activeCategory 가 변하지 않으면 캐시된 결과 그대로 반환 (Vue computed 의 의도).
 * - 단, sort 결과는 별도 캐시 Map 으로 id-list 형태로 보관해 filter 가 변경되어도
 *   동일 작품의 순서는 즉시 가져옴.
 */
const sortedProjects = computed(() => {
  return [...projects.value].sort((a, b) =>
    a.student_name.localeCompare(b.student_name, 'ko-KR')
  )
})

/** 카테고리 필터링 — 정렬된 전체 목록에서 한 번만 slice */
const filteredProjects = computed(() => {
  const all = sortedProjects.value
  if (activeCategory.value === '전체') return all
  return all.filter((p) => p.category === activeCategory.value)
})

/**
 * 작품의 thumbnail URL 을 한 번만 계산해서 캐시.
 * - 이전: 템플릿 안에서 cardBg(project) 를 v-if 와 :src 두 번 호출 → 렌더마다 2회 계산.
 * - 개선: project id 키로 URL 을 캐싱해서 같은 id 에 대해서는 즉시 반환.
 * - 카드 15개 기준, 매 렌더마다 supabase.storage.from(...).getPublicUrl(...) 호출을 제거.
 * - projectThumbnailUrl 는 전체 프로젝트에 대한 URL 을 미리 계산해서
 *   템플릿에서 함수 호출 없이 :src 로 직접 바인딩 → v-for 재렌더 비용 최소화.
 */
const urlCache = new Map<string, string>()

/** filteredProjects 의 모든 작품 URL 을 미리 계산 → 템플릿은 lookup 만 함 */
const projectThumbnailUrl = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  for (const p of filteredProjects.value) {
    if (urlCache.has(p.id)) {
      const cached = urlCache.get(p.id)!
      if (cached) out[p.id] = cached
      continue
    }
    const path = p.thumbnail_path ?? p.fallback_thumbnail_path
    const url = thumbnailUrl(path)
    urlCache.set(p.id, url ?? '')
    if (url) out[p.id] = url
  }
  return out
})

/**
 * 템플릿용 lookup 함수.
 * - projectThumbnailUrl 는 computed 라서 같은 reactive tick 에서는 캐시.
 * - 템플릿에서 한 번만 호출하도록 getCardUrl 헬퍼로 통일.
 */
const getCardUrl = (project: { id: string }): string | undefined => {
  return projectThumbnailUrl.value[project.id]
}

/**
 * 이미지 로드 상태 추적.
 * - 카드 id 별로 loaded / failed / loading 상태를 보관하여
 *   .projects__card-img.is-loaded → opacity 1 fade-in.
 * - 실패한 이미지는 .is-failed 클래스 → wrapper 의 회색 배경만 유지.
 * - skeleton 단계가 끝나면 첫 카드 등장 시 부드럽게 표시된다.
 *
 * 클라이언트에서 이미지가 캐시되어 즉시 로드되면 @load 가 발동되지 않을 수
 * 있으므로, onMounted 에서 img.complete + naturalWidth 도 함께 체크하여
 * loaded 상태로 강제 마킹한다.
 */
const imageState = reactive<Record<string, 'loading' | 'loaded' | 'failed'>>({})

/** 카드 img element ref 보관 (mount 시 complete 체크용) */
const cardImgRefs = new Map<string, HTMLImageElement | null>()

const setCardImgRef = (id: string, el: Element | ComponentPublicInstance | null) => {
  cardImgRefs.set(id, (el as HTMLImageElement | null) ?? null)
}

const onImageLoad = (id: string) => {
  imageState[id] = 'loaded'
}
const onImageError = (id: string) => {
  imageState[id] = 'failed'
}

/**
 * 처음에는 모든 작품 이미지를 'loading' 상태로 마킹해
 * - fade-in 진입점이 일관되게 동작하게 한다.
 * - 단, SSR 단계에서는 'loaded' 로 미리 마킹하지 않는다.
 *   (서버에서 imageState 는 빈 상태 → 클래스 없음 → opacity 1 인 상태로 hydrate)
 *   → 어떤 시점에서든 이미지가 보이지 않는 상황 자체를 방지한다.
 */
watch(
  projects,
  (next) => {
    if (!import.meta.client) return
    for (const p of next) {
      if (!(p.id in imageState)) imageState[p.id] = 'loading'
    }
    // client 측에서 projects 가 hydrate 된 직후, 이미 캐시된 이미지를 즉시 loaded 처리.
    requestAnimationFrame(() => {
      for (const p of next) {
        const el = cardImgRefs.get(p.id)
        if (el && el.complete && el.naturalWidth > 0) {
          imageState[p.id] = 'loaded'
        }
      }
    })
  },
  { immediate: true }
)

/**
 * SSR 단계에서 skeleton 표시 여부.
 * - SSR 시점에는 projects 가 빈 배열이지만 loading 은 true (useAsyncData pending).
 * - hydrate 시 data 가 즉시 채워지므로 skeleton → 실카드 전환이 자연스럽다.
 */
const isSkeletonPhase = computed(
  () => loading.value && projects.value.length === 0
)

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

/*
const setCategory = (category: Category) => {
  if (activeCategory.value === category) return
  activeCategory.value = category
  animKey.value++
}
*/
</script>

<template>
  <div class="projects">
    <div class="projects__container">
      <!-- [임시 주석] 카테고리 필터
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
      -->

      <!-- 에러 / 빈 상태 -->
      <p v-if="error" class="projects__status projects__status--error">
        {{ error }}
      </p>
      <p
        v-else-if="!loading && filteredProjects.length === 0"
        class="projects__status"
      >
        등록된 작품이 없습니다.
      </p>

      <!--
        Skeleton UI.
        - SSR 단계에서 즉시 렌더되어 첫 paint 시 회색 카드가 채워진다.
        - 실제 카드의 grid 위치 / 폭 / image aspect-ratio(410/230) 와 동일하게
          잡아 skeleton → 실카드 전환 시 layout shift 가 발생하지 않는다.
        - 자식 skeleton 박스(skeleton-image / skeleton-title / skeleton-author) 는
          정적 #ececec 이고 animation 은 카드 1개당 하나로 최소화 (스크롤 성능 보호).
      -->
      <div
        v-if="isSkeletonPhase"
        class="projects__grid projects__grid--skeleton"
        aria-hidden="true"
      >
        <div
          v-for="n in SKELETON_COUNT"
          :key="`skeleton-${n}`"
          class="projects__card projects__card--skeleton"
        >
          <div class="projects__card-image skeleton-image"></div>
          <div class="projects__card-info">
            <div class="skeleton-title"></div>
            <div class="skeleton-author"></div>
          </div>
        </div>
      </div>

      <!-- 작품 그리드 -->
      <div
        v-else-if="filteredProjects.length > 0"
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
          <!--
            이미지 카드:
            - <img> 로 렌더링하여 loading="lazy" / decoding="async" / fetchpriority 활용.
            - wrapper 의 회색 background(#7b7b7b) 가 skeleton 역할을 겸한다.
            - 첫 viewport 의 첫 몇 장은 즉시 표시되도록 eager + high fetchpriority,
              나머지는 lazy. 모든 이미지에 high 를 주면 첫 paint 가 늦어진다.
            - aspect-ratio 는 wrapper 에서 미리 확보 → 이미지 로딩 중에도 카드 높이 안 흔들림.
            - 이미지 로드 시 .is-loaded 가 붙어 짧은 opacity fade-in 만 적용 (성능 부담 없음).
            - 로드 실패 시 .is-failed 가 붙어 wrapper 의 placeholder 배경만 유지 (broken icon 방지).
          -->
          <div class="projects__card-image">
            <img
              v-if="getCardUrl(project)"
              :ref="(el) => setCardImgRef(project.id, el)"
              :src="getCardUrl(project)!"
              :alt="project.title"
              class="projects__card-img"
              :class="{
                'is-loaded': imageState[project.id] === 'loaded',
                'is-failed': imageState[project.id] === 'failed',
                'is-loading': imageState[project.id] === 'loading'
              }"
              :loading="index < EAGER_COUNT ? 'eager' : 'lazy'"
              :decoding="index === 0 ? 'sync' : 'async'"
              :fetchpriority="index < EAGER_COUNT ? 'high' : 'auto'"
              :draggable="false"
              width="410"
              height="230"
              @load="onImageLoad(project.id)"
              @error="onImageError(project.id)"
            />
          </div>
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
  /*
   * 긴 제목이 grid column 을 늘리지 못하게 차단.
   * - grid child 의 기본 min-width: auto 가 콘텐츠 폭에 끌려가서
   *   카드가 column 폭보다 넓어지는 문제를 막는다.
   */
  min-width: 0;

  /* [성능 테스트용] content-visibility 일시 OFF
  content-visibility: auto;
  contain-intrinsic-size: 410px 380px;
  */

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
  overflow: hidden;
  /*
   * background-color transition 은 카드 15장에 동시에 걸리면 main thread 에 부담.
   * → GPU 친화적인 opacity 변경으로 동일 디자인(hover 시 어두워짐) 유지.
   * → 배경색은 wrapper 에 고정, 이미지 자체에 opacity hover 만 적용한다.
   */
}

/*
 * 이미지를 <img> 로 렌더링하므로 카드 영역을 100% 채우도록 강제.
 * - aspect-ratio 는 wrapper 가 이미 잡고 있어 layout shift 없음.
 * - object-fit: cover 로 카드가 항상 일정한 비율로 보임.
 * - 이미지가 없거나 로딩 실패해도 wrapper 의 회색 배경이 보여 깨지지 않음.
 * - GPU 친화적인 opacity transition 으로 hover 시 어두워지는 디자인을 유지.
 *   (transition: background-color 제거 → 15장 동시 hover 시 main thread 부담 제거)
 */
.projects__card-img {
  /*
   * 이미지 표시 방식:
   * - 기본 opacity 1 (SSR HTML 에서도 항상 보임) → 어떤 시점에서도 빈 영역 없음.
   * - wrapper(.projects__card-image) 의 background-color 가 placeholder 역할.
   * - client hydrate 후 watch 가 .is-loading 을 잠깐 붙여, 아직 decode 안된
   *   이미지에 한해 1 → 0 → 1 fade-in 으로 자연스러운 전환을 만든다.
   * - @load 발동 후에는 .is-loaded 가 붙어 0 → 1 fade-in.
   * - transform / scale / blur 등 main thread 비용 큰 효과는 사용하지 않는다.
   */
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
  user-select: none;
  -webkit-user-drag: none;
  opacity: 1;
  transition: opacity 0.2s ease;
}

/* client hydrate 후, 아직 디코딩이 끝나지 않은 이미지만
   잠깐 보이지 않게 했다가 @load 시 fade-in. SSR 단계에서는
   .is-loading 이 붙지 않으므로 영향 없음. */
.projects__card-img.is-loading {
  opacity: 0;
}

.projects__card-img.is-loaded {
  opacity: 1;
}

.projects__card-img.is-failed {
  /* wrapper 의 회색 background 만 보이도록 opacity 0 유지 (broken icon 차단) */
  opacity: 0;
}

/* hover 시 어두워지는 디자인은 기존대로 유지. */
.projects__card:hover .projects__card-img.is-loaded {
  opacity: 0.7;
}

.projects__card-info {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: flex-start;
  justify-content: center;
}

.projects__card-title {
  font-family: var(--font-family-base);
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  /*
   * 작품 목록 제목 — 한 줄 + ellipsis 통일:
   * - 2줄 line-clamp, min-height 제거 → 모든 카드의 제목 높이가 동일해져
   *   작가명과의 간격이 들쭉날쭉해지지 않는다.
   * - white-space: nowrap + text-overflow: ellipsis 로 카드 폭 안에 한 줄로.
   * - min-width: 0 + width: 100% 로 grid/flex 가 콘텐츠 폭에 끌려가지 않게.
   * - line-height 1.5 명시 → 카드의 min-height 일관성 유지.
   */
  line-height: 1.5;
  color: var(--color-black);
  margin: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.projects__card-author {
  font-family: var(--font-family-base);
  font-size: 28px;
  font-weight: var(--font-weight-regular);
  /*
   * 데스크탑/태블릿: 학생 이름도 nowrap → 제거하지 않고 ellipsis 로 안전 처리.
   * - 모바일 breakpoint 에서 white-space: normal 로 덮어씀.
   * - min-width: 0 + width: 100% 로 카드 폭 안에 머무르게.
   */
  line-height: 1.5;
  color: var(--color-black);
  margin: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: anywhere;
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

/*
 * Skeleton UI.
 * - 실제 카드와 동일 grid / 동일 wrapper 구조 / 동일 aspect-ratio 를 공유하므로
 *   skeleton → 실카드 전환 시 layout shift 가 발생하지 않는다.
 * - 자식 skeleton 박스는 정적 #ececec 이고 pulse animation 은 카드 1개당 1회만
 *   적용 → 8개 카드가 동시에 animate 해도 main thread 부담 최소화.
 * - prefers-reduced-motion 에서는 animation 비활성화.
 */
.projects__card--skeleton {
  cursor: default;
  pointer-events: none;
  animation: skeletonPulse 1.6s ease-in-out infinite;
  animation-delay: calc(var(--card-index, 0) * 0.05s);
  /* hover / opacity 전환 효과는 skeleton 에 불필요 → 비활성 */
  transition: none;
}

.projects__card--skeleton:hover {
  transform: none;
}

.skeleton-image {
  /* .projects__card-image 의 aspect-ratio + background-color 를 그대로 사용. */
  width: 100%;
  height: auto;
  aspect-ratio: 410 / 230;
  background-color: #ececec;
  border-radius: 4px;
}

.skeleton-title {
  width: 65%;
  height: calc(32px * 1.5); /* Desktop title font-size * line-height */
  background-color: #ececec;
  border-radius: 4px;
}

.skeleton-author {
  width: 30%;
  height: calc(28px * 1.5); /* Desktop author font-size * line-height */
  background-color: #ececec;
  border-radius: 4px;
}

@keyframes skeletonPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* prefers-reduced-motion: 애니메이션 최소화 */
@media (prefers-reduced-motion: reduce) {
  .projects__card {
    opacity: 1;
    transform: none;
    animation: none;
  }
  .projects__card--skeleton {
    animation: none;
    opacity: 1;
  }
  .projects__card-img {
    /* reduced-motion 사용자에게도 fade-in 으로 인한 깜빡임 방지 → 즉시 표시 */
    transition: none;
    opacity: 1;
  }
  .projects__card-img.is-failed {
    opacity: 0;
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

  /*
   * 모바일 grid:
   * - repeat(2, minmax(0, 1fr)) 로 column 의 min-content 가 grid 폭을
   *   결정하지 못하게 한다. (기본 1fr = minmax(auto, 1fr) 라서
   *   카드 안의 nowrap 텍스트가 column 을 늘려 가로 스크롤이 생김)
   * - gap 도 모바일에서 줄어든 폭에 맞춰 축소.
   */
  .projects__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 20px;
    row-gap: 32px;
  }

  /*
   * 카드 / 카드 내부 flex children 에 min-width: 0.
   * - CSS Grid + Flex 의 기본 min-width: auto 가 콘텐츠 폭에 의해
   *   셀이 강제로 늘어나는 문제를 차단한다.
   * - 이게 없으면 h3 (nowrap 제목) 가 column min-width 를 결정해
   *   iPhone 16 폭(393~402px) 에서 카드가 viewport 밖으로 나간다.
   */
  .projects__card,
  .projects__card-info {
    min-width: 0;
  }

  /*
   * 모바일 contain-intrinsic-size 는 카드 폭을 가정한 값.
   * - 모바일 column 폭(~166.5px) 보다 큰 410px 힌트가 들어가면
   *   일부 브라우저에서 grid row 의 폭 계산이 흔들릴 수 있어
   *   모바일에서는 column 폭에 맞는 값으로 덮어쓴다.
   * - 가로: column 폭의 안전한 상한(190px) 으로 설정.
   *   실제 카드 폭(353px at 393px viewport) 이 더 크면 그리드가 다시 정확히 잡지만,
   *   off-screen 상태에서 grid row 의 min-width 힌트로는 적정값.
   * - 세로: 카드 전체(텍스트 라인 포함) 약 280~320px 추정.
   */
  .projects__card {
    --card-translate: 28px;
    --card-stagger-step: 0.1s;
    --card-stagger-base: 0.05s;

    animation-name: cardRiseMobile;
    animation-delay: calc(var(--card-index) * var(--card-stagger-step) + var(--card-stagger-base));
    transform: translateY(var(--card-translate));

    /* [성능 테스트용] content-visibility 일시 OFF
    contain-intrinsic-size: 190px 320px;
    */
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

  /*
   * 모바일도 Desktop 과 동일하게 — 제목 한 줄 + ellipsis 통일.
   * 카드 폭이 좁아져도 title 의 줄 수가 변하지 않으므로
   * 작가명과의 간격이 모든 카드에서 일정하게 유지된다.
   */
  .projects__card-title,
  .projects__card-author {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    overflow-wrap: anywhere;
    word-break: keep-all;
  }

  .projects__card-title {
    font-size: 18px;
    line-height: 1.4;
  }

  .projects__card-author {
    font-size: 16px;
  }

  /* 모바일에서 skeleton 텍스트 박스 높이도 실 카드 폰트와 매칭. */
  .skeleton-title {
    height: calc(18px * 1.4);
  }
  .skeleton-author {
    height: calc(16px * 1.4);
  }
}

@media (max-width: 480px) {
  /*
   * iPhone 16(393), 16 Plus(430), SE 3rd(375) 등 폭이 좁은 모바일.
   * - 1열로 전환해 카드가 viewport 폭을 안정적으로 채우게 한다.
   * - 1fr 단독이어도 minmax(0, 1fr) 로 두는 이유는 동일:
   *   nowrap 텍스트가 column 을 늘리지 못하게.
   */
  .projects__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

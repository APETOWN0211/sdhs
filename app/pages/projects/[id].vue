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
const router = useRouter()

// "이전으로 돌아가기" 핸들러
// - history.length 가 충분하면 router.back()
// - 직접 URL 진입 등으로 history 가 없으면 /projects 로 fallback
// - SSR 환경에서는 window 가 없으므로 onMounted 이후에만 실제 분기
const canGoBack = ref(false)

const goBack = () => {
  if (canGoBack.value) {
    router.back()
  } else {
    router.push('/projects')
  }
}

onMounted(() => {
  // 직접 URL 진입 시 history.length === 1 인 케이스도 있어서
  // document.referrer 가 같은 origin 이면 안전하게 back 처리
  if (typeof window !== 'undefined') {
    const hasHistory = window.history.length > 1
    const referrer = document.referrer
    const sameOriginReferrer = !!referrer && new URL(referrer).origin === window.location.origin
    canGoBack.value = hasHistory && sameOriginReferrer
  }
})

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
const otherProjects = useOtherProjectsSequential(computed(() => project.value?.id ?? null), 2)

/**
 * 다른작품 명시 fetch:
 * - useOtherProjectsSequential 의 watch 가 reactive deps 추적에서
 *   일부 케이스 (SSR hydrate 직후, useState 값이 sync 로 들어오는 경우) 에
 *   trigger 되지 않는 문제를 우회하기 위해 fetch 를 명시적으로 호출한다.
 * - project.value 가 설정된 직후 / slug 가 바뀐 직후 모두 안전하게 동작.
 */
const otherProjectsRefetch = async () => {
  if (project.value?.id) {
    await otherProjects.fetch()
  }
}

const slug = computed(() => route.params.id as string)

// 슬러그 변경 → 즉시 stale 비우기 → 새 fetch 시작
// (오버레이 표시 트리거가 switchingFlag 가 담당)
const switchingFlag = ref(false)

const loadAll = async () => {
  switchingFlag.value = true
  // 즉시 이전 작품 잔상 제거
  project.value = null
  images.value = []
  await fetchBySlug(slug.value)
  // 작품 fetch 완료 후 다른작품도 명시적으로 fetch.
  // → useState 기반 reactive deps 추적에 의존하지 않고 동기적으로 보장.
  await otherProjectsRefetch()
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
  // otherProjects.list 는 Ref<OtherProjectSummary[]> 이므로 .value 로 접근해야 array 가 나온다.
  // (template 에서는 자동 unwrap 되지만 script 에서 직접 접근할 때는 .value 가 필요)
  const raw = otherProjects.list.value
  if (!Array.isArray(raw)) return []
  return raw as Array<{ id: string; slug: string; title: string; student_name: string; thumbnail_path: string | null; fallback_thumbnail_path: string | null }>
})

// 디버그: 다른작품 상태 추적
if (import.meta.client) {
  // 원본 list 까지 추적해서 filter 에서 뭐가 빠지는지 진단
  watch(
    () => otherProjects.list.value,
    (raw) => {
      const isArr = Array.isArray(raw)
      // eslint-disable-next-line no-console
      console.log('[detail] otherProjects.list isArray:', isArr, 'length:', isArr ? (raw as unknown[]).length : 'N/A')
      if (isArr) {
        ;(raw as unknown[]).forEach((p, i) => {
          // eslint-disable-next-line no-console
          console.log(`  [${i}]`, p, 'typeof id:', typeof (p as { id?: unknown })?.id, 'typeof slug:', typeof (p as { slug?: unknown })?.slug)
        })
      }
    },
    { immediate: true, deep: true }
  )

  watch(
    safeOtherProjects,
    (next) => {
      // eslint-disable-next-line no-console
      console.log('[detail] safeOtherProjects count:', next.length, next.map(p => ({ id: p.id, slug: p.slug, title: p.title })))
    },
    { immediate: true }
  )
}

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

/** 갤러리 이미지 (DB 데이터) → resolved list */
const galleryImages = computed(() => images.value.map((img) => resolveImage(img)))

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
      <!--
        뒤로가기 버튼: .detail__sidebar 의 첫 자식으로 이동.
        - 기존 absolute overlay 방식 → sidebar 자체가 sticky 라 버튼도 자연스럽게 따라옴.
        - sidebar 가 flex column 이므로 별도 레이아웃 변경 없이 flex flow 에 편입.
        - sidebar 의 첫 요소로 들어가므로 meta(제목/작가/카테고리) 위에 위치.
      -->
      <!-- 좌측 sticky 메타 정보 -->
      <aside class="detail__sidebar">
        <button
          type="button"
          class="detail__back"
          aria-label="이전 페이지로 돌아가기"
          @click="goBack"
        >
          <svg
            class="detail__back-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M19 12H5M11 18L5 12L11 6"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

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

        <!--
          다른작품 영역은 sidebar 가 아닌 메인 컬럼(.detail__gallery) 안으로 옮겼다.
          - 데스크톱에서 sidebar 안에 두면 가로폭이 좁아져 카드 정보(제목/학생명)가
            시각적으로 답답해진다.
          - 새 카드는 "썸네일 + 작품명 + 학생이름" 이 들어가야 하므로
            메인 컬럼의 다른작품 영역(데스크톱/모바일 공통)을 사용한다.
        -->

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
          <!--
            작품 이미지 표시 방식:
            - 모든 작품 이미지를 같은 가로 너비로 세로로 나열.
            - width:100% + height:auto 로 원본 aspect ratio 그대로 노출.
            - object-fit: contain 으로 crop 없이 전체 표시.
            - 첫 번째 이미지는 우선 로드, 이후는 lazy.
          -->
          <div
            v-for="(img, i) in galleryImages"
            :key="img.id ?? i"
            class="detail__hero"
          >
            <img
              class="detail__hero-image"
              :src="img.url"
              :alt="project?.title ?? '작품 이미지'"
              :loading="i === 0 ? 'eager' : 'lazy'"
              :fetchpriority="i === 0 ? 'high' : 'auto'"
              decoding="async"
            />
          </div>
        </template>
      </section>
    </div>

    <!--
      다른작품 (데스크톱/모바일 공통, 페이지 하단 풀폭 section)
      - 기존: 갤러리(작품 사진) 맨 아래에 위치했음.
        → 데스크톱에서 sidebar 가 sticky 인 상태로 다른작품이 보이면
          sidebar 의 description 과 gallery 의 다른작품이 시각적으로 어긋남.
      - 변경: .detail__container 바깥, 페이지 하단에 별도 section 으로 분리.
        → 데스크톱에서는 [sidebar | gallery] row 가 끝난 다음 페이지 끝에
          다른작품이 전체 폭으로 표시. sidebar 의 description 다음 흐름과 동일.
        → 모바일에서도 column 흐름에서 자연스럽게 페이지 끝에 표시.
      - 카드 구성: 썸네일 + 작품명 (제목만, 학생이름 제거).
    -->
    <section class="detail__other">
      <h2 class="detail__other-title">다른작품</h2>
      <div class="detail__other-list">
        <a
          v-for="other in safeOtherProjects"
          :key="other.id"
          :href="`/projects/${other.slug}`"
          class="detail__other-card"
          @click="(e) => onOtherClick(e, other.slug)"
        >
          <div
            class="detail__other-thumb"
            :style="otherCardStyle(other)"
          />
          <h3 class="detail__other-card-title">{{ other.title }}</h3>
        </a>
      </div>
    </section>

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
  /* 뒤로가기 버튼의 absolute positioning 앵커 */
  position: relative;
}

/*
 * "이전으로 돌아가기" — 원형 아이콘 버튼
 *
 * - 기존: .detail__container 직속 absolute overlay (스크롤 시 sticky sidebar 와 분리됨).
 * - 변경: .detail__sidebar 의 첫 자식으로 편입.
 *   sidebar 자체가 position: sticky + top: var(--header-height) 이므로
 *   버튼도 자연스럽게 sticky 동작에 따라간다 (스크롤 시 함께 내려옴).
 * - absolute 위치/top/left/z-index 제거 → flex 흐름 안으로.
 * - sidebar 의 padding-top 도 같이 줄여 버튼이 너무 아래로 밀리지 않게 한다.
 */
.detail__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 44px;
  height: 44px;
  padding: 0;
  margin: 0;
  margin-bottom: 22px;

  background: #ffffff;
  border: 1.5px solid #000000;
  border-radius: 50%;
  color: #000000;
  cursor: pointer;

  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.detail__back:hover {
  background: #000000;
  color: #ffffff;
}

.detail__back-icon {
  display: block;
  flex-shrink: 0;
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
  /*
   * padding-top: 기존 70px → 36px 로 조정.
   * - sidebar 안에 .detail__back 버튼이 첫 자식으로 들어왔으므로
   *   절대 위치로 잡아주던 34px 의 컨테이너 padding 과 시각적으로 비슷한 여백을
   *   sidebar 자체 padding 으로 처리한다.
   * - back 버튼의 margin-bottom 22px + sidebar padding-top 36px = 총 58px,
   *   기존 absolute top:34px 위치(헤더와 34px 간격)와 비슷한 체감 간격.
   */
  padding: 36px 0 34px;
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
  /*
   * 작품 헤더 (작품명 + 학생명) — PC 에서는 flex row, 모바일에서는 column.
   *
   * PC(row) 동작:
   *   - 짧은 제목 → 제목 | 이름 이 한 줄에 나란히 배치.
   *   - 긴 제목  → 제목이 2~3 줄로 자연스럽게 줄바꿈,
   *               flex:1 + min-width:0 으로 제목 영역이 남는 폭을 다 쓰고,
   *               이름(.detail__author-wrap) 은 우측 상단에 고정.
   *   - align-items: flex-start → 제목이 여러 줄일 때 이름이 첫 줄
   *     baseline 에 끌려 올라가는 어색함 제거.
   *
   * 모바일(column) 동작:
   *   - 모바일 폭(320~480px) 에서는 제목이 2줄 이상이 되는 경우가 많고,
   *     한 줄에 제목 + 이름을 억지로 같이 두면 제목 폭이 너무 작아진다.
   *   - 모바일 미디어쿼리에서 flex-direction 을 column 으로 바꾸고
   *     이름은 다음 줄로 자연스럽게 떨어지게 한다.
   */
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding-bottom: 20px;
  font-family: var(--font-family-base);
  color: var(--color-black);
  line-height: normal;
}

.detail__title {
  font-family: var(--font-family-base);
  font-size: 36px;
  font-weight: var(--font-weight-bold);
  /*
   * 상세 페이지 작품명은 전체 표시가 원칙.
   * - nowrap/ellipsis 제거 → 최대 2~3줄 자연 줄바꿈.
   * - word-break: keep-all (한글 어절 단위 유지)
   * - overflow-wrap: break-word (영문/혼합 시 단어 중간 끊김 방지)
   * - line-height: 1.25 → 여러 줄일 때 행간 안정.
   */
  line-height: 1.25;
  color: var(--color-black);
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  word-break: keep-all;
  overflow-wrap: break-word;
}

.detail__author-wrap {
  /*
   * flex item 으로서:
   * - flex: 0 0 auto (flex-shrink: 0 효과) → 학생 이름이 절대 줄바꿈되거나 줄어들지 않음.
   *   이름이 절대 다음 줄로 내려가지 않도록 보장.
   - margin-left: auto → 같은 줄 우측 끝으로 밀어붙임.
   - padding-top: 4px → 제목 첫 줄 baseline 근처로 시각적으로 정렬.
     (align-items: flex-start 로 제목이 위쪽부터 시작하므로 약간의 상단 보정)
   */
  flex: 0 0 auto;
  min-width: 0;
  margin-left: auto;
  padding-top: 4px;
}

.detail__author {
  font-family: var(--font-family-base);
  font-size: 24px;
  font-weight: var(--font-weight-regular);
  line-height: normal;
  color: var(--color-black);
  margin: 0;
  white-space: nowrap;
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

/*
 * 다른작품 영역 (데스크톱/모바일 공통, 페이지 하단 풀폭 section)
 * - 기존: .detail__gallery 내부에 들어가 있어서 max-width 가 gallery 의 1250px에 제한됨.
 * - 변경: .detail__container 바깥 페이지 하단 풀폭 section 으로 분리.
 *   → 데스크톱에서 [sidebar | gallery] row 가 끝난 다음 페이지 끝에
 *     다른작품이 전체 폭으로 표시.
 *   → 모바일 column 흐름에서도 페이지 끝에 자연스럽게 표시.
 * - 페이지 컨테이너(.detail__container) 와 동일한 max-width / padding 사용으로
 *   가로 정렬 통일.
 */
.detail__other {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  /* 페이지 컨테이너와 동일한 좌우 padding + 동일한 max-width 로 통일 */
  max-width: 1920px;
  margin: 0 auto;
  padding: 72px 64px 80px;
  width: 100%;
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
  /*
   * 제목과 카드 사이 간격 16~20px → 18px.
   * flex column + margin-bottom 으로 자연스럽게 분리.
   */
  margin-bottom: 18px;
}

/*
 * 카드 그리드:
 * - 항상 repeat(2, minmax(0, 1fr)) — 모바일/태블릿/데스크톱 모두 2열.
 * - 페이지 하단 풀폭 section 이므로 max-width 640px 제한을 풀고
 *   카드들이 컨테이너 폭을 충분히 활용하도록 한다.
 *   → 갤러리 안에 있을 때는 sidebar 390px + gallery 1250px 안에서
 *     거대화 방지를 위해 640px 로 제한했었음.
 *   → 이제는 풀폭이므로 제한 없음.
 * - gap: 20px (PC).
 */
.detail__other-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: flex-start;
  justify-items: stretch;
  padding: 0;
  width: 100%;
  min-width: 0;
}

/*
 * 카드 (썸네일 + 작품명 + 학생이름)
 * - 카드 전체가 클릭 영역. <a> 이므로 클릭 시 navigate.
 * - hover 시 카드 자체가 살짝 떠오르고, 이미지가 약간 확대.
 */
.detail__other-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: transform 0.25s ease-in-out;
}

.detail__other-card:hover {
  transform: translateY(-3px);
}

.detail__other-thumb {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  background-color: #d3d3d3;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: transform 0.25s ease-in-out;
  border-radius: 4px;
  /*
   * 안전망: 일부 브라우저(특히 Safari) 에서 flex item + aspect-ratio 가
   * height: 0 으로 collapse 되는 케이스가 있어, 명시적으로 display: block 부여.
   * - grid item 인 thumb 가 어떤 이유로 0 height 로 보이지 않는 문제 차단.
   */
  display: block;
}

.detail__other-card:hover .detail__other-thumb {
  transform: scale(1.03);
}

.detail__other-card-title {
  font-family: var(--font-family-base);
  font-size: 18px;
  font-weight: var(--font-weight-semi-bold);
  line-height: 1.3;
  color: var(--color-black);
  margin: 0;
  min-width: 0;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: keep-all;
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
  /*
   * 작품 상세 이미지 — 원본 비율 그대로 표시.
   * - display: block: inline img 의 baseline 여백 제거.
   * - width: 100% + height: auto: 원본 aspect ratio 유지.
   * - object-fit: contain: 어떤 비율(crop 없이)도 잘리지 않고 전체 노출.
   * - background-color: img 가 로드되기 전 placeholder 시각 안정용 (이미지엔 영향 X).
   */
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
  background-color: #f5f5f5;
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
}

/* 태블릿 - 작은 구간
   카드 2열이 너무 좁아져서 1열이 더 보기 좋은 경우만 1열로 전환.
   우선순위: 기존 2열 유지 → 너무 좁으면 1열.
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

  /*
   * 모바일 뒤로가기 버튼:
   * - Desktop 에서는 .detail__sidebar 의 첫 자식으로 들어 있어 sticky 따라간다.
   * - 모바일에서도 sidebar 안 첫 자식이므로 flex column 의 첫 row 로 자연스럽게 표시.
   *   (container 가 flex column 이 되고 sidebar 도 position:static 이 되므로 sticky 가 해제됨)
   * - 사이즈는 40x40, 아이콘 18x18 유지 (Desktop 44x44 / 20x20 보다 약간 작게).
   * - 자체에 약간의 아래 여백을 두어 다음 row(작품명+학생명) 와 시각적으로 분리한다.
   */
  .detail__back {
    width: 40px;
    height: 40px;
    margin: 0 0 16px;
    align-self: flex-start;
  }

  .detail__back-icon {
    width: 18px;
    height: 18px;
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

/*
 * 모바일 작품 헤더:
 * - PC 와 동일한 row 구조 유지 (제목 | 이름 한 줄 나란히).
 * - 제목이 2줄 이상으로 줄바꿈되어도 이름은 우측 상단에 고정.
 * - 모바일 폭이 좁으므로 제목이 자연스럽게 1~3줄로 표시되고,
 *   이름은 .detail__author-wrap 의 nowrap 으로 절대 줄바꿈 안 됨.
 * - 제목이 짧으면 한 줄에 제목 + 이름이 같이 표시됨.
 */
.detail__meta {
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 16px;
}

  .detail__title {
    font-size: 26px;
    line-height: 1.3;
    /* 모바일 row 구조에서 제목은 컨테이너 폭에서 이름 폭을 뺀 만큼 차지 */
    flex: 1 1 auto;
    min-width: 0;
    width: auto;
  }

  .detail__author-wrap {
    /* PC 와 동일: 우측 상단 고정, 절대 줄바꿈 안 됨 */
    margin-left: auto;
    padding-top: 4px;
    align-self: flex-start;
    flex: 0 0 auto;
  }

  .detail__author {
    font-size: 16px;
  }

  .detail__category {
    font-size: 16px;
    padding-top: 0;
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

  .detail__other {
    /*
     * 모바일 다른작품 영역 (페이지 하단 풀폭):
     * - PC 와 동일한 풀폭 section 이지만 모바일에서는
     *   좌우 padding 을 20px 로 줄여 콘텐츠 폭을 확보한다.
     * - title → 카드 그리드 사이 padding-top 56px.
     * - 카드 영역 아래 footer 까지 48~64px 여백 → 56px (padding-bottom).
     */
    padding: 56px 20px;
  }

  .detail__other-title {
    font-size: 18px;
    margin-bottom: 14px;
  }

  /*
   * 모바일 카드 그리드:
   * - 항상 2열. repeat(2, minmax(0, 1fr)) 로 nowrap 텍스트가 column 을 늘리지 못하게.
   * - gap: 12px (PC 의 20px 보다 좁음 → 작은 카드 느낌).
   */
  .detail__other-list {
    gap: 12px;
  }

  .detail__other-card-title {
    font-size: 14px;
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

<script setup lang="ts">
useSeoMeta({
  title: 'ROLL ON! - 서울디자인고등학교 크리에이티브 디자인과 2기 졸업전시',
  ogTitle: 'ROLL ON!',
  description: '서울디자인고등학교 크리에이티브 디자인과 2기 졸업전시'
})

// 헤더가 페이지 위에 겹쳐서 떠있도록 — Hero가 헤더 너머까지 차지
definePageMeta({
  transparentHeader: true
})

/* ============================================================
   히어로 섹션 자석 스크롤 (magnetic scroll-snap)
   - wheel 한 번 → 가장 가까운 snap point로 부드럽게 정렬
   - hero 구간 안에서만 작동, 그 외는 자유 스크롤
   ============================================================ */
const { $lenis } = useNuxtApp() as { $lenis?: { scrollTo: (target: number | string | HTMLElement, opts?: object) => void; actualScroll: number; stop: () => void; start: () => void } }

const SNAP_DURATION = 0.55
const easing = (t: number) => 1 - Math.pow(1 - t, 3) // easeOutCubic
const SCROLL_THRESHOLD = 8 // 작은 wheel 입력은 무시 (touchpad 미세 스크롤 방지)

let rafId: number | null = null
let pendingTarget: number | null = null
let lastWheelTime = 0
let lastWheelDelta = 0

const getHeroSnapPoints = (): { top: number; bottom: number } | null => {
  const hero = document.querySelector<HTMLElement>('.home__hero')
  if (!hero) return null
  const top = hero.offsetTop
  const bottom = top + hero.offsetHeight - window.innerHeight
  return { top, bottom }
}

const performSnap = () => {
  rafId = null
  if (!$lenis || pendingTarget === null) return

  // wheel이 연속으로 들어오면 가장 마지막 delta 기준으로 결정
  const delta = lastWheelDelta
  lastWheelDelta = 0

  const current = $lenis.actualScroll
  const points = getHeroSnapPoints()
  if (!points) return

  // hero 구간 밖이면 snap 안 함 (자유 스크롤)
  if (current < points.top - 50 || current > points.bottom + 50) {
    pendingTarget = null
    return
  }

  // 사용자가 wheel 방향(down = 양수, up = 음수)
  // 사용자가 충분히 멈췄다면(0.4s) 가장 가까운 snap point로 정렬
  const now = performance.now()
  const timeSinceLastWheel = now - lastWheelTime
  if (timeSinceLastWheel < 50) {
    // wheel 연속 입력 → 더 큰 wheel을 기다림
    return
  }

  // hero 시작(top) 또는 끝(bottom) 중 현재 위치에 더 가까운 곳으로 정렬
  const distToTop = Math.abs(current - points.top)
  const distToBottom = Math.abs(current - points.bottom)
  const snapPoint = distToTop < distToBottom ? points.top : points.bottom

  $lenis.scrollTo(snapPoint, { duration: SNAP_DURATION, easing })
  pendingTarget = null
}

const onWheel = (e: WheelEvent) => {
  if (!$lenis) return
  // 작은 wheel은 무시 (trackpad 관성 등)
  if (Math.abs(e.deltaY) < SCROLL_THRESHOLD) return

  lastWheelDelta = e.deltaY
  lastWheelTime = performance.now()

  // 짧은 debounce 후 가장 큰 delta로 snap 결정
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    setTimeout(performSnap, 80)
  })
}

const onKeyDown = (e: KeyboardEvent) => {
  if (!$lenis) return
  if (!['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End', ' '].includes(e.key)) return

  const current = $lenis.actualScroll
  const points = getHeroSnapPoints()
  if (!points) return
  if (current < points.top - 50 || current > points.bottom + 50) return

  const goingDown = ['PageDown', 'ArrowDown', 'End', ' '].includes(e.key)
  const target = goingDown ? points.bottom : points.top
  $lenis.scrollTo(target, { duration: SNAP_DURATION, easing })
}

onMounted(() => {
  window.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKeyDown)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <main class="home">
    <!-- ============================================
         1. HERO
         ============================================ -->
    <section class="home__hero" aria-label="메인 비주얼">
      <!-- 3D 주사위 배경 (decorative) -->
      <ClientOnly>
        <HeroDiceScene />
      </ClientOnly>

      <div class="home__hero-content">
        <p class="home__hero-eyebrow">
          서울디자인고등학교 크리에이티브 디자인과 2기 졸업전시
        </p>

        <!-- TODO: 메인 이미지 준비되면 교체 -->
        <div class="home__hero-placeholder" aria-label="메인 이미지 (준비 중)">
          <svg
            class="home__hero-placeholder-icon"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>

        <div class="home__hero-actions">
          <NuxtLink to="/projects" class="home__hero-btn home__hero-btn--primary">
            작품보러가기
          </NuxtLink>
          <!-- TODO: 인스타그램 실제 URL로 교체 -->
          <a href="https://www.instagram.com/roll_on.sdhs" class="home__hero-btn home__hero-btn--secondary" @click.prevent>
            인스타그램
          </a>
        </div>
      </div>
    </section>

    <!-- ============================================
         2. ABOUT
         ============================================ -->
    <section class="home__about" aria-label="전시 소개">
      <div class="home__about-container">
        <!-- 좌측: 텍스트 -->
        <div class="home__about-text">
          <img
            src="/logo.svg"
            alt="ROLL ON! 로고"
            class="home__about-logo"
            data-animate="fade-up"
            data-animate-delay="100"
          />

          <h2 class="home__about-title" data-animate="fade-up" data-animate-delay="200">
            제 2회<br />크리에이티브 디자인과<br />졸업전시
          </h2>

          <p class="home__about-desc" data-animate="fade-up" data-animate-delay="300">
            우리는 저마다 다른 눈금과 방향을 가진 채, 하나의 판 위에 놓여 있다.
            멈추고, 돌아가고, 다시 나아가는 순간들이 쌓여 지금의 장면이 만들어졌다.
            그러나 이곳은 도착점이 아니라, 다음 움직임을 기다리는 자리다.
            주사위가 다시 굴러가듯, 우리의 가능성 또한 새로운 방향을 향해 이어진다.
          </p>


          <NuxtLink to="/projects" class="home__about-cta" data-animate="fade-up" data-animate-delay="400">
            졸업작품 보러가기
          </NuxtLink>
        </div>

        <!-- 우측: 포스터 -->
        <figure class="home__about-poster" data-animate="fade-left" data-animate-delay="200">
          <img
            src="/poster.png"
            alt="제 2회 크리에이티브 디자인과 졸업전시 포스터"
          />
        </figure>
      </div>
    </section>

    <!-- ============================================
         3. INFORMATION
         ============================================ -->
    <section class="home__info" aria-label="운영 안내">
      <div class="home__info-container">
        <!-- 좌측: 안내 텍스트 -->
        <div class="home__info-text">
          <h2 class="home__info-title" data-animate="fade-up">운영 안내</h2>

          <div class="home__info-group" data-animate="fade-up" data-animate-delay="100">
            <span class="home__info-label">일시</span>
            <span class="home__info-value">2026.10.20 - 10.22</span>
          </div>

          <div class="home__info-group" data-animate="fade-up" data-animate-delay="200">
            <span class="home__info-label">위치</span>
            <span class="home__info-value">서울특별시 마포구 백범로 139</span>
          </div>
        </div>

        <!-- 우측: 지도 -->
        <figure class="home__info-map" data-animate="fade-left" data-animate-delay="100">
          <iframe
            class="home__info-map-iframe"
            src="https://www.google.com/maps?q=37.5469349,126.9480378&hl=ko&z=17&output=embed"
            width="800"
            height="600"
            style="border:0;"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen
            title="전시会場 위치 - 서울디자인고등학교"
          ></iframe>
        </figure>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* page root는 투명 — header background-color 가 직접 보이도록 함.
   각 section(.home__hero, ...)이 자체 배경을 갖는다. */
.home {
  background-color: transparent;
}

/* ============================================
   HERO
   ============================================ */
.home__hero {
  position: relative;
  width: 100%;
  min-height: 100svh;
  overflow: visible;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: var(--header-height);
}

.home__hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 64px;
  width: 100%;
  max-width: var(--container-max-width);
  pointer-events: auto;
}

.home__hero-eyebrow {
  font-family: var(--font-family-base);
  font-size: 26px;
  font-weight: var(--font-weight-semi-bold, 600);
  color: #111111;
  letter-spacing: -0.03em;
  line-height: 1.4;
  margin: 0 0 60px;
  white-space: nowrap;
}

.home__hero-placeholder {
  width: clamp(280px, 29vw, 520px);
  aspect-ratio: 1 / 0.84;
  background: #ececec;
  border-radius: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 52px;
  color: #c6c6c6;
}

.home__hero-placeholder-icon {
  display: block;
}

.home__hero-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.home__hero-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 58px;
  padding-inline: 40px;
  border-radius: 999px;
  font-family: var(--font-family-base);
  font-size: 17px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;
  white-space: nowrap;
  cursor: pointer;
  border: 0;
}

.home__hero-btn--primary {
  background: #000000;
  color: #ffffff;
}

.home__hero-btn--primary:hover {
  background: #202020;
}

.home__hero-btn--secondary {
  background: #ffffff;
  color: #111111;
  border: 1.5px solid #111111;
}

.home__hero-btn--secondary:hover {
  background: #f5f5f5;
}

/* ============================================
   ABOUT
   ============================================ */
.home__about {
  width: 100%;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 64px;
}

.home__about-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 64px;
  align-items: start;
}

/* 좌측 텍스트 */
.home__about-text {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.home__about-logo {
  width: 260px;
  height: auto;
  display: block;
}

.home__about-title {
  font-family: var(--font-family-base);
  font-size: 64px;
  font-weight: var(--font-weight-bold);
  line-height: 1.15;
  color: var(--color-black);
  margin: 0;
  letter-spacing: -0.025em;
}

.home__about-desc {
  font-family: var(--font-family-base);
  font-size: 26px;
  font-weight: var(--font-weight-regular);
  line-height: 1.7;
  color: var(--color-black);
  margin: 0;
}

.home__about-desc--en {
  font-size: 22px;
  font-weight: var(--font-weight-regular);
  line-height: 1.6;
  opacity: 0.8;
}

.home__about-cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 18px 40px;
  font-family: var(--font-family-base);
  font-size: 18px;
  font-weight: var(--font-weight-medium);
  color: var(--color-white);
  background-color: var(--color-black);
  border-radius: 4px;
  text-decoration: none;
  align-self: flex-start;
  transition: opacity 0.2s ease;
  border-radius: 999px;
}

.home__about-cta:hover {
  opacity: 0.75;
}

/* 우측 포스터 */
.home__about-poster {
  margin: 0;
  width: 100%;
  max-height: 100%;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home__about-poster img {
  width: 100%;
  height: auto;
  max-height: calc(100svh - 96px);
  object-fit: contain;
  display: block;
}

/* ============================================
   INFORMATION
   ============================================ */
.home__info {
  width: 100%;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 64px;
}

.home__info-container {
  width: 100%;
  max-width: var(--container-max-width);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 64px;
  align-items: center;
}

/* 좌측 안내 */
.home__info-text {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.home__info-title {
  font-family: var(--font-family-base);
  font-size: 56px;
  font-weight: var(--font-weight-bold);
  line-height: 1.15;
  color: var(--color-black);
  margin: 0;
  letter-spacing: -0.025em;
}

.home__info-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.home__info-label {
  font-family: var(--font-family-base);
  font-size: 22px;
  font-weight: var(--font-weight-medium);
  color: var(--color-black);
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.home__info-value {
  font-family: var(--font-family-base);
  font-size: 44px;
  font-weight: var(--font-weight-semi-bold);
  line-height: 1.3;
  color: var(--color-black);
}

/* 우측 지도 */
.home__info-map {
  margin: 0;
  width: 100%;
  max-height: 100%;
  align-self: center;
}

.home__info-map-iframe {
  width: 100%;
  height: auto;
  max-height: calc(100svh - 96px);
  aspect-ratio: 4 / 3;
  border: 0;
  border-radius: 8px;
  display: block;
  background-color: var(--color-gray-100, #f5f5f5);
}

/* ============================================
   TABLET (768px ~ 1280px)
   ============================================ */
@media (max-width: 1280px) {
  .home__hero-content {
    padding: 24px 32px;
  }

  .home__hero-eyebrow {
    font-size: 22px;
    margin-bottom: 48px;
  }

  .home__hero-placeholder {
    width: clamp(240px, 36vw, 380px);
    margin-bottom: 44px;
    border-radius: 40px;
  }

  .home__hero-btn {
    height: 54px;
    padding-inline: 34px;
    font-size: 16px;
  }

  .home__about {
    min-height: 100svh;
    display: flex;
    align-items: center;
    padding: 36px 32px;
  }

  .home__about-container {
    gap: 48px;
  }

  .home__about-logo {
    width: 220px;
  }

  .home__about-title {
    font-size: 52px;
  }

  .home__about-desc {
    font-size: 22px;
  }

  .home__about-desc--en {
    font-size: 18px;
  }

  .home__info {
    min-height: 100svh;
    display: flex;
    align-items: center;
    padding: 36px 32px;
  }

  .home__info-container {
    gap: 48px;
  }

  .home__info-title {
    font-size: 44px;
  }

  .home__info-label {
    font-size: 20px;
  }

  .home__info-value {
    font-size: 38px;
  }
}

/* ============================================
   MOBILE (< 768px)
   ============================================ */
@media (max-width: 768px) {
  .home__hero {
    min-height: 100svh;
    padding-top: var(--header-height);
    padding-bottom: 48px;
  }

  .home__hero-content {
    padding: 16px 20px 24px;
  }

  .home__hero-eyebrow {
    font-size: 17px;
    white-space: normal;
    margin-bottom: 36px;
    padding: 0 4px;
  }

  .home__hero-placeholder {
    width: min(75vw, 340px);
    aspect-ratio: 1 / 0.84;
    margin-bottom: 32px;
    border-radius: 36px;
  }

  .home__hero-actions {
    gap: 10px;
  }

  .home__hero-btn {
    height: 50px;
    padding-inline: 22px;
    font-size: 15px;
  }

  /* About: 포스터 먼저 (1컬럼) */
  .home__about {
    min-height: auto;
    display: block;
    padding: 16px 20px 32px;
  }

  .home__about-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  /* 모바일: 포스터 먼저 */
  .home__about-poster {
    order: -1;
  }

  .home__about-text {
    gap: 18px;
  }

  .home__about-logo {
    width: 160px;
    align-self: flex-start;
  }

  .home__about-title {
    font-size: 32px;
    line-height: 1.2;
    text-align: left;
  }

  .home__about-desc {
    font-size: 17px;
    line-height: 1.65;
    white-space: pre-wrap;
  }

  .home__about-desc--en {
    font-size: 15px;
    line-height: 1.6;
  }

  .home__about-cta {
    align-self: stretch;
    justify-content: center;
    padding: 16px 24px;
    font-size: 16px;
  }

  /* Information: 지도 먼저 (1컬럼) */
  .home__info {
    min-height: auto;
    display: block;
    padding: 16px 20px 40px;
  }

  .home__info-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  /* 모바일: 지도 먼저 */
  .home__info-map {
    order: -1;
  }

  .home__info-text {
    gap: 16px;
  }

  .home__info-title {
    font-size: 26px;
  }

  .home__info-label {
    font-size: 16px;
  }

  .home__info-value {
    font-size: 26px;
  }
}
</style>

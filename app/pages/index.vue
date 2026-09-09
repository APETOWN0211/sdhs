<script setup lang="ts">
useSeoMeta({
  title: 'ROLL ON! - 서울디자인고등학교 크리에이티브 디자인과 2기 졸업전시',
  ogTitle: 'ROLL ON!',
  description: '서울디자인고등학교 크리에이티브 디자인과 2기 졸업전시'
})
</script>

<template>
  <main class="home">
    <!-- ============================================
         1. HERO
         ============================================ -->
    <section class="home__hero" aria-label="메인 비주얼" data-animate="fade-up">
      <div class="home__hero-inner">
        <img
          src="/hero-dice.png"
          alt="ROLL ON! 메인 비주얼"
          class="home__hero-image"
          @error="$event.target.style.display = 'none'"
        />
        <!-- hero-dice.png 없으면 포스터 fallback -->
        <img
          src="/poster.png"
          alt="졸업전시 포스터"
          class="home__hero-image home__hero-image--fallback"
        />
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
.home {
  background-color: var(--color-white);
}

/* ============================================
   HERO
   ============================================ */
.home__hero {
  width: 100%;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--header-height) 0 0;
}

.home__hero-inner {
  width: 100%;
  max-width: var(--container-max-width);
  height: 100svh;
  margin: 0 auto;
  padding: 32px 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 64px;
}

.home__hero-image {
  max-width: 100%;
  max-height: calc(100svh - 64px);
  width: auto;
  height: auto;
  object-fit: contain;
  display: none;
}

.home__hero-image:not([style]) {
  display: block;
}

/* fallback 이미지 — hero-dice.png 로드 실패 시 보여짐 */
.home__hero-image--fallback {
  display: block;
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
  .home__hero-inner {
    padding: 24px 32px 48px;
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
  }

  .home__hero-inner {
    height: calc(100svh - var(--header-height));
    padding: 16px 20px 32px;
  }

  .home__hero-image {
    max-height: calc(100svh - var(--header-height) - 48px);
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

<script setup lang="ts">
useHead({
  title: '소개 | ROLL ON!'
})
</script>

<template>
  <div class="about">
    <div class="about__container">
      <!-- 좌측 포스터 이미지 -->
      <figure class="about__poster">
        <img src="/poster.png" alt="제 2회 크리에이티브 디자인과 졸업전시 포스터" />
      </figure>

      <!-- 우측 텍스트 영역 -->
      <div class="about__content">
        <header class="about__header">
          <img
            src="/logo.svg"
            alt="ROLL ON! 로고"
            class="about__logo"
          />
          <h1 class="about__title">제 2회<br />크리에이티브 디자인과<br />졸업전시</h1>
        </header>

        <section class="about__body">
          <p class="about__paragraph">
            우리는 저마다 다른 눈금과 방향을 가진 채, 하나의 판 위에 놓여 있다. 멈추고, 돌아가고, 다시 나아가는 순간들이 쌓여 지금의 장면이 만들어졌다. 그러나 이곳은 도착점이 아니라, 다음 움직임을 기다리는 자리다. 주사위가 다시 굴러가듯, 우리의 가능성 또한 새로운 방향을 향해 이어진다.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about {
  width: 100%;
  background-color: var(--color-white);
}

.about__container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 80px 64px 100px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 80px;
}

/* 좌측 포스터 */
.about__poster {
  margin: 0;
  width: 480px;
  flex-shrink: 0;
  position: sticky;
  top: calc(var(--header-height) + 40px);
}

.about__poster img {
  width: 100%;
  height: auto;
  display: block;
}

/* 우측 콘텐츠 */
.about__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 48px;
  min-width: 0;
}

/* 헤더 영역 */
.about__header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
}

.about__title {
  font-family: var(--font-family-base);
  font-size: 64px;
  font-weight: var(--font-weight-bold);
  line-height: 1.15;
  color: var(--color-black);
  margin: 0;
  letter-spacing: -0.02em;
}

.about__logo {
  width: 200px;
  height: auto;
  display: block;
}

/* 본문 영역 */
.about__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
}

.about__paragraph {
  font-family: var(--font-family-base);
  font-size: 20px;
  font-weight: var(--font-weight-semi-bold);
  line-height: 1.6;
  color: var(--color-black);
  margin: 0;
  white-space: pre-wrap;
}

.about__paragraph--en {
  font-size: 18px;
  line-height: 1.55;
  opacity: 0.85;
}

/* 태블릿 */
@media (max-width: 1280px) {
  .about__container {
    padding: 60px 32px 80px;
    gap: 48px;
  }

  .about__poster {
    width: 400px;
  }

  .about__title {
    font-size: 52px;
  }
}

/* 모바일 */
@media (max-width: 768px) {
  .about__container {
    flex-direction: column;
    padding: 24px 20px 40px;
    gap: 28px;
  }

  .about__poster {
    width: 100%;
    max-width: 100%;
    position: static;
  }

  .about__content {
    gap: 28px;
  }

  .about__header {
    gap: 12px;
  }

  .about__title {
    font-size: 30px;
    line-height: 1.2;
  }

  .about__logo {
    width: 140px;
  }

  .about__body {
    gap: 16px;
  }

  .about__paragraph {
    font-size: 15px;
    line-height: 1.6;
  }

  .about__paragraph--en {
    font-size: 14px;
    line-height: 1.55;
  }
}
</style>

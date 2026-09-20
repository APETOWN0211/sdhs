<script setup lang="ts">
// 학생 이름 — 단일 배열로 보관 (총 15명)
// Desktop: 5열 × 3행 으로 자동 배치 (row 방향 채움)
const committeeMembers = [
  '김규리', '유수진', '오해련', '박지율', '이시은',
  '김현우', '유하은', '남강호', '안채연', '오수정',
  '한재현', '이민형', '이강', '장선혁', '천희준'
]
</script>

<template>
  <footer class="footer">
    <div class="footer__container">
      <div class="footer__info">
        <h2 class="footer__title">
          서울디자인고등학교
          크리에이티브 디자인과
          2기 졸업전시
        </h2>
        <address class="footer__address">
          <span>&copy; 2026 서울디자인고등학교 크리에이티브 디자인과</span>
          <span>서울특별시 마포구 백범로 139</span>
          <span>Tel. 02-715-2261</span>
        </address>
      </div>
      <div class="footer__committee">
        <h3 class="footer__committee-title">2기 졸업전시 졸업전시준비위원회</h3>
        <!--
          Desktop: 5열 × 3행
          - 단일 배열을 grid 가 row 방향으로 자동 채움.
          - 이름 순서가 보장됨.
        -->
        <div class="footer__committee-grid">
          <span
            v-for="name in committeeMembers"
            :key="name"
            class="footer__committee-member"
          >
            {{ name }}
          </span>
        </div>
      </div>
    </div>
    <div class="footer__mobile">
      <h2 class="footer__mobile-title">
        서울디자인고등학교
        크리에이티브 디자인과<br>
        2기 졸업전시
      </h2>
      <p class="footer__mobile-title-en">
        Seoul Design Highschool
        Creative Design<br>
        2nd Graduation Exhibition
      </p>
      <div class="footer__mobile-committee">
        <h3 class="footer__mobile-committee-title">2기 졸업전시 졸업전시준비위원회</h3>
        <div class="footer__mobile-committee-grid">
          <span
            v-for="name in committeeMembers"
            :key="`m-${name}`"
            class="footer__mobile-committee-member"
          >
            {{ name }}
          </span>
        </div>
      </div>
      <p class="footer__mobile-copyright">
        Copyright 2026 Seoul Design Highschool.<br />
        all rights reserved.
      </p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background-color: var(--color-gray);
  padding: var(--footer-padding-y) var(--footer-padding-x);
  width: 100%;
}

.footer__container {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  max-width: var(--container-max-width);
  margin: 0 auto;
}

.footer__info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.footer__title {
  font-family: var(--font-family-base);
  font-size: var(--font-size-20);
  font-weight: var(--font-weight-semi-bold);
  color: var(--color-black);
  line-height: 1.4;
  font-style: normal;
}

.footer__address {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--font-family-base);
  font-size: var(--font-size-20);
  font-weight: var(--font-weight-medium);
  color: var(--color-black);
  line-height: 1.4;
  font-style: normal;
}

.footer__committee {
  display: flex;
  text-align: center;
  flex-direction: column;
  gap: 24px;
  align-items: flex-start;
}

.footer__committee-title {
  font-family: var(--font-family-base);
  font-size: var(--font-size-20);
  font-weight: var(--font-weight-semi-bold);
  color: var(--color-black);
  line-height: var(--line-height-normal);
  white-space: nowrap;
}

/*
 * Desktop: 5열 × 3행
 * - grid 가 row 방향으로 자동 채움 → 이름 배열 순서 유지.
 * - max-content 로 각 column 이 이름 폭에 딱 맞게 줄어들고,
 *   column-gap / row-gap 은 기존 var(--footer-gap) 사용.
 */
.footer__committee-grid {
  display: grid;
  grid-template-columns: repeat(5, max-content);
  column-gap: var(--footer-gap);
  row-gap: var(--footer-gap);
}

.footer__committee-member {
  font-family: var(--font-family-base);
  font-size: var(--font-size-20);
  font-weight: var(--font-weight-medium);
  color: var(--color-black);
  white-space: nowrap;
}

.footer__mobile {
  display: none;
}

.footer__mobile-title {
  font-family: var(--font-family-base);
  font-size: 16px;
  font-weight: var(--font-weight-semi-bold);
  color: var(--color-black);
  line-height: 1.4;
}

.footer__mobile-title-en {
  font-family: var(--font-family-base);
  font-size: 16px;
  font-weight: var(--font-weight-medium);
  color: var(--color-black);
  line-height: 1.4;
}

.footer__mobile-copyright {
  font-family: var(--font-family-base);
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-black);
  line-height: 1.4;
}

/* 모바일 위원회 이름 영역 — Desktop 5열 × 3행 구조를 그대로 유지.
   너무 좁은 화면에서만 column 수를 줄여 가독성 확보. */
.footer__mobile-committee {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 8px 0 4px;
}

.footer__mobile-committee-title {
  font-family: var(--font-family-base);
  font-size: 14px;
  font-weight: var(--font-weight-semi-bold);
  color: var(--color-black);
  line-height: 1.4;
  margin: 0;
}

.footer__mobile-committee-grid {
  display: grid;
  grid-template-columns: repeat(5, max-content);
  column-gap: 8px;
  row-gap: 6px;
}

.footer__mobile-committee-member {
  font-family: var(--font-family-base);
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: var(--color-black);
  line-height: 1.4;
  white-space: nowrap;
}

/* 모바일 (≤768px) 에서 5열이 너무 좁으면 3열로 줄여 가독성 확보.
   작은 모바일 (≤480px) 에서는 다시 2열로. 이름 순서는 그대로 유지. */
@media (max-width: 768px) {
  .footer__mobile-committee-grid {
    grid-template-columns: repeat(3, max-content);
  }
}

@media (max-width: 480px) {
  .footer__mobile-committee-grid {
    grid-template-columns: repeat(2, max-content);
  }
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .footer {
    padding: var(--footer-padding-y-mobile) var(--footer-padding-x-mobile);
  }

  .footer__container {
    display: none;
  }

  .footer__mobile {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: var(--container-max-width);
    margin: 0 auto;
  }

  /*
   * 모바일에서는 준비위원회 영역(제목 + 15명 이름 목록)을 통째로 숨긴다.
   * - Desktop/Tablet 의 .footer__committee 는 .footer__container 안에서
   *   별도로 표시되므로 영향 없음.
   * - 모바일 전용 wrapper 인 .footer__mobile-committee 만 정확히 숨긴다.
   * - 제목만 / 이름만 숨기는 것이 아니라 한 블록 전체를 숨겨서
   *   모바일 Footer 가 학교명·주소·copyright 만 남도록 정리한다.
   */
  .footer__mobile-committee {
    display: none;
  }
}
</style>

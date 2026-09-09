<script setup lang="ts">
const committeeMembers = [
  ['이이이', '이이이', '이이이', '이이이'],
  ['이이이', '이이이', '이이이', '이이이'],
  ['이이이', '이이이', '이이이', '이이이']
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
        <div class="footer__committee-grid">
          <template v-for="(row, rowIndex) in committeeMembers" :key="rowIndex">
            <span
              v-for="(name, nameIndex) in row"
              :key="`${rowIndex}-${nameIndex}`"
              class="footer__committee-member"
            >
              {{ name }}
            </span>
          </template>
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
  flex-direction: column;
  gap: var(--footer-gap);
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

.footer__committee-grid {
  display: grid;
  grid-template-columns: repeat(4, auto);
  gap: var(--footer-gap);
  text-align: center;
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
}
</style>

<template>
  <div class="guestbook">
    <h1 class="guestbook__title">방명록</h1>
    <p class="guestbook__description">전시를 방문해주셔서 감사합니다. 한마디 남겨주세요.</p>
  </div>
</template>

<style scoped>
.guestbook {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height) - var(--footer-height));
  text-align: center;
  padding: 40px;
}

.guestbook__title {
  font-family: var(--font-family-base);
  font-size: 72px;
  font-weight: var(--font-weight-bold);
  color: var(--color-black);
  margin-bottom: 24px;
}

.guestbook__description {
  font-family: var(--font-family-base);
  font-size: var(--font-size-24);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}
</style>

<template>
  <div class="layout" :class="{ 'layout--full-bleed': fullBleed }">
    <AppHeader />
    <main class="layout__main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
// 페이지에서 transparent-header(헤더 overlap) 모드를 켤지 결정
const route = useRoute()
// definePageMeta({ layout: 'default', transparentHeader: true }) 와 함께 사용
const fullBleed = computed(() => Boolean(route.meta?.transparentHeader))
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.layout__main {
  flex: 1;
  padding-top: var(--header-height);
}

@media (max-width: 768px) {
  .layout__main {
    padding-top: 67px;
  }
}

/* full-bleed 모드: 헤더가 페이지 위에 겹침. 페이지가 자체 padding-top으로 처리 */
.layout--full-bleed .layout__main {
  padding-top: 0;
}
</style>
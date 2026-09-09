<template>
  <div class="layout">
    <AppHeader />
    <main class="layout__main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

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
</style>
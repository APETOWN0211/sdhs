<template>
  <div class="admin-layout">
    <AppHeader />
    <main class="admin-layout__main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.admin-layout__main {
  flex: 1;
  padding-top: var(--header-height);
}

@media (max-width: 768px) {
  .admin-layout__main {
    padding-top: 67px;
  }
}
</style>

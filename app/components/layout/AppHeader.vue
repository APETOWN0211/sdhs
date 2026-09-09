<script setup lang="ts">
const navItems = [
  { label: '소개', href: '/about' },
  { label: '작품', href: '/projects' },
  { label: '방명록', href: '/guestbook' }
]

const headerRef = ref<HTMLElement | null>(null)
const isVisible = ref(true)
const isAtTop = ref(true)
const isMobileMenuOpen = ref(false)
let lastScrollY = 0

const handleScroll = () => {
  const currentScrollY = window.scrollY
  const scrollThreshold = 10

  // 맨 위에 있는지 확인
  isAtTop.value = currentScrollY < scrollThreshold

  // 항상 맨 위에서는 보이게
  if (currentScrollY < scrollThreshold) {
    isVisible.value = true
  } else {
    // 아래로 스크롤하면 숨김, 위로 스크롤하면 표시
    if (currentScrollY > lastScrollY) {
      isVisible.value = false
    } else {
      isVisible.value = true
    }
  }

  lastScrollY = currentScrollY
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

watch(isMobileMenuOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <header
    ref="headerRef"
    class="header"
    :class="{
      'header--hidden': !isVisible && !isAtTop,
      'header--at-top': isAtTop,
      'header--menu-open': isMobileMenuOpen
    }"
  >
    <!-- 헤더바: 메뉴 닫혀있을 때만 표시 -->
    <Transition name="header-bar">
      <div
        v-if="!isMobileMenuOpen"
        class="header__container"
      >
        <NuxtLink to="/" class="header__logo">
          <img src="/logo.svg" alt="ROLL ON! 로고" width="238" height="76" />
        </NuxtLink>
        <nav class="header__nav">
          <NuxtLink
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            class="header__nav-item"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
        <button
          class="header__menu"
          type="button"
          :aria-label="isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'"
          @click="toggleMobileMenu"
        >
          <svg
            v-if="!isMobileMenuOpen"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 7H20M4 12H20M4 17H20"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <svg
            v-else
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- 모바일 메뉴 (Figma node 1:125): 헤더바를 완전히 대체 -->
    <Transition name="mobile-menu">
      <div
        v-if="isMobileMenuOpen"
        class="header__mobile-menu"
      >
        <div class="header__mobile-menu-inner">
          <div class="header__mobile-menu-top">
            <button
              class="header__close"
              type="button"
              aria-label="메뉴 닫기"
              @click="closeMobileMenu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M6 6L18 18M18 6L6 18"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
          <nav class="header__mobile-nav">
            <NuxtLink
              v-for="(item, index) in navItems"
              :key="item.href"
              :to="item.href"
              class="header__mobile-nav-item"
              :style="{ '--nav-delay': `${0.08 + index * 0.06}s` }"
              @click="closeMobileMenu"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.header {
  background-color: var(--color-white);
  padding: var(--header-padding-y) var(--header-padding-x);
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  transition: transform 0.3s ease-in-out, background-color 0.25s ease-in-out;
}

/* 스크롤 시 흰 배경, 맨 위(isAtTop)에서만 투명 */
.header--at-top {
  background-color: transparent;
  box-shadow: none;
}

.header--hidden {
  transform: translateY(-100%);
}

.header__container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: var(--container-max-width);
  margin: 0 auto;
}

.header__logo {
  display: block;
  width: var(--header-logo-width);
  height: var(--header-logo-height);
  flex-shrink: 0;
}

.header__logo img {
  width: 100%;
  height: 100%;
  display: block;
}

.header__nav {
  display: flex;
  gap: var(--header-nav-gap);
  align-items: center;
  flex-shrink: 0;
}

.header__nav-item {
  font-family: var(--font-family-base);
  font-size: var(--font-size-36);
  font-weight: var(--font-weight-semi-bold);
  color: var(--color-black);
  text-decoration: none;
  white-space: nowrap;
}

.header__nav-item:hover {
  opacity: 0.7;
}

.header__nav-item.router-link-active {
  font-weight: var(--font-weight-bold);
}

.header__menu {
  display: none;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  color: inherit;
  align-items: center;
  justify-content: center;
}

/* 모바일 메뉴 (Figma node 1:125) - 헤더바를 완전히 대체 */
.header__mobile-menu {
  background-color: var(--color-white);
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

/* 모바일: Figma node 1:245 기반 */
@media (max-width: 768px) {
  .header {
    padding: 0;
  }

  .header__container {
    max-width: none;
    padding: 20px;
  }

  .header__logo {
    width: 84.553px;
    height: 27px;
  }

  .header__nav {
    display: none;
  }

  .header__menu {
    display: block;
  }

  /* 메뉴 펼침: 헤더 영역을 전체화면 메뉴로 덮음 */
  .header--menu-open {
    height: 100vh;
  }

  .header__mobile-menu {
    height: 100vh;
  }

  .header__mobile-menu-inner {
    width: 100%;
    height: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .header__mobile-menu-top {
    position: absolute;
    top: 20px;
    right: 20px;
    padding: 6px;
  }

  .header__close {
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    color: inherit;
    align-items: center;
    justify-content: center;
    display: flex;
  }

  .header__mobile-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 70px;
  }

  .header__mobile-nav-item {
    font-family: var(--font-family-base);
    font-size: 40px;
    font-weight: var(--font-weight-bold);
    line-height: 1.45;
    color: var(--color-black);
    text-decoration: none;
    text-align: center;
    white-space: nowrap;
  }
}

/* Vue Transition: 헤더바 fade */
.header-bar-enter-active,
.header-bar-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.header-bar-enter-from,
.header-bar-leave-to {
  opacity: 0;
}

/* Vue Transition: 모바일 메뉴 스무스한 열기/닫기 */
.mobile-menu-enter-active {
  transition: opacity 0.3s ease-in-out;
  transition-delay: 0.05s;
}

.mobile-menu-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}

/* 메뉴 항목: 열 때 stagger fade-up, 닫을 때는 컨테이너와 함께 페이드 */
.mobile-menu-enter-active .header__mobile-nav-item {
  animation: navItemFadeIn 0.4s ease-out both;
  animation-delay: var(--nav-delay);
}

.mobile-menu-leave-active .header__mobile-nav-item {
  transition: opacity 0.2s ease-in-out;
}

.mobile-menu-leave-to .header__mobile-nav-item {
  opacity: 0;
}

@keyframes navItemFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
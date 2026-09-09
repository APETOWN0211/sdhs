export default defineNuxtPlugin(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let observer: IntersectionObserver | null = null

  const initScrollAnimations = () => {
    const animatedElements = document.querySelectorAll('[data-animate]')
    if (!animatedElements.length) return

    // 이전 observer 정리
    if (observer) {
      observer.disconnect()
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer?.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    animatedElements.forEach((el) => {
      // 페이지 전환 시 다시 animate해야 하므로 is-visible 제거
      el.classList.remove('is-visible')
      observer?.observe(el)
    })
  }

  // reduced motion이면 애니메이션 스킵
  if (prefersReducedMotion) {
    document.querySelectorAll('[data-animate]').forEach((el) => {
      el.classList.add('is-visible')
    })
    return
  }

  // 초기 로드
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollAnimations)
  } else {
    initScrollAnimations()
  }

  // Nuxt 페이지 전환 후 다시 초기화
  const nuxtApp = useNuxtApp()
  nuxtApp.hook('page:finish', () => {
    nextTick(() => {
      initScrollAnimations()
    })
  })
})

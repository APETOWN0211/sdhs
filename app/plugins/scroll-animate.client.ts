export default defineNuxtPlugin(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const initScrollAnimations = () => {
    const animatedElements = document.querySelectorAll('[data-animate]')
    if (!animatedElements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            // 한 번 표시되면 더 이상 관찰하지 않음
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    animatedElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }

  // reduced motion이면 애니메이션 스킵
  if (prefersReducedMotion) {
    document.querySelectorAll('[data-animate]').forEach((el) => {
      el.classList.add('is-visible')
    })
    return
  }

  // DOM 준비 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollAnimations)
  } else {
    initScrollAnimations()
  }
})

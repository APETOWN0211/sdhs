import Lenis from 'lenis'

export default defineNuxtPlugin(() => {
  // prefers-reduced-motion: reduce면 native scroll 사용
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) {
    return
  }

  const lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1
  })

  let rafId: number

  const raf = (time: number) => {
    lenis.raf(time)
    rafId = requestAnimationFrame(raf)
  }

  rafId = requestAnimationFrame(raf)

  // cleanup on nuxt app unmount
  const nuxtApp = useNuxtApp()
  nuxtApp.hook('page:finish', () => {
    // 필요시 페이지 전환 후 리셋
  })

  return {
    provide: {
      lenis
    }
  }
})

import Lenis from 'lenis'

/**
 * 모바일 폭 기준 — native scroll 우선.
 * (iPhone Safari 자체 터치 스크롤이 이미 충분히 부드럽고,
 *  Lenis touch interpolation 이 오히려 무거워진다.)
 */
const MOBILE_MAX_WIDTH = 768

const isMobileViewport = () =>
  typeof window !== 'undefined' &&
  window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches

const isWorksRoute = (path: string) => path.startsWith('/works')

export default defineNuxtPlugin((nuxtApp) => {
  if (typeof window === 'undefined') return

  // reduced motion 사용자는 smooth scroll 자체를 비활성화
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) return

  // HMR / 재마운트 시 이전 instance 정리 — RAF 누적 방지
  if (window.__sdhsLenis) {
    cancelAnimationFrame(window.__sdhsLenis.rafId)
    window.__sdhsLenis.lenis.destroy()
  }

  /*
   * ============================================================
   * Desktop 전용 가벼운 smooth wheel.
   * - Lenis 1.x 는 duration 대신 lerp 사용이 표준.
   * - lerp 0.14 ≈ "native 보다 살짝 부드러운 정도".
   * ============================================================
   */
  const lenis = new Lenis({
    lerp: 0.14,
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

  window.__sdhsLenis = { lenis, rafId }

  /*
   * ============================================================
   * /works 와 모바일에서는 Lenis 를 완전히 정지시켜
   * native scroll 만 사용한다.
   *   - /works: 작품 카드/이미지가 많아 Lenis RAF 가 성능을 깎는다.
   *   - mobile: iOS Safari 자체 터치 스크롤이 더 부드럽고 가볍다.
   *
   * Lenis.stop() 은 wheel/touch listener 를 해제하고 native scroll 로
   * 위임한다. 이후 scrollTo 호출은 즉시 점프가 아닌 native API 경로로
   * 흘러간다.
   * ============================================================
   */
  const shouldDisableLenis = (path: string) => isMobileViewport() || isWorksRoute(path)

  const route = useRoute()

  const applyRoute = (path: string) => {
    if (shouldDisableLenis(path)) {
      lenis.stop()
    } else {
      lenis.start()
    }
  }

  const stopRouteWatch = watch(() => route.path, applyRoute, { immediate: true })

  /*
   * route 진입 시 /works 면 즉시 scrollTo(0, immediate: true).
   * - 이전 페이지에서 스크롤된 상태로 진입하지 않게.
   * - 부드러운 "0 까지 천천히" 효과는 절대 넣지 않는다.
   * - Lenis.stop() 상태에서도 native window 까지 동기 처리해 확실히 점프.
   */
  nuxtApp.hook('page:finish', () => {
    const path = route.path
    applyRoute(path)
    if (isWorksRoute(path)) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  })

  // viewport 변경(가로/세로 회전, 창 크기 변경) 시 mobile 재평가
  const mql = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
  const onMqChange = () => applyRoute(route.path)
  mql.addEventListener('change', onMqChange)

  // SPA 종료 시 cleanup (HMR / unmount 둘 다 커버)
  nuxtApp.hook('app:beforeMount', () => {
    stopRouteWatch()
    mql.removeEventListener('change', onMqChange)
    cancelAnimationFrame(rafId)
    lenis.destroy()
    window.__sdhsLenis = undefined
  })

  return {
    provide: {
      lenis
    }
  }
})

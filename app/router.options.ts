/**
 * ROLL ON! - Vue Router 옵션
 *
 * 모든 일반 페이지 라우팅에서 새 페이지는 항상 scrollTop = 0 부터 시작.
 * - SSR 단계에서는 document 가 없으므로 top: 0 만 반환.
 * - 클라이언트 단계에서도 동일하게 top: 0 으로 시작하여
 *   이전 페이지의 스크롤 위치가 다음 페이지로 넘어가지 않도록 한다.
 *
 * Lenis smooth scroll 은 app/plugins/lenis.client.ts 의 router.beforeEach 에서
 * 별도로 lenis.scrollTo(0, { immediate: true }) 로 즉시 0 에 맞춰준다.
 *
 * #anchor 링크 (e.g. /about#section) 가 들어오면 해당 anchor 로 이동하도록 한다.
 */
import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    // 브라우저 history back/forward 시에는 savedPosition (저장된 위치) 을 우선 사용
    // - 새로 페이지로 진입한 경우는 무조건 top
    if (savedPosition) {
      return savedPosition
    }
    // anchor 가 있으면 해당 위치로 스크롤 (현재 사이트에서는 anchor 사용처 없지만 확장성)
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'auto',
        top: 0
      }
    }
    // 그 외 모든 일반 라우팅은 즉시 맨 위
    return {
      left: 0,
      top: 0,
      behavior: 'auto'
    }
  }
}

/**
 * /admin/* 라우트 보호 미들웨어 (전역)
 *
 * - /admin/login 은 통과
 * - 그 외 /admin/* 는 로그인 + admin_users 등록 여부 확인
 * - 미인증 시 /admin/login 으로 redirect
 * - 인증되었지만 admin 이 아니면 /admin/login 으로 redirect + 에러 표시
 *
 * useSupabaseUser() 가 SSR 단계에서도 쿠키로 세션을 자동 인식하므로
 * 새로고침해도 로그인이 풀리지 않는다.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // 로그인 페이지는 통과
  if (to.path === '/admin/login') {
    return
  }

  // 그 외 /admin/* 만 검사
  if (!to.path.startsWith('/admin')) {
    return
  }

  const { user, isAdmin, loading, refresh } = useAdminAuth()

  // user / isAdmin 이 아직 확정되지 않았으면 한 번 확인
  // SSR 단계에서도 쿠키로 user 가 즉시 채워지므로 refresh 는 가벼움
  if (!user.value || !isAdmin.value) {
    // loading 상태 가드 (중복 refresh 방지)
    if (!loading.value) {
      await refresh()
    } else {
      // 이미 로딩 중이면 짧게 대기
      await new Promise((r) => setTimeout(r, 50))
      // 한 번 더 확인
      if (!isAdmin.value) await refresh()
    }
  }

  if (!user.value) {
    return navigateTo({
      path: '/admin/login',
      query: { redirect: to.fullPath }
    })
  }

  if (!isAdmin.value) {
    return navigateTo({
      path: '/admin/login',
      query: { error: 'not_admin', redirect: to.fullPath }
    })
  }
})

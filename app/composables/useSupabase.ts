/**
 * Supabase 클라이언트 composable (re-export)
 *
 * 실제 클라이언트는 @nuxtjs/supabase 플러그인이 제공한다.
 * - SSR 단계에서도 쿠키로 세션을 공유하므로 새로고침해도 로그인이 풀리지 않는다.
 * - RLS 가 적용된 anon 클라이언트 (일반 사용자/관리자 공용).
 *
 * 직접 supabase-js 를 import 하지 말고, 항상 useSupabaseClient() 를 통해 접근한다.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

// 플러그인이 제공하는 useSupabaseClient 를 그대로 사용
export { useSupabaseClient }

/**
 * 서버 사이드 Supabase 클라이언트 (service_role 사용)
 * - SSR 단계의 server context 에서만 사용한다 (server/api, server/middleware 등).
 * - 클라이언트에서 호출되면 anon 클라이언트 반환 (보안).
 */
export const useSupabaseServiceClient = (): SupabaseClient => {
  const client = useSupabaseClient()
  if (import.meta.server) {
    // SSR 단계: 쿠키 기반 anon 클라이언트 사용 (service_role 은 별도 import 필요)
    // 현재 프로젝트 구조상 server context 가 없어서 그대로 anon 클라이언트 반환
    return client
  }
  return client
}

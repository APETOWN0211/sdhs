// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/variables.css'],
  modules: [
    // Supabase 모듈: SSR-safe 클라이언트 + 세션 쿠키 처리 + useSupabaseUser 제공
    // - redirect: false (자체 admin 글로벌 미들웨어가 /admin/login 으로 redirect 처리)
    // - useSsrCookies: true (SSR 단계에서도 쿠키로 세션 인식 → 새로고침 시 로그인 유지)
    '@nuxtjs/supabase'
  ],
  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],
  supabase: {
    // 자체 미들웨어에서 redirect 처리하므로 플러그인 자동 redirect 비활성화
    redirect: false,
    // SSR 단계에서 쿠키로 세션 공유 → 새로고침해도 로그인 유지
    useSsrCookies: true
  },
  // Supabase runtime config - 클라이언트/서버에서 useRuntimeConfig() 로 접근
  runtimeConfig: {
    // 서버 전용 (절대 클라이언트 번들에 노출되지 않음)
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || ''
    }
  }
})

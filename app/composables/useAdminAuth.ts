/**
 * 관리자 인증 composable
 *
 * - 플러그인의 useSupabaseUser() 를 사용 → SSR/CSR 양쪽에서 세션을 자동 인식.
 *   → 새로고침해도 로그인이 풀리지 않는다.
 * - admin_users 테이블에 현재 user_id 가 있는지 조회하여 관리자 여부 판별.
 * - RLS 가 본인 row 만 SELECT 가능하도록 설정되어 있으므로 자동 안전.
 *
 * 참고:
 *   @nuxtjs/supabase 의 useSupabaseUser() 가 반환하는 객체는 일부 환경에서
 *   id 필드가 없는 형태로 hydrate 되는 경우가 있어, signIn / ensureAdmin 에서는
 *   supabase.auth.getUser() 로 직접 가져온 user 객체를 사용한다.
 */
import type { User } from '@supabase/supabase-js'

export interface AdminSession {
  user: User
  isAdmin: boolean
}

const DEBUG = true
const dlog = (...args: unknown[]) => {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[useAdminAuth]', ...args)
  }
}

/** admin_users 조회를 위해 신뢰할 수 있는 user 객체를 가져온다. */
const fetchAuthUser = async (): Promise<User | null> => {
  const supabase = useSupabaseClient()
  try {
    // getSession() 으로 우선 시도 (쿠키/스토리지 기반, 빠름)
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session?.user) {
      return sessionData.session.user
    }
    // 세션이 없으면 getUser() 로 강제 검증
    const { data: userData } = await supabase.auth.getUser()
    return userData.user ?? null
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[useAdminAuth] fetchAuthUser 예외:', e)
    return null
  }
}

export const useAdminAuth = () => {
  const supabase = useSupabaseClient()
  // @nuxtjs/supabase 가 제공하는 reactive user (SSR/CSR 자동 동기화)
  const user = useSupabaseUser()
  // isAdmin 은 SSR/CSR 양쪽에서 안전하게 관리하기 위해 useState 사용
  const isAdmin = useState<boolean>('admin-is-admin', () => false)
  const loading = useState<boolean>('admin-loading', () => false)
  const error = useState<string | null>('admin-error', () => null)

  /**
   * 주어진 user 로 admin_users 조회.
   * - user 가 없거나 id 가 없으면 false
   * - admin_users 에 본인 row 가 있으면 true
   */
  const ensureAdmin = async (passedUser?: User | null) => {
    error.value = null

    // 우선순위: 1) 명시적 user, 2) reactive user, 3) supabase 에서 직접 조회
    let u: User | null = passedUser ?? user.value
    if (!u || !u.id) {
      u = await fetchAuthUser()
    }
    if (!u || !u.id) {
      isAdmin.value = false
      dlog('ensureAdmin: 유효한 user.id 없음 → isAdmin=false')
      return
    }

    dlog('ensureAdmin 시작, user.id =', u.id, 'email =', u.email)
    try {
      const { data: adminRow, error: adminErr, status } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', u.id)
        .maybeSingle()

      dlog('admin_users 조회 결과:', { adminRow, adminErr, status })

      if (adminErr) {
        isAdmin.value = false
        const msg = `admin_users 조회 실패 (${adminErr.code ?? adminErr.message})`
        error.value = msg
        // eslint-disable-next-line no-console
        console.warn('[useAdminAuth]', msg, adminErr)
      } else {
        isAdmin.value = !!adminRow
        dlog('isAdmin 결정:', isAdmin.value, '(adminRow =', adminRow, ')')
      }
    } catch (e) {
      isAdmin.value = false
      const msg = e instanceof Error ? e.message : '예외 발생'
      error.value = `admin_users 조회 예외: ${msg}`
      // eslint-disable-next-line no-console
      console.warn('[useAdminAuth] ensureAdmin 예외:', e)
    }
  }

  /**
   * user 가 변경될 때마다 admin 여부 자동 재확인.
   */
  watch(
    user,
    async (next) => {
      dlog('user 변경 감지:', next ? `id=${next.id} email=${next.email}` : 'null')
      if (!next || !next.id) {
        // user 가 있더라도 id 가 없으면 fetchAuthUser 로 다시 가져오기
        await ensureAdmin()
        return
      }
      await ensureAdmin(next)
    },
    { immediate: true }
  )

  /**
   * 강제로 새로고침
   */
  const refresh = async () => {
    loading.value = true
    try {
      await ensureAdmin()
    } finally {
      loading.value = false
    }
  }

  /** 이메일/비밀번호 로그인 */
  const signIn = async (email: string, password: string) => {
    loading.value = true
    error.value = null
    try {
      dlog('signIn 시도:', email)
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (signInErr) {
        dlog('signIn 실패:', signInErr)
        throw signInErr
      }
      dlog('signIn 응답 data.user:', data.user ? `id=${data.user.id} email=${data.user.email}` : 'null')

      // signIn 응답으로 받은 user 객체가 가장 신뢰할 수 있음
      if (!data.user || !data.user.id) {
        // 만약 응답에 id 가 없으면 fetchAuthUser 로 다시 가져오기
        const fetched = await fetchAuthUser()
        if (!fetched || !fetched.id) {
          const msg = '로그인 후 사용자 정보를 가져오지 못했습니다.'
          error.value = msg
          return { ok: false as const, error: msg }
        }
        await ensureAdmin(fetched)
      } else {
        await ensureAdmin(data.user)
      }

      dlog('signIn 후 isAdmin =', isAdmin.value)

      if (!isAdmin.value) {
        // 관리자가 아니면 즉시 로그아웃
        await supabase.auth.signOut()
        let msg = '관리자 계정이 아닙니다. 관리자 권한이 있는 계정으로 로그인하세요.'
        if (error.value && error.value.startsWith('admin_users 조회 실패')) {
          msg += `\n원인: ${error.value}\nSupabase RLS 정책을 확인하거나 .env 설정 후 dev 서버를 재시작하세요.`
        }
        error.value = msg
        return { ok: false as const, error: msg }
      }
      return { ok: true as const }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '로그인에 실패했습니다.'
      dlog('signIn 예외:', msg)
      error.value = msg
      return { ok: false as const, error: msg }
    } finally {
      loading.value = false
    }
  }

  /** 로그아웃 */
  const signOut = async () => {
    loading.value = true
    try {
      await supabase.auth.signOut()
      isAdmin.value = false
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    isAdmin,
    loading,
    error,
    refresh,
    signIn,
    signOut
  }
}

/**
 * 방명록 Composable
 * - Supabase guestbook 테이블 사용
 */

export interface GuestbookEntry {
  id: string
  name: string
  message: string
  created_at: string
}

export const useGuestbook = () => {
  const supabase = useSupabaseClient()

  // 방명록 목록 가져오기
  const fetchEntries = async (): Promise<GuestbookEntry[]> => {
    const { data, error } = await supabase
      .from('guestbook')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('방명록 로드 실패:', error)
      return []
    }

    return data || []
  }

  // 방명록 추가
  const addEntry = async (
    name: string,
    message: string
  ): Promise<GuestbookEntry | null> => {
    const { data, error } = await supabase
      .from('guestbook')
      .insert({
        name: name.trim(),
        message: message.trim()
      })
      .select()
      .single()

    if (error) {
      console.error('방명록 추가 실패:', error)
      return null
    }

    return data
  }

  return {
    fetchEntries,
    addEntry
  }
}

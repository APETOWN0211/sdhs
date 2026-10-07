/**
 * 작품 데이터 composable
 *
 * - 공개 페이지 (목록 / 상세) 는 RLS 가 적용된 anon 클라이언트로 조회한다.
 *   → is_published = true 만 접근 가능 (RLS 가 보장)
 * - 관리자 페이지는 로그인된 anon 클라이언트로 조회한다.
 *   → RLS 가 관리자에게 모든 권한을 허용하므로 별도 service_role 사용 안 함.
 * - Storage URL 은 supabase.storage.from('project-images').getPublicUrl() 로 생성한다.
 *   (bucket 은 public 으로 가정, RLS 와 별개)
 *
 * 썸네일 정책:
 *   - 관리자가 별도의 썸네일 파일을 업로드하지 않는다.
 *   - 작품 이미지 (project_images) 의 첫 번째 row.storage_path 가 자동으로 썸네일이 된다.
 *   - 작품 메타의 thumbnail_path 컬럼에는 첫 번째 이미지 경로가 동기화되어 저장된다.
 *   - 만약 thumbnail_path 가 비어있다면 (구 데이터 / 누락) 사용 시점에 첫 번째 이미지로 폴백한다.
 */
import type {
  Project,
  ProjectImage,
  ProjectSummary,
  ProjectWithImages,
  ProjectFormInput,
  ResolvedImage
} from '~/types/project'

const STORAGE_BUCKET = 'project-images'

/** storage 경로를 public URL 로 변환 */
const toPublicUrl = (supabase: ReturnType<typeof useSupabaseClient>, path: string): string => {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * 작품의 실제 thumbnail 경로를 결정한다.
 * thumbnail_path 가 비어있으면 첫 번째 gallery image 를 사용한다.
 */
export const resolveThumbnailPath = (
  project: Pick<Project, 'thumbnail_path'>,
  images: ProjectImage[]
): string | null => {
  if (project.thumbnail_path) return project.thumbnail_path
  if (images.length > 0 && images[0]) return images[0].storage_path
  return null
}

/** 공개 작품 목록 - 일반 사용자용 (RLS 가 is_published=true 만 반환)
 *  - 첫 번째 gallery image 의 경로를 fallback_thumbnail_path 로 함께 가져온다
 *  - thumbnail_path 가 비어있는 경우 카드에서 fallback_thumbnail_path 를 사용한다
 */
export interface PublicProjectSummary extends ProjectSummary {
  /** thumbnail_path 가 비어있을 때 사용할 첫 번째 이미지 경로 (fallback) */
  fallback_thumbnail_path: string | null
}

export const usePublicProjects = () => {
  const supabase = useSupabaseClient()

  /**
   * 작품 목록 조회 (SSR-safe).
   * - useAsyncData + 안정적 key('public-projects-list') 로 SSR 단계에서 fetch.
   *   /works 진입 시 HTML 자체에 작품 정보가 포함되어 FCP/LCP 가 빨라진다.
   * - server:true + client:false 가 기본값이므로 SSR 에서만 실행되고,
   *   hydrate 시 서버에서 가져온 payload 를 즉시 사용한다.
   * - 같은 key 로 두 번 이상 호출되어도 Nuxt 가 중복 fetch 하지 않는다.
   */
  const {
    data: list,
    pending: loading,
    error: asyncError,
    refresh
  } = useAsyncData<PublicProjectSummary[]>(
    'public-projects-list',
    async () => {
      // projects 메타 + 첫 번째 gallery image 만 select.
      // description / short_description / created_at / updated_at 은
      // 목록에 불필요하므로 가져오지 않는다 → 전송량/디코드 부담 감소.
      const { data: projects, error: pErr } = await supabase
        .from('projects')
        .select('id, slug, title, student_name, category, thumbnail_path, is_published, sort_order')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (pErr) throw pErr

      const safeProjects = (projects ?? []) as ProjectSummary[]
      const ids = safeProjects.map((p) => p.id)

      // 각 작품의 첫 번째 gallery image 경로만 일괄 조회.
      // - select: project_id, storage_path 만 (이미지 본문은 가져오지 않음)
      // - in (project_id, ids) 로 단일 round-trip
      // - order(sort_order, created_at) 후 첫 행만 reduce 로 추출
      let firstImgByProject: Record<string, string> = {}
      if (ids.length > 0) {
        const { data: imgs, error: iErr } = await supabase
          .from('project_images')
          .select('project_id, storage_path, sort_order, created_at')
          .in('project_id', ids)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })
        if (iErr) throw iErr
        firstImgByProject = ((imgs ?? []) as Array<{
          project_id: string
          storage_path: string
        }>).reduce<Record<string, string>>((acc, img) => {
          if (!(img.project_id in acc)) acc[img.project_id] = img.storage_path
          return acc
        }, {})
      }

      return safeProjects.map((p) => ({
        ...p,
        fallback_thumbnail_path: firstImgByProject[p.id] ?? null
      }))
    },
    {
      // default: 첫 진입 시 list.value 가 null 이지만 skeleton 을 즉시 표시하기 위해 [] 로.
      default: () => [],
      server: true
    }
  )

  // useAsyncData.error (Error | null) → 외부 노출용 string 으로 변환.
  const error = computed<string | null>(() =>
    asyncError.value ? asyncError.value.message : null
  )

  /** 카드의 thumbnail URL */
  const thumbnailUrl = (path: string | null): string | null => {
    if (!path) return null
    return toPublicUrl(supabase, path)
  }

  return { list, loading, error, refresh, thumbnailUrl }
}

/** 공개 작품 상세 - slug 기반 조회 */
export const usePublicProject = () => {
  const supabase = useSupabaseClient()
  const project = useState<ProjectWithImages | null>('public-project', () => null)
  const images = useState<ProjectImage[]>('public-project-images', () => [])
  const loading = useState<boolean>('public-project-loading', () => false)
  const error = useState<string | null>('public-project-error', () => null)
  const notFound = useState<boolean>('public-project-not-found', () => false)

  /** slug 로 작품 + 이미지 조회 (progressive loading) */
  const fetchBySlug = async (slug: string) => {
    loading.value = true
    error.value = null
    notFound.value = false
    project.value = null
    images.value = []

    try {
      // ── 1단계: project 메타만 먼저 가져와서 사이드바/hero 즉시 표시 ──
      const { data: proj, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle()

      if (projErr) throw projErr
      if (!proj) {
        notFound.value = true
        return
      }

      // project 메타는 즉시 set → 사이드바 + hero thumbnail_path 기반 hero 표시
      project.value = { ...(proj as Project), images: [] } as ProjectWithImages

      // ── 2단계: 이미지를 가져와서 갤러리 채우기 ──
      const { data: imgs, error: imgErr } = await supabase
        .from('project_images')
        .select('*')
        .eq('project_id', proj.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (imgErr) throw imgErr

      images.value = (imgs ?? []) as ProjectImage[]
      // project.images 도 동기화 (galleryFirstImage 의 hero fallback 등에서 사용)
      project.value = { ...(proj as Project), images: (imgs ?? []) as ProjectImage[] }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '작품을 불러오지 못했습니다.'
      error.value = msg
    } finally {
      loading.value = false
    }
  }

  /** id 로 작품 + 이미지 조회 (다른작품 영역에서 사용) */
  const fetchById = async (id: string) => {
    const { data: proj, error: projErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .maybeSingle()
    if (projErr || !proj) return null
    const { data: imgs } = await supabase
      .from('project_images')
      .select('*')
      .eq('project_id', id)
      .order('sort_order', { ascending: true })
    return {
      ...(proj as Project),
      images: (imgs ?? []) as ProjectImage[]
    } as ProjectWithImages
  }

  const thumbnailUrl = (path: string | null): string | null => {
    if (!path) return null
    return toPublicUrl(supabase, path)
  }

  const resolveImage = (img: ProjectImage): ResolvedImage => ({
    id: img.id,
    storage_path: img.storage_path,
    alt: img.alt,
    url: toPublicUrl(supabase, img.storage_path)
  })

  /**
   * 실제 사용자에게 보여줄 thumbnail URL
   * (project.thumbnail_path 가 비어있으면 첫 번째 이미지 사용)
   */
  const heroThumbnailUrl = (): string | null => {
    if (!project.value) return null
    const path = resolveThumbnailPath(project.value, images.value)
    return path ? thumbnailUrl(path) : null
  }

  return {
    project,
    images,
    loading,
    error,
    notFound,
    fetchBySlug,
    fetchById,
    thumbnailUrl,
    resolveImage,
    heroThumbnailUrl
  }
}

/** 다른작품 (현재 작품 제외, 공개된 다른 작품 N개)
 *  - thumbnail_path 가 비어있을 때 fallback_thumbnail_path 로 첫 번째 이미지 사용
 */
export interface OtherProjectSummary extends ProjectSummary {
  fallback_thumbnail_path: string | null
}

export const useOtherProjects = (currentId: Ref<string | null>, limit = 2) => {
  const supabase = useSupabaseClient()
  // currentId 와 무관하게 단일 글로벌 슬롯을 사용 → SSR/CSR hydration 안정
  // (currentId 가 늦게 채워져도 같은 ref 를 공유)
  const list = useState<OtherProjectSummary[]>('other-projects', () => [])
  const loading = useState<boolean>('other-projects-loading', () => false)
  const error = useState<string | null>('other-projects-error', () => null)

  const fetch = async () => {
    if (!currentId.value) {
      // currentId 가 아직 없으면 빈 배열만 유지 (watch 에서 재호출됨)
      list.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      let q = supabase
        .from('projects')
        .select('id, slug, title, student_name, category, thumbnail_path, is_published, sort_order')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(limit + 1)

      // currentId 와 같지 않은 작품만 (neq 사용)
      q = q.neq('id', currentId.value)

      const { data, error: err } = await q
      if (err) throw err
      const all = (data ?? []) as ProjectSummary[]
      const trimmed = all.slice(0, limit)

      // 각 작품의 첫 번째 이미지 fallback
      let firstImgByProject: Record<string, string> = {}
      const ids = trimmed.map((p) => p.id)
      if (ids.length > 0) {
        const { data: imgs, error: iErr } = await supabase
          .from('project_images')
          .select('project_id, storage_path, sort_order, created_at')
          .in('project_id', ids)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })
        if (iErr) throw iErr
        firstImgByProject = ((imgs ?? []) as Array<{
          project_id: string
          storage_path: string
        }>).reduce<Record<string, string>>((acc, img) => {
          if (!(img.project_id in acc)) acc[img.project_id] = img.storage_path
          return acc
        }, {})
      }

      list.value = trimmed.map((p) => ({
        ...p,
        fallback_thumbnail_path: firstImgByProject[p.id] ?? null
      }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : '다른작품을 불러오지 못했습니다.'
      error.value = msg
      list.value = []
    } finally {
      loading.value = false
    }
  }

  // currentId 가 변경되면 자동으로 다시 fetch
  watch(currentId, () => {
    if (currentId.value) fetch()
  })

  // 디버그 + 방어:
  // - SSR payload stale 등으로 list가 배열이 아닌 값으로 hydrate 되어도
  //   page computed가 깨지지 않도록 항상 배열로 보정.
  // - 동시에 어떤 객체가 들어왔는지 콘솔로 진단.
  if (import.meta.client) {
    watch(
      list,
      (next) => {
        if (!Array.isArray(next)) {
          // eslint-disable-next-line no-console
          console.warn('[useOtherProjects] list 가 배열이 아님 → 강제 [] 변환:', next)
          list.value = []
          return
        }
        next.forEach((p, i) => {
          if (!p || typeof (p as { slug?: unknown }).slug !== 'string') {
            // eslint-disable-next-line no-console
            console.warn('[useOtherProjects] list 원소가 slug 를 잃음:', { index: i, item: p })
          }
        })
      },
      { deep: true, immediate: true }
    )
  }

  return { list, loading, error, fetch }
}

/** =============================================================
 *  관리자 작품 CRUD
 *  ============================================================= */

/** slug 자동 생성 (한글/특수문자 포함되어도 URL-safe) */
export const slugify = (input: string): string => {
  const base = (input || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // 결합 부호 제거
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ') // 영숫자/공백/- 만 유지
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  // 한글-only 입력이면 결과가 비어버리므로, fallback 으로 비어있지 않은 임의값
  if (!base) {
    // 영문자/숫자가 하나도 없으면 timestamp 기반 slug
    return 'project-' + Date.now().toString(36)
  }
  return base
}

export const useAdminProjects = () => {
  const supabase = useSupabaseClient()
  const list = useState<ProjectWithImages[]>('admin-projects', () => [])
  const loading = useState<boolean>('admin-projects-loading', () => false)
  const error = useState<string | null>('admin-projects-error', () => null)

  /** 전체 작품 (관리자 - 비공개 포함) */
  const fetchAll = async () => {
    loading.value = true
    error.value = null
    try {
      const { data: projects, error: pErr } = await supabase
        .from('projects')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (pErr) throw pErr

      const ids = (projects ?? []).map((p) => p.id)
      let imgsByProject: Record<string, ProjectImage[]> = {}
      if (ids.length > 0) {
        const { data: imgs, error: iErr } = await supabase
          .from('project_images')
          .select('*')
          .in('project_id', ids)
          .order('sort_order', { ascending: true })
        if (iErr) throw iErr
        imgsByProject = ((imgs ?? []) as ProjectImage[]).reduce<Record<string, ProjectImage[]>>((acc, img) => {
          ;(acc[img.project_id] ||= []).push(img)
          return acc
        }, {})
      }

      list.value = ((projects ?? []) as Project[]).map((p) => ({
        ...p,
        images: imgsByProject[p.id] ?? []
      }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : '작품 목록을 불러오지 못했습니다.'
      error.value = msg
      list.value = []
    } finally {
      loading.value = false
    }
  }

  /** 단건 조회 (id) - 수정 페이지용 */
  const fetchById = async (id: string): Promise<ProjectWithImages | null> => {
    const { data: proj, error: pErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (pErr) throw pErr
    if (!proj) return null
    const { data: imgs, error: iErr } = await supabase
      .from('project_images')
      .select('*')
      .eq('project_id', id)
      .order('sort_order', { ascending: true })
    if (iErr) throw iErr
    return { ...(proj as Project), images: (imgs ?? []) as ProjectImage[] }
  }

  /**
   * 새 작품 생성
   * - thumbnail 별도 업로드 없음
   * - 첫 번째 갤러리 이미지의 storage_path 가 자동으로 thumbnail_path 가 됨
   */
  const create = async (
    input: ProjectFormInput,
    galleryImages: File[]
  ): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    try {
      if (galleryImages.length === 0) {
        return { ok: false, error: '작품 이미지를 최소 1장 이상 업로드해주세요. (첫 번째 이미지가 썸네일이 됩니다)' }
      }

      // 1) projects INSERT (thumbnail_path 는 첫 이미지 업로드 후 update)
      const { data: inserted, error: insErr } = await supabase
        .from('projects')
        .insert({
          slug: input.slug,
          title: input.title,
          student_name: input.student_name,
          student_number: input.student_number,
          category: input.category,
          short_description: input.short_description,
          description: input.description,
          is_published: input.is_published,
          sort_order: input.sort_order
        })
        .select('id')
        .single()
      if (insErr) throw insErr

      const projectId: string = inserted.id

      // 2) 갤러리 이미지 업로드 + project_images INSERT
      const uploadedPaths: string[] = []
      for (let i = 0; i < galleryImages.length; i++) {
        const file = galleryImages[i]
        if (!file) continue
        const path = `${projectId}/gallery/${String(i + 1).padStart(3, '0')}-${cryptoRandomName(file)}`
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || undefined
          })
        if (upErr) {
          // 부분 실패 시 이미 업로드된 Storage 파일 정리 후 프로젝트 삭제
          if (uploadedPaths.length > 0) {
            await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths)
          }
          await cleanupProject(supabase, projectId)
          throw upErr
        }
        uploadedPaths.push(path)

        const { error: rowErr } = await supabase.from('project_images').insert({
          project_id: projectId,
          storage_path: path,
          alt: null,
          sort_order: i
        })
        if (rowErr) {
          await supabase.storage.from(STORAGE_BUCKET).remove([path])
          await cleanupProject(supabase, projectId)
          throw rowErr
        }
      }

      // 3) thumbnail_path = 첫 번째 이미지 경로로 동기화
      const firstPath = uploadedPaths[0] ?? null
      if (firstPath) {
        const { error: updErr } = await supabase
          .from('projects')
          .update({ thumbnail_path: firstPath })
          .eq('id', projectId)
        if (updErr) {
          await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths)
          await cleanupProject(supabase, projectId)
          throw updErr
        }
      }

      return { ok: true, id: projectId }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '작품 저장에 실패했습니다.'
      return { ok: false, error: msg }
    }
  }

  /**
   * 작품 수정
   * - thumbnail 별도 업로드 없음
   * - 남은 기존 이미지 중 첫 번째 → 새 이미지들의 첫 번째 순으로 thumbnail_path 결정
   */
  const update = async (
    id: string,
    input: ProjectFormInput,
    newGalleryImages: File[],
    keepImageIds: string[]
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      // 1) 기존 작품 + 이미지 로드
      const existing = await fetchById(id)
      if (!existing) {
        return { ok: false, error: '작품을 찾을 수 없습니다.' }
      }

      // 2) 삭제 대상 이미지 = 기존 중 keepImageIds 에 없는 것
      const toDelete = existing.images.filter((img) => !keepImageIds.includes(img.id))

      // 3) Storage 에서 삭제 대상 이미지 제거
      if (toDelete.length > 0) {
        const paths = toDelete.map((i) => i.storage_path)
        const { error: rmErr } = await supabase.storage.from(STORAGE_BUCKET).remove(paths)
        if (rmErr) throw rmErr
        const { error: rowDelErr } = await supabase
          .from('project_images')
          .delete()
          .in('id', toDelete.map((i) => i.id))
        if (rowDelErr) throw rowDelErr
      }

      // 4) 새 갤러리 이미지 업로드 + INSERT
      const baseSort = existing.images.length // 신규는 뒤로
      const uploadedNew: string[] = []
      for (let i = 0; i < newGalleryImages.length; i++) {
        const file = newGalleryImages[i]
        if (!file) continue
        const path = `${id}/gallery/${String(baseSort + i + 1).padStart(3, '0')}-${cryptoRandomName(file)}`
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || undefined
          })
        if (upErr) throw upErr
        uploadedNew.push(path)

        const { error: rowErr } = await supabase.from('project_images').insert({
          project_id: id,
          storage_path: path,
          alt: null,
          sort_order: baseSort + i
        })
        if (rowErr) throw rowErr
      }

      // 5) thumbnail_path 결정
      // - 남은 기존 이미지 중 sort_order 최소인 이미지
      // - 없으면 새 이미지 중 첫 번째
      // - 그것도 없으면 null
      const remainingExisting = existing.images
        .filter((img) => keepImageIds.includes(img.id))
        .sort((a, b) => a.sort_order - b.sort_order)
      const firstExisting = remainingExisting[0] ?? null
      const firstNew = uploadedNew[0] ?? null
      const thumbnailPath = firstExisting?.storage_path ?? firstNew ?? null

      // 6) 작품 메타 업데이트
      const { error: updErr } = await supabase
        .from('projects')
        .update({
          slug: input.slug,
          title: input.title,
          student_name: input.student_name,
          student_number: input.student_number,
          category: input.category,
          short_description: input.short_description,
          description: input.description,
          is_published: input.is_published,
          sort_order: input.sort_order,
          thumbnail_path: thumbnailPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      if (updErr) throw updErr

      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '작품 수정에 실패했습니다.'
      return { ok: false, error: msg }
    }
  }

  /** 작품 삭제 (Storage 파일 + DB row) */
  const remove = async (id: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const existing = await fetchById(id)
      if (!existing) return { ok: false, error: '작품을 찾을 수 없습니다.' }

      // Storage 파일 삭제 (모든 이미지; thumbnail_path 는 첫 이미지와 동일할 가능성이 높아
      // 중복 경로가 들어갈 수 있지만 Supabase storage remove 가 중복을 자동 처리)
      const allPaths: string[] = []
      if (existing.thumbnail_path) allPaths.push(existing.thumbnail_path)
      for (const img of existing.images) {
        if (!allPaths.includes(img.storage_path)) allPaths.push(img.storage_path)
      }
      if (allPaths.length > 0) {
        await supabase.storage.from(STORAGE_BUCKET).remove(allPaths)
      }

      // DB 삭제 (CASCADE 로 project_images 자동 삭제)
      const { error: delErr } = await supabase.from('projects').delete().eq('id', id)
      if (delErr) throw delErr

      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '작품 삭제에 실패했습니다.'
      return { ok: false, error: msg }
    }
  }

  return {
    list,
    loading,
    error,
    fetchAll,
    fetchById,
    create,
    update,
    remove,
    thumbnailUrl: (path: string | null) => (path ? toPublicUrl(supabase, path) : null),
    resolveImage: (img: ProjectImage): ResolvedImage => ({
      id: img.id,
      storage_path: img.storage_path,
      alt: img.alt,
      url: toPublicUrl(supabase, img.storage_path)
    })
  }
}

/** 안전한 파일명 생성 (원본 확장자 유지 + uuid) */
const cryptoRandomName = (file: File): string => {
  const ext = (file.name.split('.').pop() || guessExtFromType(file.type) || 'bin')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  // crypto.randomUUID 가 있으면 사용, 없으면 timestamp+random fallback
  const id =
    typeof crypto !== 'undefined' && typeof (crypto as { randomUUID?: () => string }).randomUUID === 'function'
      ? (crypto as { randomUUID: () => string }).randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  return `${id}.${ext}`
}

const guessExtFromType = (mime: string): string => {
  if (!mime) return ''
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return mime.split('/').pop() || ''
}

/** 작품 생성 중 부분失敗 시 정리 */
const cleanupProject = async (
  supabase: ReturnType<typeof useSupabaseClient>,
  projectId: string
) => {
  // DB CASCADE 로 project_images 정리
  await supabase.from('projects').delete().eq('id', projectId)
}

/**
 * 다른작품 (현재 작품 기준 DB 정렬 순서에서 "다음 N개", wrap-around)
 *
 * 동작 방식:
 * - 모든 published 작품을 projects.sort_order ASC, created_at ASC 로 가져온다.
 * - 그 안에서 currentId 의 index 를 찾는다.
 * - 그 다음 index 의 작품 2개를 list 에 담는다.
 * - 마지막 작품(가장 뒤) 이면 wrap-around 로 다시 앞쪽에서 채운다.
 *   예) 현재 14번째 작품 (총 15개) → 15번째 + 1번째
 *
 * - 각 작품의 thumbnail_path 가 비어있으면
 *   project_images 첫 행을 fallback_thumbnail_path 로 함께 가져온다.
 *
 * - SSR-safe: useState 로 단일 글로벌 슬롯에 저장하여
 *   /projects/[id] 끼리 내비게이션해도 캐시가 공유되며 hydration 도 안정적이다.
 */
export const useOtherProjectsSequential = (currentId: Ref<string | null>, limit = 2) => {
  const supabase = useSupabaseClient()

  const list = useState<OtherProjectSummary[]>('other-projects-sequential', () => [])
  const loading = useState<boolean>('other-projects-sequential-loading', () => false)
  const error = useState<string | null>('other-projects-sequential-error', () => null)

  const fetch = async () => {
    const cid = currentId.value
    if (!cid) {
      // currentId 가 아직 없으면 빈 배열 유지 (watch 에서 재호출됨)
      list.value = []
      return
    }

    loading.value = true
    error.value = null
    try {
      // 1) 모든 published 작품을 DB 정렬 순서로 가져온다.
      const { data: allProjects, error: pErr } = await supabase
        .from('projects')
        .select('id, slug, title, student_name, category, thumbnail_path, is_published, sort_order')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (pErr) throw pErr

      const all = (allProjects ?? []) as ProjectSummary[]
      if (all.length === 0) {
        list.value = []
        return
      }

      // 2) currentId 의 index 를 찾는다.
      const currentIndex = all.findIndex((p) => p.id === cid)
      if (currentIndex === -1) {
        // 현재 작품이 목록에 없으면 (RLS / 비공개 등) 그냥 앞에서 2개.
        const picked = all.slice(0, limit)
        const merged = await attachFallbacks(picked)
        list.value = merged
        return
      }

      // 3) 현재 작품의 다음 N개를 wrap-around 로 가져온다.
      // - currentIndex 다음부터 순서대로 채운다.
      // - 끝까지 다 쓰면 모자란 만큼 앞쪽(0) 부터 이어서 채운다.
      // - 단, 자기 자신은 제외한다 (currentId 와 다른 id 만).
      const picked: ProjectSummary[] = []
      for (let step = 1; step <= all.length && picked.length < limit; step++) {
        const idx = (currentIndex + step) % all.length
        const candidate = all[idx]!
        if (candidate.id !== cid) {
          picked.push(candidate)
        }
      }

      // 모든 작품이 자기 자신밖에 없는 극단 케이스(예: 1개 작품)는
      // 위 루프에서 picked 가 비게 된다. 이때는 빈 배열로 두지 않고
      // 자기 자신이라도 노출하여 카드가 "안 보임" 상태가 되지 않게 한다.
      if (picked.length === 0 && all.length > 0) {
        // 자기 자신 외 다른 row 가 없는 경우.
        // 첫 번째 작품을 fallback 으로 노출 (id 가 같아도 카드는 표시).
        const firstOther = all.find((p) => p.id !== cid)
        if (firstOther) picked.push(firstOther)
        else picked.push(all[0]!)
      }

      // 4) 각 작품의 fallback_thumbnail_path 를 첫 번째 이미지로 채워 반환.
      const result = await attachFallbacks(picked)
      // eslint-disable-next-line no-console
      console.log('[useOtherProjectsSequential] picked:', picked.map(p => ({ id: p.id, slug: p.slug, title: p.title })))
      // eslint-disable-next-line no-console
      console.log('[useOtherProjectsSequential] result type:', Array.isArray(result), 'length:', (result as unknown[]).length)

      /*
       * list.value = result: Vue 의 useState(Ref) 는 .value 에 array 를 set 할 때
       * reactive proxy 로 감싸는데, 일부 환경(SSR hydrate 직후) 에서
       * Array.isArray(list.value) 가 false 로 평가되는 케이스가 있다.
       * - 이 경우 .filter / .map / .forEach 가 깨지거나 비어버린다.
       * - 안전을 위해 spread 로 새 array 를 만들어 set.
       */
      list.value = [...result] as OtherProjectSummary[]
      // eslint-disable-next-line no-console
      console.log('[useOtherProjectsSequential] list.value set, isArray:', Array.isArray(list.value), 'length:', list.value.length)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '다른작품을 불러오지 못했습니다.'
      // eslint-disable-next-line no-console
      console.error('[useOtherProjectsSequential] fetch error:', e)
      error.value = msg
      list.value = []
    } finally {
      loading.value = false
    }
  }

  // currentId 가 바뀌면 재호출.
  // - immediate: true 이지만 처음에 currentId 가 null 이면 fetch 자체를 건너뛴다.
  // - project.value 가 hydrate 또는 fetch 로 채워지면 currentId 가 reactive 로
  //   갱신되고 watch 가 다시 trigger 되어 fetch 가 호출된다.
  watch(currentId, (cid) => {
    if (cid) {
      // eslint-disable-next-line no-console
      console.log('[useOtherProjectsSequential] watch triggered, currentId:', cid)
      fetch()
    }
  }, { immediate: true })

  /**
   * 각 작품의 첫 번째 project_images.storage_path 를 fallback_thumbnail_path 로 부착.
   * - 단일 in(...) 쿼리로 round-trip 최소화.
   * - 반환값은 OtherProjectSummary[] (thumbnail_path 가 비어있을 때만 fallback 사용).
   */
  const attachFallbacks = async (arr: ProjectSummary[]): Promise<OtherProjectSummary[]> => {
    if (arr.length === 0) return []
    const ids = arr.map((p) => p.id)
    const { data: imgs, error: iErr } = await supabase
      .from('project_images')
      .select('project_id, storage_path, sort_order, created_at')
      .in('project_id', ids)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (iErr) throw iErr

    // project_id 별 첫 행만 채택.
    const firstImgByProject: Record<string, string> = {}
    ;((imgs ?? []) as Array<{ project_id: string; storage_path: string }>).forEach((img) => {
      if (!(img.project_id in firstImgByProject)) {
        firstImgByProject[img.project_id] = img.storage_path
      }
    })

    return arr.map((p) => ({
      ...p,
      fallback_thumbnail_path: firstImgByProject[p.id] ?? null
    }))
  }

  return { list, loading, error, fetch }
}

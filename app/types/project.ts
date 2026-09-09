/**
 * ROLL ON! - 작품 관련 TypeScript 타입 정의
 * Supabase 의 projects / project_images 테이블 row 와 1:1 대응.
 */

export interface Project {
  id: string
  slug: string
  title: string
  student_name: string
  student_number: string | null
  category: string | null
  short_description: string | null
  description: string | null
  /**
   * Storage 버킷 내 thumbnail 경로.
   * 일반적으로 project_images 의 첫 번째 row.storage_path 와 동일.
   */
  thumbnail_path: string | null
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProjectImage {
  id: string
  project_id: string
  storage_path: string
  alt: string | null
  sort_order: number
  created_at: string
}

export interface ProjectWithImages extends Project {
  images: ProjectImage[]
}

/** 카드형 미리보기용 - 목록 페이지에서 사용 */
export interface ProjectSummary {
  id: string
  slug: string
  title: string
  student_name: string
  category: string | null
  thumbnail_path: string | null
  is_published: boolean
  sort_order: number
}

/**
 * 작품 폼 입력 데이터 (생성/수정 공용)
 * - 관리자에게 입력 받는 필드: title, student_name, category, description, is_published
 * - slug: 작품명 변경 시 자동 동기화 (내부에서 slugify)
 * - sort_order / student_number / short_description: 호환을 위해 남겨두지만 UI 에는 노출 안 함
 */
export interface ProjectFormInput {
  title: string
  slug: string
  student_name: string
  student_number: string | null
  category: string | null
  short_description: string | null
  description: string | null
  is_published: boolean
  sort_order: number
}

/** 업로드할 이미지 메타 (관리자 페이지 폼에서 사용) */
export interface PendingImage {
  /** 임시 클라이언트 식별자 */
  localId: string
  file: File
  alt: string
}

/** 공개용 이미지 (썸네일 또는 갤러리) - 렌더링용으로 storage_path + url 조합 */
export interface ResolvedImage {
  id?: string
  storage_path: string
  alt: string | null
  url: string
}

/** 카테고리 (UI에서 필터로 사용) */
export type CategoryFilter = '전체' | '편집' | 'UI/UX' | '브랜딩' | '패키지'
export type ProjectCategory = Exclude<CategoryFilter, '전체'>

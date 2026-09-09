-- ============================================================
-- ROLL ON! - Seed 데이터 (초기 작품)
-- 기존 하드코딩된 mock 작품 데이터를 Supabase 로 이전하기 위한 SQL.
--
-- 주의:
-- 1. 이 SQL 은 작품 메타데이터만 생성합니다 (이미지는 Storage 업로드 필요).
-- 2. 최초 관리자 UUID 가 확정된 후 아래 주석을 풀고 실행하세요.
-- 3. 이미 동일한 slug 가 있으면 ON CONFLICT (slug) DO NOTHING 으로 안전 처리.
-- ============================================================

-- (선택) 첫 관리자 등록 - 'YOUR-USER-UUID-HERE' 부분을 실제 Supabase Auth 사용자 UUID 로 교체
-- INSERT INTO public.admin_users (user_id) VALUES ('YOUR-USER-UUID-HERE')
-- ON CONFLICT (user_id) DO NOTHING;

-- 작품 메타데이터
-- is_published = true: 기존 mock 데이터가 외부에 노출되던 작품이므로 즉시 공개 상태로 시작
-- 작품 이미지는 관리자 페이지 (/admin/projects/[id] 의 작품 수정 화면)에서 업로드.
-- 첫 번째 업로드 이미지가 자동으로 thumbnail 이 됩니다.
INSERT INTO public.projects (slug, title, student_name, category, is_published, sort_order)
VALUES
  ('hsr-custom-1', 'HSR CUSTOM', '이강',    '브랜딩', true, 0),
  ('ddddd',        'ddddd',     '김이안',  '편집',   true, 1),
  ('dfsfdf',       'dfsfdf',    '이우진',  'UI/UX',  true, 2),
  ('hsr-custom-2', 'HSR CUSTOM', '성민규',  '브랜딩', true, 3),
  ('hsr-custom-3', 'HSR CUSTOM', '규규규',  '패키지', true, 4),
  ('hsr-custom-4', 'HSR CUSTOM', '이강',    '편집',   true, 5),
  ('hsr-custom-5', 'HSR CUSTOM', '이강',    'UI/UX',  true, 6),
  ('hsr-custom-6', 'HSR CUSTOM', '이강',    '브랜딩', true, 7),
  ('hsr-custom-7', 'HSR CUSTOM', '규규규',  '패키지', true, 8),
  ('hsr-custom-8', 'HSR CUSTOM', '이강',    '편집',   true, 9),
  ('hsr-custom-9', 'HSR CUSTOM', '이강',    'UI/UX',  true, 10),
  ('hsr-custom-10','HSR CUSTOM', '이강',    '브랜딩', true, 11)
ON CONFLICT (slug) DO NOTHING;

-- 이미지 파일은 Storage 에 직접 업로드해야 합니다.
-- 버킷 'project-images' 아래에 다음 경로 구조로 업로드:
--   {project-id}/gallery/001-<uuid>.<ext>, 002-..., ...
-- 이후 관리자 페이지에서 작품 수정 → 이미지 업로드 시 자동으로 처리됩니다.
-- 첫 번째 업로드 이미지의 storage_path 가 projects.thumbnail_path 에 자동 동기화됩니다.

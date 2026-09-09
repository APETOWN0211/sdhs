-- ============================================================
-- ROLL ON! - 초기 스키마 마이그레이션
-- Supabase Dashboard → SQL Editor 에서 그대로 실행하세요.
-- ============================================================

-- ------------------------------------------------------------
-- 1. updated_at 자동 갱신 트리거 함수
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 2. 관리자 판별 함수 (RLS 정책과 동일한 기준으로 사용)
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- RLS 가 활성화된 환경에서도 본 함수가 admin_users 를 읽을 수 있도록
-- 함수 owner 를 postgres 로 두고 security definer 사용
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ============================================================
-- 3. projects 테이블
-- ============================================================
create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  student_name     text not null,
  student_number   text,
  category         text,
  short_description text,
  description      text,
  thumbnail_path   text,
  is_published     boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists projects_slug_idx
  on public.projects (slug);

create index if not exists projects_is_published_sort_idx
  on public.projects (is_published, sort_order asc, created_at asc);

create index if not exists projects_category_idx
  on public.projects (category);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. project_images 테이블
-- ============================================================
create table if not exists public.project_images (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  alt          text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists project_images_project_idx
  on public.project_images (project_id, sort_order asc, created_at asc);

-- ============================================================
-- 5. admin_users 테이블
-- ============================================================
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. RLS 활성화
-- ============================================================
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.admin_users enable row level security;

-- ------------------------------------------------------------
-- 7. projects RLS 정책
--    - 비로그인(anon) / 일반 로그인(authenticated) 사용자:
--        SELECT: is_published = true 만 가능
--        INSERT/UPDATE/DELETE: 불가
--    - 관리자 (admin_users 등록 사용자):
--        SELECT/INSERT/UPDATE/DELETE: 모두 가능
-- ------------------------------------------------------------
drop policy if exists "projects_select_published" on public.projects;
create policy "projects_select_published"
  on public.projects
  for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "projects_admin_all" on public.projects;
create policy "projects_admin_all"
  on public.projects
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 8. project_images RLS 정책
--    - 공개 작품에 속한 이미지만 일반 사용자가 조회 가능
--    - 관리자는 모든 CRUD 가능
-- ------------------------------------------------------------
drop policy if exists "project_images_select_published" on public.project_images;
create policy "project_images_select_published"
  on public.project_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_images.project_id
        and p.is_published = true
    )
  );

drop policy if exists "project_images_admin_all" on public.project_images;
create policy "project_images_admin_all"
  on public.project_images
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 9. admin_users RLS 정책
--    - 본인의 admin_users row 만 SELECT 가능 (관리자 여부 확인용)
--    - INSERT/DELETE 는 서비스 롤 또는 별도 SQL 로만 가능
-- ------------------------------------------------------------
drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- 10. Storage 버킷 (project-images)
--     public 으로 생성하여 작품 이미지를 공개 URL 로 제공
-- ============================================================
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

-- Storage 정책: 관리자(authenticated + is_admin) 만 업로드/삭제 가능
drop policy if exists "project_images_storage_select" on storage.objects;
create policy "project_images_storage_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'project-images');

drop policy if exists "project_images_storage_admin_write" on storage.objects;
create policy "project_images_storage_admin_write"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-images'
    and public.is_admin()
  );

drop policy if exists "project_images_storage_admin_update" on storage.objects;
create policy "project_images_storage_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'project-images'
    and public.is_admin()
  )
  with check (
    bucket_id = 'project-images'
    and public.is_admin()
  );

drop policy if exists "project_images_storage_admin_delete" on storage.objects;
create policy "project_images_storage_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-images'
    and public.is_admin()
  );

-- ============================================================
-- 11. Realtime (선택사항)
-- ============================================================
-- (필요 시 추가)

-- ============================================================
-- 끝
-- ============================================================

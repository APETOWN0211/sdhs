# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

---

## Project Notes

### 작품 상세 페이지 — 다른작품 영역 반응형 (2026-09-04)

#### 증상
- Tablet ~1280px 이하 / 특히 Surface Pro 7 (viewport 912px) 에서
  "다른작품" 카드가 좌측 작품 정보 컬럼을 벗어나
  우측 작품 이미지 갤러리 컬럼까지 침범함.

#### 원인 (CSS 분석)
- `.detail__sidebar` (좌측 작품 정보 컬럼)
  - `width: 390px` 만 지정되어 있고 `min-width` 가 명시되지 않음.
  - flex item 의 기본값 `min-width: auto` + 자식 콘텐츠가 부모보다 크면
    sticky sidebar 가 콘텐츠 크기만큼 늘어나서 우측 컬럼을 밀어냄.
- `.detail__other-list`
  - `display: flex` + `gap: 10px` + `overflow: hidden` 만 지정.
  - `flex-wrap` 이 없어 카드가 부모보다 커도 줄바꿈되지 않음.
  - `overflow: hidden` 은 시각적 잘림만 처리하고 부모 자체의 침범은 막지 못함.
- `.detail__other-item`
  - `width: 192px` 고정값 → 카드 2개 + gap 10px = 394px 로
    390px sidebar 를 초과.

#### 해결
- `.detail__sidebar` 에 `min-width: 0; flex-shrink: 0;` 추가
  → sticky + 명시 width 인 상태에서 콘텐츠에 의한 강제 확장을 차단.
- `.detail__other` 에 `min-width: 0` 추가
  → sticky sidebar 내부 wrapper 가 콘텐츠 크기에 영향받지 않도록.
- `.detail__other-list`
  - `display: grid` + `grid-template-columns: repeat(2, minmax(0, 1fr))` 로 변경
  - `width: 100%; min-width: 0` 추가
  - `overflow: hidden` 제거 (불필요, wrapper 자체가 부모에 맞춰짐).
- `.detail__other-item`
  - 고정 `width: 192px; height: 108px;` 제거
  - `width: 100%; min-width: 0; aspect-ratio: 16 / 9;` 로 변경
  → 부모 컬럼 폭에 맞춰 fluid 하게 축소, 비율은 유지.
- 모바일 미디어 쿼리에서
  `.detail__other-item` 의 고정 `width: 130px; height: 73px;` 제거 후
  `width: 100%; height: auto;` 로 통일.

#### 결과
- 1440 / 1280 / 1024 / 912 / 768 / 430 모든 viewport 에서
  "다른작품" 영역은 항상 좌측 작품 정보 컬럼(.detail__sidebar) 안에만 위치.
- Desktop 의 다른작품 카드 시각적 크기는 거의 동일하게 유지
  (192×108 → 약 190×107 의 fluid 사이즈).
- 카드 개수(2개), 2열 배치, "다른작품" 제목 위치, 메인 grid 비율,
  작품 이미지 크기는 변경하지 않음.
- `overflow: hidden` 으로 단순히 가리는 처리는 사용하지 않음.

---

## Supabase / 관리자 페이지 (2026-09-04)

### 1. 설치한 패키지
- `@nuxtjs/supabase` (의존성으로 설치되어 있으나 본 프로젝트에서는 직접 `useSupabaseClient` 패턴 사용)
- `@supabase/supabase-js`

### 2. 생성한 DB 테이블
- `public.projects` — 작품 메타 (slug unique, title, student_name, student_number, category, short_description, description, thumbnail_path, is_published, sort_order, created_at, updated_at)
- `public.project_images` — 작품 이미지 다중 (project_id FK → projects.id ON DELETE CASCADE, storage_path, alt, sort_order, created_at)
- `public.admin_users` — 관리자 매핑 (user_id PK references auth.users(id), created_at)
- `storage.buckets` — `project-images` (public)
- `public.is_admin()` function — RLS 정책과 동일한 기준의 관리자 판별
- `public.set_updated_at()` trigger function — projects.updated_at 자동 갱신

### 3. 생성 / 수정한 파일 목록
**신규**
- `app/types/project.ts` — Project / ProjectImage / ProjectFormInput 등 타입 정의
- `app/composables/useSupabase.ts` — Supabase 클라이언트 (anon / service_role)
- `app/composables/useAdminAuth.ts` — 관리자 로그인 / 권한 판별
- `app/composables/useProjects.ts` — 공개 작품 조회 / 관리자 CRUD / slugify / Storage 업로드 헬퍼
- `app/middleware/admin.global.ts` — /admin/* 라우트 가드
- `app/layouts/admin.vue` — 관리자 페이지 레이아웃 (Header/Footer 유지)
- `app/components/admin/AdminProjectForm.vue` — 작품 등록/수정 폼
- `app/components/admin/AdminProjectImageUploader.vue` — 이미지 업로더 (기존 이미지 관리 / 미리보기 / 삭제)
- `app/pages/admin/login.vue` — 관리자 로그인
- `app/pages/admin/index.vue` — 관리자 대시보드
- `app/pages/admin/projects/index.vue` — 작품 관리 목록 (썸네일/공개상태/수정/삭제)
- `app/pages/admin/projects/new.vue` — 작품 등록
- `app/pages/admin/projects/[id].vue` — 작품 수정
- `supabase/migrations/001_initial_schema.sql` — 전체 스키마 + RLS + Storage 정책
- `supabase/seed.sql` — 기존 mock 작품 12건의 seed
- `.env.example`

**수정**
- `nuxt.config.ts` — `runtimeConfig.public.supabaseUrl/anonKey`, `runtimeConfig.supabaseServiceRoleKey` 추가
- `app/pages/projects/index.vue` — 하드코딩 배열 → Supabase 조회 (`is_published=true` 만)
- `app/pages/projects/[id].vue` — slug 기반 상세 조회, 갤러리는 `project_images` 첫 4장 사용, "다른작품"은 공개 작품 중 현재 id 제외 N개. **Tablet 다른작품 overflow 수정 CSS는 그대로 유지됨.**
- `package.json` — supabase 관련 의존성 추가

### 4. `.env` 에 넣어야 할 값
```
NUXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```
- `.env.example` 파일을 참고하세요.
- `SUPABASE_SERVICE_ROLE_KEY` 는 절대 클라이언트 코드에 노출되지 않습니다.

### 5. Supabase SQL 실행 순서
1. `supabase/migrations/001_initial_schema.sql` 전체를 Supabase Dashboard → SQL Editor 에서 실행
   → `projects`, `project_images`, `admin_users` 테이블, RLS 정책, `is_admin()` 함수, `project-images` Storage 버킷, Storage 정책이 한 번에 생성됨
2. (선택) 초기 mock 작품을 그대로 옮기고 싶다면 `supabase/seed.sql` 실행
   → 이미 `ON CONFLICT (slug) DO NOTHING` 으로 안전 처리됨

### 6. Storage bucket 설정
- 마이그레이션이 자동으로 `project-images` bucket 을 생성합니다 (public).
- 정책:
  - `SELECT` : anon + authenticated 모두 가능 (공개 작품 이미지이므로)
  - `INSERT / UPDATE / DELETE` : `authenticated` + `public.is_admin() = true` 만 가능

### 7. 최초 관리자 만드는 방법
1. Supabase Dashboard → Authentication → Users → "Add user" → 이메일/비밀번호로 사용자 생성
2. 생성된 사용자의 `User UID` 복사
3. SQL Editor 에서 아래 실행:
   ```sql
   INSERT INTO public.admin_users (user_id)
   VALUES ('복사한-USER-UUID');
   ```
4. 그 계정으로 `/admin/login` 에서 로그인

### 8. 테스트 방법
1. 관리자:
   - `/admin/login` → 이메일/비밀번호 로그인 → `/admin/projects` 자동 이동
   - "작품 등록" 버튼 → 폼 입력 → 썸네일/이미지 업로드 → 공개 체크 → 저장
   - 목록에서 "수정" / "삭제" (삭제 시 확인 모달)
2. 공개 사이트:
   - `/projects` → 공개 처리된 작품만 카드 노출
   - 카드 클릭 → `/projects/<slug>` 상세
   - 상세의 "다른작품" → 현재 작품 제외 + 공개된 다른 작품 N개 (기본 2개)
3. 비공개 작품은 `/projects` 카드 / 상세 접근 모두 불가 (RLS 가 막음)
4. 반응형 검증: 1440 / 1024 / 912 / 768 / 430 에서 기존 UI 그대로인지 확인

### 9. 사용자가 직접 해야 하는 작업
- Supabase 프로젝트 생성
- `.env` 값 채우기
- SQL Editor 에서 `001_initial_schema.sql` 실행
- (선택) `seed.sql` 실행
- 첫 관리자 계정 생성 후 `admin_users` 에 UUID 등록
- 작품 데이터는 관리자 페이지 (`/admin/projects`) 에서 직접 등록
- Storage 의 작품 이미지는 `project-images/<project-id>/gallery/...` 경로로 업로드됨 (관리자 페이지에서 자동 처리)

---

## 작품 폼 단순화 + 자동 썸네일 (2026-09-05)

### 변경 요약
관리자 작품 폼을 **학생 이름 / 작품명 / 카테고리 / 설명** 4개 필드와 작품 이미지만 받도록 단순화.
썸네일 업로드 단계는 제거하고, **첫 번째 작품 이미지가 자동으로 썸네일**이 됨.

### 폼 변경 (AdminProjectForm)
관리자 입력 필드:
- 작품명 *
- 학생 이름 *
- 카테고리
- 설명
- 작품 이미지 * (1장 이상, 첫 번째가 썸네일)
- 공개 여부

자동 처리 (관리자에게 노출 안 됨):
- **slug** — 작품명 변경 시 `slugify()` 로 자동 동기화
- **thumbnail_path** — 첫 번째 업로드 이미지의 storage_path 가 자동 저장
- **sort_order / student_number / short_description** — DB 컬럼은 유지, 폼에서는 입력 받지 않음

### CRUD 변경 (useAdminProjects)
- `create(form, galleryImages: File[])` — `thumbnail` 인자 제거
- `update(id, form, newGalleryImages, keepImageIds)` — `newThumbnail` 인자 제거
- 작품 등록 시 **이미지 1장 이상 필수** 검증 추가
- 작품 수정 시 thumbnail_path 는 "남은 기존 이미지 중 첫 번째 → 새 이미지 중 첫 번째" 순으로 결정
- 작품 삭제 시 thumbnail_path 가 첫 번째 이미지와 중복될 수 있어 Storage remove 시 중복 자동 처리

### 공개/관리자 썸네일 fallback
DB 의 `thumbnail_path` 가 비어있거나 누락된 경우, **첫 번째 gallery image 의 경로**를 자동으로 사용하도록 fallback 헬퍼 적용:
- `usePublicProject.heroThumbnailUrl()` — 작품 상세 hero
- `/admin/projects` 목록 썸네일
- `/projects` 공개 카드 썸네일
- "다른작품" 카드 썸네일

### seed.sql 변경
기존 mock 데이터가 외부에 노출되던 작품이므로 `is_published = true` 로 시작하도록 변경.
이미지는 seed 로 자동 생성하지 않고, 관리자 페이지에서 작품별로 업로드.

### 영향 범위
- `/admin/projects/new`, `/admin/projects/[id]` : 폼 단순화 반영
- `AdminProjectForm.vue` : 필드 축소 + slug 자동생성 + 썸네일 영역 제거
- `useProjects.ts` : create/update 시그니처 변경, `resolveThumbnailPath` 헬퍼 추가, `PublicProjectSummary`/`OtherProjectSummary` 타입에 `fallback_thumbnail_path` 추가
- `types/project.ts` : 주석 업데이트
- `supabase/seed.sql` : is_published true 로 시작

기존 디자인 / 다른작품 영역 / 반응형 CSS / 작품 상세 레이아웃은 변경하지 않음.

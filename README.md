<<<<<<< HEAD
# TuThien.vn

Nen tang website tu thien xay bang Next.js + Supabase.

## Tinh nang hien tai

1. Homepage + campaign list + campaign detail.
2. Form quyen gop (`/api/donations`).
3. Trang minh bach tai chinh.
4. Trang quan tri (yeu cau dang nhap).
5. Auth day du co ban:
   - Dang ky: `/dang-ky`
   - Dang nhap: `/dang-nhap`
   - Tai khoan: `/tai-khoan`
   - Dang xuat
6. Fallback mock data neu chua cau hinh Supabase.

## Cong nghe

1. Next.js 15 + TypeScript
2. Tailwind CSS 3
3. Supabase JS SDK + `@supabase/ssr`

## Cai dat local

1. Cai dependency:

```bash
npm install
```

2. Tao env:

```bash
cp .env.example .env.local
```

3. Dien gia tri:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

4. Chay app:

```bash
npm run dev
```

5. Truy cap `http://localhost:3000`.

## CSDL Supabase

1. SQL schema: `supabase/schema.sql`
2. Chay schema trong Supabase SQL Editor.
3. Bat Email Auth trong Supabase Auth settings neu muon dang ky xac thuc email.

## Tai lieu Seminar 1

1. Tai lieu day du yeu cau: `docs/Seminar1-NT208.md`
2. Outline slide: `docs/Seminar1-Slide-Outline.md`

## Cau truc quan trong

1. `src/app/page.tsx` - Trang chu
2. `src/app/chien-dich/page.tsx` - Danh sach chien dich
3. `src/app/chien-dich/[slug]/page.tsx` - Chi tiet chien dich
4. `src/app/quyen-gop/page.tsx` - Form quyen gop
5. `src/app/minh-bach/page.tsx` - Bao cao minh bach
6. `src/app/quan-tri/page.tsx` - Dashboard admin (auth required)
7. `src/app/dang-ky/page.tsx`, `src/app/dang-nhap/page.tsx`, `src/app/tai-khoan/page.tsx` - Auth + account
8. `src/lib/supabase/*` - Supabase clients (server/client/auth)

## Luu y production

1. Nen nang Node.js len 20+ (Supabase da canh bao Node 18 se deprecated).
2. Tach role admin/member bang `profiles.role`.
3. Kich hoat payment gateway that trong phase tiep theo.
=======
# TuThien
>>>>>>> 4df4ab356419b6fd4bf25b3388e1742690bb905d

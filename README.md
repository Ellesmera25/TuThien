# TuThien.vn - Dac ta repository

README nay la dac ta song cua repo. Moi lan sua code, schema, cau hinh, route, luong nghiep vu, env, build hoac hanh vi hien thi trong repo thi phai cap nhat README trong cung lan sua.

## 1. Tong quan

TuThien.vn la nen tang gay quy thien nguyen minh bach, tap trung vao:

- hien thi chien dich gay quy va tien do huy dong;
- tao QR Sepay de quyen gop;
- xac minh webhook thanh toan va ghi donation vao chuoi hash noi bo;
- cong khai bang minh bach donation/disbursement;
- tao va xem reels tac dong cho tung chien dich;
- phan quyen donor, nguoi tao du an, don vi dong hanh va admin;
- quan ly de xuat vai tro, chien dich, don vi dong hanh va giai ngan;
- PWA web app va Android wrapper bang Capacitor.

Repo hien la ung dung Next.js App Router, dung Supabase cho Auth, Postgres, Realtime va Storage. Android project trong `android/` boc website/web app bang Capacitor.

## 2. Stack va lenh chay

### Cong nghe chinh

- Next.js `^16.2.6`, React `19.2.3`, TypeScript strict mode.
- Tailwind CSS `^3.4.17`.
- Supabase JS `^2.57.4` va `@supabase/ssr`.
- `node-forge` dung de doc CMS/PKCS#7 trong chu ky so nhung trong PDF hoa don do.
- Capacitor `^8.3.2` cho Android.
- ESLint flat config voi `eslint-config-next`.

### Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run cap:sync
npm run cap:open
npm run apk:debug
```

`apk:debug` sync Capacitor roi goi `android/gradlew.bat assembleDebug`.

### Git line endings

Repo co `.gitattributes` ep file text checkout bang CRLF. Binary asset nhu anh, PDF, APK, JAR va file ky khoa duoc danh dau `binary` de Git khong doi line ending.

## 3. Bien moi truong

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`: URL public cua Supabase project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key dung cho client/browser va server public client.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key dung trong API/server actions de insert/update doc lap RLS.

Neu thieu public env, Auth va nhieu man hinh tra ve trang thai chua cau hinh. Neu thieu service role, cac route tao donation/campaign/reel/support hoac dashboard co the tra loi loi 503 hoac demo mode.

### Sepay

- `SEPAY_BANK_ID`: ma ngan hang nhan tien.
- `SEPAY_ACCOUNT_NO`: so tai khoan nhan tien.
- `SEPAY_ACCOUNT_NAME`: ten chu tai khoan.
- `SEPAY_QR_BASE_URL`: tuy chon, mac dinh `https://qr.sepay.vn/img`.
- `SEPAY_WEBHOOK_SECRET`: tuy chon, dung de kiem tra header secret hoac HMAC SHA-256.

Neu thieu cau hinh Sepay nhung van co Supabase, donation van duoc tao, QR fallback/hoac QR tu cau hinh hien co se duoc tra ve tuy route. Neu thieu Supabase service role, `/api/donations` tra ve QR demo.

### Mobile app links

- `NEXT_PUBLIC_ANDROID_APK_URL`: URL file APK cho trang `/ung-dung`, mac dinh `/tuthien-app.apk`.
- `NEXT_PUBLIC_PLAY_STORE_URL`: hien duoc doc trong helper nhung UI hien tai chua dung.
- `CAPACITOR_SERVER_URL`: URL website de Android wrapper load, mac dinh `https://tu-thien.vercel.app`.

## 4. Cau truc thu muc

```text
src/app/                 Next.js App Router pages va API routes
src/components/          UI components va client forms
src/lib/                 helper Supabase, data mapping, Sepay, format, security
supabase/schema.sql      schema nen va RLS co san trong repo
supabase/migrations/     migration bo sung flow reels, partner, giai ngan
public/                  PWA manifest, service worker, icon va shell HTML
android/                 Capacitor Android project
docs/                    tai lieu seminar va outline slide
```

Thu muc `node_modules`, `.next`, `.git`, build outputs va binary asset Android khong phai nguon dac ta logic.

## 5. Vai tro nguoi dung

Role duoc luu trong bang `profiles.role`:

- `donor`: mac dinh sau dang ky, co the donate, tao reel, gui yeu cau nang vai tro mot lan duy nhat.
- `project_owner`: tao chien dich moi, xem chien dich cua minh, duyet/tuchoi don vi dong hanh, duyet yeu cau giai ngan cua doi tac.
- `partner_org`: dang ky dong hanh chien dich, gui yeu cau giai ngan, nop chung tu sau giai ngan.
- `admin`: truy cap `/quan-tri`, duyet role request, duyet chien dich, duyet giai ngan/chung tu.

Quyen server duoc xac dinh trong `src/lib/supabase/auth-server.ts`.

## 6. Route giao dien

| Route | Muc dich | Ghi chu quyen |
| --- | --- | --- |
| `/` | Trang chu, KPI tong quan, campaign noi bat, reels noi bat, quy trinh doi soat | Public |
| `/chien-dich` | Danh sach campaign published va active, loc category/status, phan trang bang query `page` | Public |
| `/chien-dich/[slug]` | Chi tiet campaign, tien do huy dong, tien do giai ngan, don vi dong hanh, nhat ky giai ngan | Public, chi doc campaign published/active |
| `/chien-dich/tao` | Form tao du an moi | Can login va role `project_owner` |
| `/chien-dich/ho-tro` | Form don vi dong hanh chon campaign/round | Can login va role `partner_org` |
| `/quyen-gop` | Form tao donation Sepay QR, co query `campaign` | Public, user dang nhap se duoc prefill |
| `/minh-bach` | Bang donation chain va disbursement log | Public view, doc bang qua server/service client |
| `/reels` | Feed video doc 9:16, like/comment/follow/share/donate | Public xem, login de tuong tac |
| `/reels/tao` | Upload video va tao reel | Can login |
| `/dang-nhap` | Dang nhap Supabase email/password | Public |
| `/dang-ky` | Dang ky Supabase va tao profile donor | Public |
| `/tai-khoan` | Profile va cac module tai khoan tach bang query `view`: `role-request`, `reels`, `donations`, `my-campaigns`, `my-support-offers`, `owner-support-offers`, `owner-disbursements`, `partner-disbursements`; moi view chi tai du lieu lien quan | Can login |
| `/quan-tri` | Admin dashboard tach module bang query `view`: `campaigns`, `pending-campaigns`, `support-offers`, `disbursements`, `role-requests`; moi view co search/filter/pagination rieng khi can | Can role `admin` |
| `/ung-dung` | Trang tai APK Android | Public |

## 7. API routes

| API | Method | Muc dich | Quyen/kiem tra |
| --- | --- | --- | --- |
| `/api/donations` | `POST` | Tao donation pending, sinh `TUTHIEN-XXXXXXXX`, QR content va URL QR | Same-origin, payload hop le, amount >= 10.000, campaign neu co phai published/active |
| `/api/donations/status` | `GET` | Tra trang thai donation theo `paymentReference` | Can service role configured |
| `/api/sepay/webhook` | `POST` | Nhan webhook Sepay, xac minh signature, confirm donation, update campaign raised amount, insert donation_blockchain | Kiem tra secret/HMAC neu co `SEPAY_WEBHOOK_SECRET` |
| `/api/campaigns` | `POST` | Tao campaign pending va luu image metadata | Same-origin, login, role `project_owner`, 1-8 image path hop le |
| `/api/support-offers` | `POST` | Partner gui de xuat dong hanh cho disbursement round | Same-origin, login, role `partner_org`, campaign published active/paused, khong phai owner |
| `/api/invoice-signatures/extract` | `POST` | Doc file PDF hoa don do, trich xuat thong tin chu ky so nhung trong PDF de hien thi truoc khi upload | Same-origin, login, file PDF <= 20MB |
| `/api/role-requests` | `POST` | Gui yeu cau nang role mot lan duy nhat moi tai khoan | Same-origin, login, proof path hop le, cam ket minh bach |
| `/api/reels` | `POST` | Upload video vao bucket `reel-videos` va tao row `reels` | Same-origin, login, Supabase service role, campaign published |
| `/api/reels/[id]/like` | `POST` | Toggle like reel, `id` la reel UUID | Same-origin, login |
| `/api/reels/[id]/comments` | `GET` | Lay 20 comment moi nhat, `id` la reel UUID | Public neu Supabase configured |
| `/api/reels/[id]/comments` | `POST` | Tao comment 2-180 ky tu, `id` la reel UUID | Same-origin, login |
| `/api/reels/[id]/follow` | `POST` | Toggle follow campaign, `id` la campaign slug; dung chung segment `[id]` de Next dev khong xung dot dynamic route | Same-origin, login |
| `/api/check-db` | `GET` | Health check env va bang Supabase | Chi tra ket qua khi `NODE_ENV !== "production"` |

Tat ca mutation web quan trong dung `isSameOriginMutation()` de chan origin/referer khac origin.

## 8. Luong nghiep vu chinh

### Dang ky va dang nhap

1. User dang ky bang email/password va `full_name`.
2. Client goi Supabase Auth sign up.
3. Profile donor duoc upsert o client va co trigger SQL `handle_new_user()` lam lop du phong.
4. Dang nhap dung Supabase SSR cookie ten `tuthien-auth`.

### Donation Sepay

1. User nhap ten, email, amount, campaign tuy chon va message.
2. `/api/donations` tao donation `pending`, payment reference `TUTHIEN-XXXXXXXX`, payment content `TU THIEN TUTHIEN-XXXXXXXX`.
3. UI hien QR modal, dem nguoc 5 phut va subscribe Realtime bang `payment_reference`.
4. Sepay webhook goi `/api/sepay/webhook`.
5. Webhook tim reference trong payload, xac nhan donation thanh `confirmed`, luu transaction id/payload, cong `campaigns.raised_amount` neu donation gan campaign.
6. Webhook tao record `donation_blockchain` bang SHA-256 voi previous hash la block truoc do hoac genesis hash.

### Donation chain

`src/lib/blockchain.ts` tao hash:

```text
SHA256(paymentReference | amount | email | donorName | timestamp | previousHash)
```

Trang `/minh-bach` doc `donation_blockchain` theo server-side pagination bang query `chainPage`, moi trang toi da 20 block, va ghep `donations` de hien block number, Sepay ref, transaction id, hash va previous hash. Donate chain dung card ledger tren mobile va bang navy-trang tren desktop de de doi soat, tranh render/tai toan bo chain khi du lieu tang lon.

### Campaign creation va approval

1. Donor gui role request len `project_owner`; moi tai khoan chi duoc gui role request mot lan, API tu choi moi request tiep theo neu da co ho so.
2. Admin duyet role request, profile chuyen sang `project_owner`.
3. Project owner upload 1-8 anh len bucket `campaign-assets` bang client Supabase.
4. `/api/campaigns` tao row `campaigns` voi `review_status = pending`, `status = paused`, va tao `campaign_images`.
5. Admin duyet campaign trong `/quan-tri`, campaign thanh `review_status = published`.
6. Khi duyet, admin tao/quan ly `disbursement_rounds` theo ty le va so tien du kien.

### Partner va giai ngan

1. Donor gui role request `partner_org`, bat buoc co thong tin ngan hang nhan giai ngan.
2. Admin duyet, profile luu thong tin ngan hang.
3. Partner vao `/chien-dich/ho-tro`, chon campaign published active/paused va round chua bi khoa boi doi tac khac.
4. `/api/support-offers` tao `support_offers.status = pending`.
5. Project owner duyet hoac tu choi support offer trong `/tai-khoan?view=owner-support-offers`.
6. Partner gui yeu cau giai ngan tren round `open` tai `/tai-khoan?view=partner-disbursements`, co `requested_amount` va note.
7. Project owner duyet round `requested` sang `owner_approved` trong `/tai-khoan?view=owner-disbursements`.
8. Admin duyet/giai ngan trong `/quan-tri?view=disbursements`, co QR chuyen khoan VietQR neu tim duoc bank BIN tu `https://api.vietqr.io/v2/banks`.
9. Sau khi disbursed, partner upload hoa don do PDF trong `/tai-khoan?view=partner-disbursements` vao bucket `campaign-assets`; client goi `/api/invoice-signatures/extract` de doc chu ky so trong PDF, hien nguoi ky/ngay ky/chung thu truoc khi nop.
10. Server action tai `/tai-khoan` chi chap nhan storage path noi bo nam duoi folder user hien tai, tai PDF tu bucket, trich xuat lai chu ky so tren server, sua mojibake UTF-8 tu chung thu neu co, luu `proof_url`, `proof_note` va cac cot `invoice_signature_*` vao `disbursement_rounds`. Metadata chi luu nguoi ky, to chuc, ma so/ dinh danh, ngay ky, serial va thoi han chung thu; khong luu subject/issuer tho.
11. Admin xem hoa don do bang signed URL rieng va thay thong tin nguoi ky/ngay ky/chung thu trong `/quan-tri?view=disbursements`; admin duyet chung tu thanh `proof_status = approved` hoac danh dau qua han.

### Reels

1. User login tao reel, chon campaign, upload video toi da 100MB.
2. `/api/reels` dam bao bucket `reel-videos` public, upload video, tao public URL va insert row `reels`.
3. Feed `/reels` auto play bang IntersectionObserver, co fallback cover neu video loi.
4. Like/comment/follow ghi vao `reel_likes`, `reel_comments`, `campaign_follows`.
5. Counter likes/comments duoc cap nhat boi trigger SQL va API cung sync lai so dem.

## 9. Du lieu va Supabase

### Bang co trong `supabase/schema.sql`

- `campaigns`: campaign public voi `slug`, `title`, `summary`, `target_amount`, `raised_amount`, `status`, `end_date`, `cover_tag`, `created_at`.
- `donations`: donation, Sepay metadata, webhook payload, blockchain hash, status `pending/confirmed/failed`.
- `donation_blockchain`: chuoi hash donation, unique theo `donation_id` va `payment_reference`.
- `disbursements`: nhat ky chi tieu cong khai theo `campaign_slug`.
- `reels`: reel metadata, video URL, counters va `cover_tone`.
- `profiles`: profile user va role.
- `disbursement_rounds`: chi duoc tao trong `schema.sql` neu `support_offers` va `campaign_phases` da ton tai; co cac cot `invoice_signature_*` de luu metadata chu ky so cua hoa don do PDF.

### Bang code dang phu thuoc

Code hien dang doc/ghi cac bang sau, nhung repo hien tai khong co migration tao moi day du cho tat ca:

- `role_requests`
- `campaign_images`
- `campaign_phases`
- `support_offers`
- `disbursement_rounds`
- `reel_likes`
- `reel_comments`
- `campaign_follows`

Trong do `reel_likes`, `reel_comments`, `campaign_follows` co migration tao bang. `role_requests`, `campaign_images`, `campaign_phases`, `support_offers` duoc app dung nhieu nhung trong `supabase/` hien chi thay migration `alter`/tham chieu, chua thay file `create table` tu dau. Khi setup moi Supabase project, can bo sung migration tao cac bang nay truoc khi dung flow role/campaign/partner.

### Index hieu nang

- Migration `20260623002000_query_performance_indexes.sql` bo sung index co muc tieu cho cac query load cham tren `/tai-khoan`, `/quan-tri`, `/minh-bach` va donation/reels.
- Cac bang nen duoc index them theo filter/order thuc te: `campaigns(created_at/status)`, `donations(status, created_at)`, `donation_blockchain(email, created_at)`, `disbursements(campaign_slug, spent_at)` va `reels(user_id, created_at)`.
- Cac bang nghiep vu co the chua ton tai trong schema local duoc index bang guard table/column: `role_requests`, `campaign_images`, `campaign_phases`, `support_offers`, `disbursement_rounds`. Cac index nay tap trung vao `owner_id`, `partner_id`, `campaign_id`, `status`, `review_status`, `round_number`, `created_at`, `proof_due_at`.
- Khong nen danh index tran lan moi cot: index tang toc doc/loc/sap xep nhung lam insert/update cham hon va ton dung luong. Neu `/minh-bach` van cham khi blockchain rat lon, diem tiep theo can toi uu la `count: "exact"` bang cached counter hoac estimated count.

### Storage buckets

- `reel-videos`: bucket public cho video reels, toi da 100MB, MIME mp4/webm/quicktime/x-m4v.
- `campaign-assets`: bucket private cho anh campaign, minh chung support/campaign va hoa don do PDF; migration `20260623001000_invoice_pdf_signature_metadata.sql` tao/cap nhat bucket, cho MIME image/png, image/jpeg, image/webp, application/pdf, toi da 20MB, owner upload/update/delete theo folder user id.
- `role-proofs`: code dung de upload tai lieu minh chung role request, nhung repo hien chua co migration tao bucket nay.

## 10. Validation quan trong

- Donation: amount toi thieu 10.000 VND, payment method phai la `sepay_qr`, email hop le.
- Campaign: title/summary/endDate bat buoc, targetAmount >= 1.000, 1-8 anh, moi anh toi da 5MB, PNG/JPG/JPEG/WEBP.
- Role request: proof file bat buoc, PNG/JPG/JPEG/PDF, toi da 5MB; partner bat buoc co bank name, account number, account holder.
- Support offer: campaign va disbursement round bat buoc; estimatedValue >= 0 neu co; proof anh/PDF toi da 20MB tren client.
- Hoa don do sau giai ngan: partner phai chon PDF <= 20MB co chu ky so nhung; client hien metadata chu ky truoc khi upload, server chi chap nhan storage path cua user hien tai, trich xuat lai va luu vao `disbursement_rounds`.
- Reel: title 4-120 ky tu, caption 8-800 ky tu, creator 2-120, location 2-160, video toi da 100MB, tone `warm/cool/mint/violet`.
- Comment reel: API chap nhan 2-180 ky tu, migration SQL dang check 2-300 ky tu.

## 11. UI, PWA va mobile

### UI

- Font: Plus Jakarta Sans, Space Grotesk, IBM Plex Mono.
- Mau chinh: navy `#0b1f3a` tren nen trang/slate sang; accent xanh `#2563eb` chi dung cho diem nhan can nhan biet.
- Quy uoc hinh khoi: panel, card, badge, nut bam va cac utility `rounded-*` duoc chuan hoa ve goc vuong trong `src/app/globals.css` de tao cam giac nghiem tuc, minh bach.
- Tailwind theme duoc mo rong trong `tailwind.config.ts`.
- Global utility classes: `neo-panel`, `neo-panel-strong`, `neo-badge`, `neo-btn`, `surface-card`, `soft-band`.
- Header hien cac nut chuc nang theo role ben canh nav chinh: admin thay `Quan tri`, project owner thay `Tao du an`, partner_org thay `Dong hanh du an`.
- Trang `/tai-khoan` co luoi navi nghiep vu bang query `view`. Donor thay tong quan, yeu cau vai tro, lich su dong gop, reels; `project_owner` co them tao/xem du an, don vi dong hanh can duyet, dot giai ngan; `partner_org` co them dang ky dong hanh va hoa don/chung tu. Moi module chi fetch/render du lieu cua view dang mo de tranh trang tai khoan qua dai.
- Trang `/quan-tri` co luoi navi module bang query `view` cho tong quan, tat ca du an, du an cho duyet, dang ky dong hanh, giai ngan/chung tu va yeu cau vai tro; admin chi tai dataset cua module dang xem de giam lag khi du lieu tang.
- `AdminListController` la client component dung chung cho search, status filter va campaign/approval filter tren cac list van hanh; co `showPagination=false` khi list da duoc phan trang bang query/server.

### PWA

- `public/manifest.webmanifest` khai bao app standalone, portrait, icon SVG va `theme_color` navy.
- `src/components/pwa-register.tsx` dang ky `/sw.js`.
- Service worker cache cac route: `/`, `/chien-dich`, `/minh-bach`, `/quyen-gop`, `/reels`, manifest va icon.

### Android

- `capacitor.config.ts`: `appId = vn.tuthien.app`, `appName = TuThien.vn`, `webDir = public`, server URL mac dinh `https://tu-thien.vercel.app`.
- Android namespace/applicationId: `vn.tuthien.app`.
- minSdk 24, compileSdk 36, targetSdk 36.
- Java source/target compatibility 21 trong `android/app/capacitor.build.gradle`.
- App chi xin permission `android.permission.INTERNET`.
- `DEPLOYMENT_GUIDE.md` co huong dan build APK/Google Play, nhung noi dung tieng Viet trong file do hien bi mojibake encoding.

## 12. Bao mat va RLS

- Security headers duoc set trong `next.config.ts`: nosniff, DENY frame, referrer policy, HSTS, permissions policy.
- Cac mutation API kiem tra same-origin.
- Supabase service role chi duoc tao o server helper `getSupabaseServiceClient()`.
- RLS bat cho cac bang nen trong `schema.sql`.
- Donation chi readable boi owner qua RLS, donation blockchain readable cho authenticated.
- Public pages van co the doc nhieu du lieu bang service client server-side de hien minh bach.
- Storage policy cho `reel-videos` chi cho owner upload/update/delete theo folder user id, public read.
- Storage policy cho `campaign-assets` chi cho authenticated owner upload/update/delete theo folder user id; file duoc doc qua signed URL server tao.

## 13. Kiem thu hien co

- Chua co test tu dong cho Next.js/API.
- Android co test mau do Capacitor sinh:
  - unit test `addition_isCorrect`;
  - instrumented test dang assert package `com.getcapacitor.app`, khong khop applicationId hien tai `vn.tuthien.app`.
- Lenh kiem tra nen chay truoc khi giao code: `npm run lint`, `npm run build`.

## 14. Tai lieu phu

- `docs/Seminar1-NT208.md`: tai lieu phan tich use case, kien truc, DFD/UML va MVP cho seminar.
- `docs/Seminar1-Slide-Outline.md`: outline 6 slide thuyet trinh.
- `CONTRIBUTING.md`: guideline rieng cho thay doi text tieng Anh.
- `DEPLOYMENT_GUIDE.md`: huong dan APK/Google Play, can sua encoding neu tiep tuc dung.

## 15. Rui ro va viec can bo sung

- Can bo sung migration tao `role_requests`, `campaign_images`, `campaign_phases`, `support_offers` va bucket `role-proofs` de setup Supabase moi chay tron ven.
- Can dong bo `schema.sql` voi tat ca migration moi nhat.
- Can sua encoding cac file/tai lieu bi mojibake neu muon dung lam tai lieu chinh thuc.
- Can them test cho API payment webhook, campaign approval, support offer, disbursement va reel interaction.
- Can cap nhat Android instrumented test package name tu `com.getcapacitor.app` sang `vn.tuthien.app`.

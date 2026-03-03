# Seminar 1 Slide Outline - TuThien.vn

## Slide 1 - Gioi thieu de tai va van de

1. Van de:
   - Gay quy online nhieu nhung thieu minh bach.
   - Nguoi dung de mat niem tin.
2. Muc tieu:
   - Tao nen tang gay quy minh bach, de dung.

## Slide 2 - Nguoi dung va USP

1. Nhom nguoi dung: Guest, Member, Admin.
2. Use-case core: xem chien dich, quyen gop, theo doi sao ke.
3. USP:
   - Transparency-first UX.
   - Live donation feed.
   - Tai khoan thanh vien + lich su dong gop.

## Slide 3 - Kien truc he thong

1. Frontend Next.js.
2. API Routes + Server Components.
3. Supabase Auth + Postgres.
4. RLS + profile role.

## Slide 4 - Database va luong du lieu

1. ERD: campaigns, donations, disbursements, profiles.
2. DFD: browse -> donate -> report.
3. Sequence: submit donation -> API -> DB -> response.

## Slide 5 - Demo MVP (quan trong nhat)

1. Demo route:
   - `/`
   - `/chien-dich`
   - `/quyen-gop`
   - `/minh-bach`
   - `/dang-ky`, `/dang-nhap`, `/tai-khoan`
   - `/quan-tri`
2. Demo luong core:
   - Dang ky -> dang nhap -> quyen gop -> xem minh bach.

## Slide 6 - Ke hoach seminar tiep theo

1. Payment gateway that (VNPAY/MoMo).
2. Admin workflow duyet giao dich.
3. Report chart nang cao + anomaly.
4. Audit log va permission role chi tiet.

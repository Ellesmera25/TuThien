# Hướng dẫn Phát hành APK & Google Play

## **PHẦN 1: Chuẩn bị APK**

### Bước 1: Build Signed APK trong Android Studio

1. Mở **Android Studio**
2. Chọn **Build → Generate Signed Bundle / APK**
3. Chọn **APK** → **Next**
4. **Create new...** keystore (hoặc dùng cũ nếu có):
   - **Key store path**: Chọn nơi lưu (nhớ path này!)
   - **Password**: Tạo password mạnh
   - **Key alias**: `tuthien-app`
   - **Key password**: Tạo password mạnh
   - **Validity**: 30 năm
   - Click **OK**
5. Chọn **Release** build type
6. Click **Finish**

### Bước 2: Tìm file APK

Sau khi build xong, APK sẽ ở:
```
android/app/release/app-release.apk
```

**Lưu ý:** Giữ keystore file an toàn! Nó cần cho mọi bản cập nhật trên Play Store.

---

## **PHẦN 2: Upload APK lên Vercel**

### Bước 1: Copy APK vào thư mục public

```bash
# Từ thư mục repo
copy android/app/release/app-release.apk public/tuthien-app.apk
```

### Bước 2: Cập nhật .env.production

```bash
NEXT_PUBLIC_ANDROID_APK_URL=https://tu-thien.vercel.app/tuthien-app.apk
```

### Bước 3: Deploy lên Vercel

```bash
git add .
git commit -m "Add APK download link"
git push
```

Vercel sẽ tự deploy. Trang `/ung-dung` sẽ hiện nút **"Tải APK"**.

---

## **PHẦN 3: Đăng lên Google Play Store**

### Bước 1: Tạo Google Play Developer Account

1. Truy cập **Google Play Console**: https://play.google.com/console
2. Đăng ký → Thanh toán **$25 USD** (một lần)
3. Chờ duyệt (thường 2-3 giờ)

### Bước 2: Tạo ứng dụng mới

1. Click **Create app**
2. **App name**: `TuThien.vn`
3. **Default language**: Vietnamese
4. **App or game**: Chọn **App**
5. **Free or paid**: Chọn **Free**
6. Click **Create app**

### Bước 3: Điền thông tin ứng dụng

#### **Store listing** (Cần trước khi upload APK):

- **Title**: `TuThien.vn`
- **Short description**: 
  ```
  Nền tảng từ thiện minh bạch - theo dõi từng khoản đóng góp
  ```
- **Full description**:
  ```
  TuThien.vn là cổng quyên góp online với đầy đủ minh bạch:
  - Xem tiến độ chiến dịch real-time
  - Theo dõi từng khoản tiền quyên góp
  - Quyên góp nhanh qua QR Sepay
  - Báo cáo tài chính công khai
  ```
- **Screenshots**: Chụp 4-5 ảnh app chạy
- **Feature graphic**: Thiết kế hình 1024x500px
- **Icon**: App icon (512x512px)
- **Content rating**: Điền questionnaire → nhận rating

#### **Target audience & content rating**:
- Điền form → Submit

#### **Release management**:
- Skip for now, sau upload APK sẽ quay lại

### Bước 4: Upload APK

1. Truy cập **Testing → Internal testing** (nhanh hơn để test trước)
2. Click **Create new release**
3. Upload file `app-release.apk`
4. Thêm **Release notes**:
   ```
   Phiên bản đầu tiên
   - Quyên góp với QR code
   - Theo dõi chiến dịch
   - Minh bạch từng khoản
   ```
5. Click **Save** → **Review release**

### Bước 5: Kiểm tra và phê duyệt

- Chờ Play Store scan APK (~10-15 phút)
- Xem kết quả ở **Policy & programs**
- Nếu có lỗi, xử lý → Upload lại

### Bước 6: Phát hành chính thức

1. Quay lại **Release management → Production**
2. Click **Create new release**
3. Chọn APK đã kiểm tra từ Internal testing
4. Thêm release notes
5. Click **Save** → **Review release** → **Rollout to Production**

### Bước 7: Chờ phê duyệt

- Google sẽ review (thường **24-48 giờ**)
- Sau đó app sẽ hiển thị trên Play Store

---

## **PHẦN 4: Cập nhật lần tới**

Mỗi lần cần cập nhật app:

1. **Tăng version** ở `android/app/build.gradle`:
   ```gradle
   versionCode 2  // Tăng số
   versionName "1.1.0"  // Cập nhật version
   ```

2. **Sync & rebuild**:
   ```bash
   npm run build
   npm run cap:sync
   # Build APK trong Android Studio
   ```

3. **Upload lên Play Store**:
   - **Internal testing** → test
   - **Production** → phát hành

---

## **Ghi chú an toàn**

✅ **Luôn giữ an toàn:**
- Keystore file → Backup riêng, không commit lên git
- Password keystore → Lưu ở nơi an toàn
- Biến `.env.production` → Chỉ set trên Vercel, không commit plaintext

❌ **Không bao giờ:**
- Commit keystore vào git
- Share password keystore
- Đổi keystore giữa chừng (sẽ không cập nhật được Play Store)

---

## **Liên hệ hỗ trợ**

Nếu gặp vấn đề:
- **APK không chạy**: Kiểm tra Logcat trong Android Studio
- **Play Store reject**: Xem policy violation details
- **Version conflict**: Tăng versionCode cao hơn version trước

Xong! 🎉

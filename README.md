# Nhóm 15
## Tỉ lệ đóng góp của các thành viên:
| Tên thành viên | Tên tài khoản github |Tỉ lệ đóng góp |
| --- | --- | --- |
| Hoàng Nhật Huy (Nhóm trưởng) | Ellesmera25 | 32% |
| Trần Anh Hào | iamabighotdog | 29% |
| Nguyễn Phương Phúc Hậu | hifs-tv | 29% |
| Trần Xuân Phước Hoàng | creazol | 10% |
## Source video (demo + khảo sát)
[Videos](https://drive.google.com/drive/folders/12Bpnghr5lxnCfxQyTrt-cJePCRgZBUDj?usp=drive_link) <br>
## Các luồng chính của web
| STT | Luồng chính | Vai trò tham gia | Mô tả hoạt động |
| --- | --- | --- | --- |
| 1 | Đăng ký / đăng nhập | Người dùng | Người dùng tạo tài khoản, mặc định là `donor`. Hệ thống tạo profile trong Supabase. |
| 2 | Yêu cầu vai trò | Donor, Admin | Donor có thể yêu cầu nâng vai trò một lần: `project_owner` là chủ dự án, `partner_org` là đơn vị đồng hành. Admin duyệt thì profile đổi role. |
| 3 | Tạo và duyệt dự án | Chủ dự án, Admin | Chủ dự án tạo campaign, upload ảnh, nhập mục tiêu và ngày kết thúc. Dự án ban đầu chờ duyệt, admin duyệt thì dự án được public. |
| 4 | Quyên góp | Người dùng, Sepay | Người dùng chọn dự án hoặc quỹ chung, nhập số tiền và tạo QR Sepay. Nếu dự án đã hết hạn thì không được quyên góp nữa. Webhook Sepay xác nhận thanh toán, cập nhật số tiền đã nhận và ghi blockchain nội bộ. |
| 5 | Đăng ký đồng hành | Đơn vị đồng hành | Đơn vị đồng hành chọn dự án còn hạn và đợt giải ngân đang mở, sau đó gửi đề xuất đồng hành. Nếu dự án hết hạn thì không gửi được nữa. |
| 6 | Chủ dự án duyệt đơn vị đồng hành | Chủ dự án, Đơn vị đồng hành | Chủ dự án xem các đăng ký đồng hành, duyệt hoặc từ chối. Khi duyệt, đơn vị đó được gắn với đợt/round giải ngân. |
| 7 | Yêu cầu giải ngân | Đơn vị đồng hành, Chủ dự án, Admin | Đơn vị đồng hành gửi yêu cầu giải ngân theo round đã được duyệt. Chủ dự án xác nhận trước, sau đó admin xử lý giải ngân. |
| 8 | Admin giải ngân | Admin, Đơn vị đồng hành | Admin xem yêu cầu đã được chủ dự án duyệt, thấy thông tin đơn vị nhận tiền và QR/chuyển khoản để giải ngân. |
| 9 | Upload hóa đơn đỏ / chứng từ | Đơn vị đồng hành | Sau khi giải ngân, đơn vị đồng hành upload PDF hóa đơn đỏ. Hệ thống trích xuất chữ ký số trong PDF, lấy thông tin người ký, ngày ký, tổ chức, serial chứng thư rồi lưu database. |
| 10 | Minh bạch | Cộng đồng | Trang minh bạch gồm `Donate chain` để xem chuỗi đóng góp/blockchain và `Nhật ký giải ngân` để xem khoản chi, trạng thái hóa đơn đỏ, nút tải hóa đơn nếu có. |
| 11 | Reels tác động | Người dùng | Người dùng tạo reel gắn với campaign; người khác xem, like, comment, follow campaign và có thể đi tới quyên góp. |
| 12 | Quản trị | Admin | Admin có các module riêng: tổng quan, dự án, dự án chờ duyệt, đăng ký đồng hành, giải ngân/chứng từ, yêu cầu vai trò. |

## Chúng em đã biết làm web và hiểu hệ thống web hoạt động như thế nào.

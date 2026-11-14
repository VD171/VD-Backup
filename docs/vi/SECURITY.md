> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Українська](../uk/SECURITY.md) · Tiếng Việt · [中文](../zh/SECURITY.md)

---

# Chính sách bảo mật

VDBackup chạy với quyền root và xử lý dữ liệu của bạn cùng (tùy chọn) thông tin đăng nhập và
cụm mật khẩu mã hóa của bạn. Chúng tôi coi trọng vấn đề bảo mật.

## Báo cáo một lỗ hổng

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Channel:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Hãy kèm theo một mô tả rõ ràng và, nếu có thể, các bước để tái hiện. Chúng tôi sẽ phản hồi
sớm nhất có thể và ghi công bạn nếu bạn muốn.

## Ghi chú về phạm vi

- Thông tin đăng nhập và cụm mật khẩu được lưu trữ ở dạng mã hóa khi nghỉ và không bao giờ được ghi dưới
  dạng văn bản thuần. Các bản backup không bao giờ gắn với các khóa phần cứng gắn liền thiết bị (nên chúng vẫn
  có tính di động), điều này cũng có nghĩa cụm mật khẩu là thứ bảo vệ một bản backup đã mã hóa -
  hãy chọn một cụm mật khẩu mạnh.
- Các thông tin xác thực đó nằm trên bộ nhớ mã hóa bằng thông tin xác thực (`/data/misc_ce`), bị khóa cho đến lần mở khóa đầu tiên sau khi khởi động lại, nên không bao giờ đọc được trước lần mở khóa đó, khác với `/data/adb`. Một bản cập nhật mô-đun chuyển các bản sao cũ sang đó vĩnh viễn (xác minh từng tệp trước khi xóa bản gốc), và chúng vẫn tồn tại qua các lần cài lại.
- Một đích sao lưu cục bộ tự nó phải được mã hóa khi ở trạng thái nghỉ: chỉ cho phép bộ nhớ người dùng trong máy và rời, không bao giờ `/data/adb`, `/data/system` hay các đường dẫn khác đọc được trước lần mở khóa đầu tiên, và không bao giờ là một lần duyệt `..`. SD/USB rời hoàn toàn không được mã hóa khi nghỉ, nên bạn được cảnh báo (không bị chặn) để bật mã hóa sao lưu cho nó.
- Ứng dụng đồng hành Google Drive tùy chọn luôn phải được ẩn bằng [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) để nó không
  làm lộ root hay bootloader đã mở khóa.
- Việc khôi phục chạy với quyền root, nên mọi kho lưu trữ đều được kiểm tra trước khi ghi bất
  cứ thứ gì: một bản backup có nội dung trỏ ra ngoài đích của nó (một đường dẫn tuyệt đối hoặc
  một thành phần `..`) sẽ bị từ chối, và không tệp nào được giải nén cho đến khi toàn bộ kho
  lưu trữ được chấp thuận.
- Mọi tệp nhị phân và thư viện dựng sẵn đều có thể truy vết tới một nguồn thượng nguồn công khai đã ghim
  với một SHA-256 được ghi lại, và bản kê khai được đóng gói trên thiết bị, nên tải trọng đi kèm có thể
  được kiểm toán và tái tạo. Xem [BINARIES.md](BINARIES.md).

<!-- doc-footer -->

---

> _Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Chúng tôi hoan nghênh các chỉnh sửa và cải tiến; xem [CONTRIBUTING.md](CONTRIBUTING.md)._

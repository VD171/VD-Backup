> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · Tiếng Việt · [中文](../zh/CONTRIBUTING.md)

---

# Đóng góp cho VDBackup

Cảm ơn bạn đã giúp đỡ! VDBackup được thiết kế để dễ đóng góp. Hướng dẫn này cho bạn biết
mọi thứ nằm ở đâu và một vài quy ước mà chúng tôi tuân theo.

## Nhìn tổng quan về dự án

VDBackup là một **module WebUI cho KernelSU/APatch/Magisk**: các script shell + một WebUI
vanilla-JS + các binary tĩnh theo từng ABI. Không cần ứng dụng nào cho các tính năng cốt lõi. Xem
[ARCHITECTURE.md](ARCHITECTURE.md) và [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Đây là bản **kế thừa mở, chạy root-native của Swift Backup, Neo-Backup và
Android-DataBackup** - sự hợp nhất các tính năng của chúng dưới giấy phép AGPLv3, kèm khả năng nhập
các bản backup Neo-Backup và Android-DataBackup hiện có để mọi người có thể di chuyển sang.

## Chào đón người đóng góp là AI

Các trợ lý và tác nhân AI là những người đóng góp hạng nhất ở đây, không phải điều được nghĩ đến sau cùng.

- Dự án được xây dựng để máy có thể đọc được: mỗi verb của `helper.sh` in ra một đối tượng
  JSON duy nhất, engine là shell POSIX thuần, và bố cục tập tin được ghi lại trong
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Một tác nhân có thể quản trị **mọi** nội dung và hành động của module theo kiểu headless thông qua
  API JSON đó - toàn bộ bề mặt điều khiển, các verb và các thanh chắn an toàn nằm trong
  [docs/AI-AGENTS.md](AI-AGENTS.md).
- Các bản vá có AI hỗ trợ được xét duyệt và chấp nhận theo cùng điều kiện như bất kỳ bản vá nào khác - theo
  tính đúng đắn, sự rõ ràng và các quy ước bên dưới, không phải theo ai (hay cái gì) đã viết chúng.
- Nếu bạn điều khiển VDBackup từ một tác nhân, hãy dùng đầu ra JSON của `helper.sh` làm
  hợp đồng; đừng cào dữ liệu từ WebUI.
- Cùng một tiêu chuẩn cho tất cả mọi người: các tính năng thực không bao giờ bị làm yếu đi, bí mật và dữ liệu thiết bị
  không bao giờ lọt vào repo (xem [.gitignore](.gitignore) nghiêm ngặt), và các hành động
  gây thay đổi vẫn được xác nhận và ghi vào nhật ký kiểm toán.

## Thiết lập môi trường phát triển

- Bạn cần một thiết bị/trình giả lập đã root (KernelSU, APatch hoặc Magisk) để kiểm thử.
- Dựng file zip có thể flash: `cd module && zip -r9 ../VD-Backup-dev.zip .` rồi flash nó.
- WebUI là `module/webroot/` (mở nó từ trình quản lý root). Backend là
  `module/helper.sh` (dispatcher) và `module/worker.sh` (engine tách rời).
- Các binary native nằm trong `module/bin/<abi>/` và được tạo ra bởi CI
  (`.github/scripts/build_bin.sh`); thông thường bạn không dựng lại chúng bằng tay.

## Quy ước

- **Mỗi tập tin nguồn** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) bắt đầu bằng
  phần tiêu đề banner của dự án (sao chép nó từ bất kỳ tập tin có sẵn nào). Không có ngoại lệ.
- **Code và chú thích bằng tiếng Anh.** Giữ chú thích ở mức tối thiểu và chỉ ở nơi cần thiết.
- **Không dùng em-dash hay en-dash**; luôn dùng dấu gạch nối thường `-`.
- WebUI là **vanilla JS** (một `scripts.js`); không có framework. Chỉ nói chuyện với root thông qua
  wrapper `helper(verb, args)`, và escape mọi giá trị được nội suy.
- **Không bao giờ làm yếu** một tính năng thực (ví dụ việc bảo toàn SELinux/uid/gid/modes).
- Các hành động gây thay đổi (restore, delete) phải hỏi xác nhận và ghi một nhật ký kiểm toán.

## Quốc tế hóa (i18n)

- Các chuỗi giao diện nằm trong `module/webroot/lang/`. Tiếng Anh là phương án dự phòng chuẩn
  (`en.js` + `en.json`); 20 ngôn ngữ còn lại là `<code>.json`.
- Để thêm hoặc đổi một chuỗi: sửa `en.js` **và** `en.json`, rồi cập nhật mọi
  `<code>.json`. Đụng đến một nhãn hiển thị nghĩa là cập nhật **tất cả** các tập tin ngôn ngữ và
  **tất cả** các `README.<code>.md`.
- Bản dịch là JSON thuần - một đóng góp đầu tiên tuyệt vời. Xem danh sách ngôn ngữ trong
  `module/webroot/i18n.js`.

## Commit & PR

- Giữ PR tập trung. Mô tả cái gì và vì sao.
- Ký nhận (sign off) các commit của bạn (DCO): `git commit -s` (thêm `Signed-off-by:`).
- CI phải luôn xanh. Hãy tử tế trong các lần review - xem [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Các issue tốt để bắt đầu

Tìm các nhãn `good first issue` và `help wanted`. Bản dịch, tài liệu, các preset đích đến
`rclone` mới và việc trau chuốt WebUI đều là những điểm khởi đầu tuyệt vời.

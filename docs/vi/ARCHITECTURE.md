> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · Tiếng Việt · [中文](../zh/ARCHITECTURE.md)

---

# Kiến trúc

VDBackup là một mô-đun WebUI chạy root. Nó có ba lớp: **WebUI** (những gì bạn thấy),
**backend shell** (thứ thực hiện công việc, với quyền root) và các **tệp nhị phân đi kèm**
(các trình lưu trữ và các kênh truyền). Mọi thứ đều chạy sẵn với quyền root, nên không có
lời nhắc cấp quyền và không có ứng dụng đồng hành cho các tính năng cốt lõi.

```
   ┌──────────────────────────────────────────────────────────┐
   │  WebUI  (module/webroot, vanilla JS)                      │
   │    index.html · scripts.js · i18n.js · styles.css         │
   │    lang/en.js + 21 languages · config.json (CSP, no net)  │
   └───────────────┬──────────────────────────────────────────┘
                   │  ksu.exec("sh scripts/helper.sh <verb> <b64json>")
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  scripts/helper.sh  (dispatcher, returns JSON)            │
   │    list-apps · config · dests · backup/restore/import ... │
   │    long ops -> setsid nohup scripts/worker.sh  (detached) │
   └───────────────┬───────────────────────────────┬──────────┘
                   │                               │ progress-<opid>.json (poll)
                   ▼                               ▼
   ┌────────────────────────────────────┐   ┌──────────────────────────┐
   │  scripts/worker.sh (root, detached)│   │  framework helper (opt.) │
   │   force-stop · tar|zstd|age        │   │  app_process + dex       │
   │   pm install · chown/chcon         │   │  perms/appops/ssaid/...  │
   │   transfer · notify                │   │  (dex primary, shell fb) │
   └───────────────┬────────────────────┘   └──────────────────────────┘
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  bin/<abi>/  tar · zstd · lz4 · rclone · rsync · ssh · restic │
   └──────────────────────────────────────────────────────────┘
                   ▼
   Destinations: local · SFTP/SCP · SMB · WebDAV · FTP · S3 · 70+ (rclone)
                 rsync · restic repos · Google Drive (opt-in companion)
```

## Những điểm chính

- **Đã sẵn root.** Tiến trình mô-đun chạy với quyền root, nên engine chỉ là shell thuần. Khoảng ~85 %
  công việc là shell thuần (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Thực thi tách rời.** Sao lưu/khôi phục chạy qua `setsid nohup`, như một tiến trình root
  độc lập. Đóng WebUI không làm gián đoạn chúng; giao diện kết nối lại bằng cách đọc
  `logs/progress-<opid>.json`.
- **Framework helper (~15 %).** Quyền chi tiết, AppOps, SSAID, StorageStats,
  biểu tượng và Wi-Fi đặc quyền cần đến framework Android. Một `dex` nhỏ chạy qua
  `app_process` (không có ứng dụng được cài đặt) xử lý những việc này, với phương án dự phòng bằng shell.
- **Tính di động.** Chỉ dùng định dạng chuẩn; các bản sao lưu mở được trên PC mà không cần mô-đun này.
- **Trạng thái** nằm trong `/data/adb/vdbackup/` (cấu hình, công việc, đích đến, thông tin đăng nhập
  được mã hóa, nhật ký, staging). **Các bản sao lưu** được ghi vào bộ nhớ mà người dùng nhìn thấy, được mã hóa
  bằng thông tin đăng nhập, tại `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, theo từng người dùng),
  không nằm trong `/data/adb` (vốn được mã hóa theo thiết bị và có thể đọc được trước lần mở khóa đầu tiên).

## Bảo đảm tương thích

Một bản sao lưu phải luôn khôi phục được mãi mãi. Đây là một quy tắc cứng, không phải nỗ lực tối đa có thể.

**Phạm vi.** Bảo đảm này bao trùm các bản sao lưu được ghi bởi **v1.01 trở đi** (bản phát hành chính thức
đầu tiên) và chỉ bởi các phiên bản được phát hành, công bố chính thức. v1.00 là một bản build chỉ để thử
nghiệm và bị loại khỏi phạm vi một cách rõ ràng; các bản tiền phát hành và phát triển không được bao trùm.
Kể từ bản phát hành công khai đầu tiên trở đi, lời hứa dưới đây là tuyệt đối:

- **Chỉ định dạng chuẩn.** Mọi kho lưu trữ đều là một `tar` thuần được nén bằng `zstd`,
  `gzip` hoặc `lz4`, tùy chọn bọc thêm bằng `age`. Không có vùng chứa độc quyền nào, nên
  một bản sao lưu có thể mở được trên bất kỳ PC nào bằng các công cụ thông thường kể cả khi không có mô-đun này (xem
  `etc/RECOVERY.md`). Một định dạng mà chúng tôi không thể từ bỏ.
- **Siêu dữ liệu chỉ thêm vào.** `manifest.json` mang `format_version`. Lược đồ chỉ
  mở rộng: các trường có thể được *thêm vào*, không bao giờ bị xóa, đổi tên hay dùng lại cho mục đích khác. Khôi phục đọc
  mọi trường một cách phòng thủ (các trường tùy chọn bị thiếu sẽ quay về giá trị mặc định) và cài đặt
  các APK cũng như giải nén các kho lưu trữ theo tên tệp và phần mở rộng của chúng, chứ không giả định một hình dạng
  manifest cố định.
- **Khôi phục tương thích tiến.** Khôi phục không bao giờ từ chối một bản sao lưu vì nó cũ, và một
  VDBackup cũ hơn sẽ âm thầm bỏ qua các loại mục mà nó không biết thay vì thất bại. Do đó một VDBackup mới hơn
  khôi phục được bất kỳ bản sao lưu cũ nào, và các kho lưu trữ định dạng chuẩn vẫn
  khôi phục được bằng tay bất kể thế nào.

Nói ngắn gọn: bất cứ thứ gì VDBackup từng ghi, mọi VDBackup trong tương lai (và một PC thông thường)
đều vẫn khôi phục được. Thay đổi định dạng theo cách làm hỏng một bản sao lưu trước đó là không
được phép; các khả năng mới được thêm phía sau `format_version` và các trường mới, chỉ bổ sung.

Về thiết kế kỹ thuật đầy đủ (định dạng kho lưu trữ, lược đồ siêu dữ liệu, các pipeline, mã hóa,
đích đến, trình nhập) những người bảo trì giữ các ghi chú thiết kế chi tiết; tệp này là
bản tổng quan hướng tới người đóng góp.

*Tài liệu này được tạo với Claude (Anthropic) và được VD171 duy trì. Hoan nghênh các chỉnh sửa và cải tiến - xem [CONTRIBUTING.md](CONTRIBUTING.md).*

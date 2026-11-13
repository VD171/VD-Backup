> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Українська](../uk/BINARIES.md) · Tiếng Việt · [中文](../zh/BINARIES.md)

---

# Tệp nhị phân đi kèm: nguồn gốc và kiểm toán

Quyền riêng tư và bảo mật không phải là tùy chọn trong VDBackup. Một công cụ sao lưu chạy với
quyền root trên dữ liệu riêng tư nhất của bạn, vì vậy bạn phải có thể thấy chính xác những gì
được đóng gói bên trong nó. Trang này ghi lại mọi tệp nhị phân và thư viện dựng sẵn mà mô-đun
mang theo, mỗi tệp đến từ đâu, và cách kiểm chứng rằng không có gì mờ ám bị lén đưa vào.

## Nguyên tắc

- **Không có gì mờ ám.** Mọi tệp nhị phân và thư viện được đi kèm đều có thể truy nguyên đến một
   nguồn thượng nguồn công khai có tên, ở một phiên bản được ghim, với một SHA-256 đã ghi lại. Không
  có khối blob nào được đóng gói mà thiếu một mục bạn có thể kiểm tra.
- **Lấy từ thượng nguồn, không bao giờ từ một thiết bị.** Các công cụ gốc đến từ kho gói Termux
  chính thức (các tệp `.deb` đã ký tại `packages.termux.dev/apt`), không bao giờ sao chép ra từ một
  Termux đã cài trên điện thoại nào đó. Quá trình dựng sẽ thất bại rõ ràng, nó không bao giờ ứng
  biến tạm bợ.
- **Tái lập được.** Chạy lại quá trình dựng và bạn sẽ có cùng những tệp đó; lấy lại các nguồn được
   ghim và các giá trị SHA-256 khớp nhau.
- **Dấu vết kiểm toán đi kèm với mô-đun.** Nó không chỉ nằm trên trang web, nó còn đi cùng bên
  trong mô-đun đã cài, trên thiết bị của bạn, nên bạn có thể kiểm toán ngoại tuyến.

## Những gì đi kèm, và từ đâu

| Sản phẩm | Nguồn | Được dựng như thế nào |
|---|---|---|
| Các công cụ gốc `bin/<abi>/` (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) cùng bao đóng `lib/` của chúng | Kho apt **Termux** chính thức (`packages.termux.dev/apt`), các gói `.deb` chính thức | `.github/scripts/build_bin.sh` tải xuống các tệp `.deb` cùng các phụ thuộc bắc cầu của chúng, giải nén chúng, và chỉ sao chép các tệp nhị phân cùng những thư viện dùng chung mà mỗi tệp cần |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (bộ chuyển đổi ABX dự phòng) | GitHub release của **rhythmcache/android-xml-converter** (`ABX_RELEASE`, ELF tĩnh) | tải xuống từ release được ghim bởi `build_bin.sh` |
| `companion.apk` (companion Google Drive tùy chọn) | **Kho này**, `companion/` (Gradle/Kotlin) | được CI dựng từ mã nguồn và ký bằng khóa dự án; không phải khối blob dựng sẵn |
| `vdbackup_helper.dex` (trình trợ giúp framework) | **Kho này**, `dex/src/` (Java) | được CI biên dịch từ mã nguồn bằng `javac` + `d8` |

Chỉ hai hàng đầu là tệp nhị phân bên thứ ba dựng sẵn; hai hàng cuối được dựng từ mã nguồn nằm
trong kho này và có thể đọc và dựng lại.

> **Phiên bản Full so với lite.** Các phiên bản lite chỉ bỏ qua `rclone` và `restic` (hai tệp nhị
> phân lớn nhất) để giữ kích thước nhỏ và tải chúng theo nhu cầu (được xác minh bằng SHA-256) trong
> lần đầu bạn dùng đích đám mây hoặc chế độ ảnh chụp nhanh; `rsync` và `ssh`/`scp`/`sftp` vẫn có mặt,
> và mọi tệp nhị phân khác được liệt kê ở trên cũng có mặt. Các phiên bản Full cung cấp `rclone`
> (nhà cung cấp đám mây) và `restic` (ảnh chụp nhanh) được nhúng sẵn, nên không bao giờ tải xuống gì.

## Bản kê trên thiết bị: `PROVENANCE.json`

`build_bin.sh` ghi một `bin/<abi>/PROVENANCE.json` cho mỗi ABI. Khi cài đặt, mô-đun chỉ giữ lại ABI
của thiết bị bạn, nên tệp đó ở lại trên thiết bị tại
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`. Nó ghi lại:

- `sources`: mọi `.deb` thượng nguồn (gói, phiên bản, URL đầy đủ, SHA-256 của `.deb`) và bản ABX
   release (URL, SHA-256 của kho lưu trữ).
- `files`: mọi tệp thực sự được đi kèm dưới `bin/<abi>/` (đường dẫn, kích thước, SHA-256).

Bạn có thể đọc nó trong WebUI (tab **About** liên kết tới nó) hoặc qua API của agent:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Cách kiểm chứng (từng bước)

1. **Kiểm tra các tệp được đi kèm.** Băm mỗi tệp dưới `bin/<abi>/` trên thiết bị của bạn và so sánh
   với `files[].sha256` trong `PROVENANCE.json`:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Đối chiếu các tệp với thượng nguồn.** Với mỗi mục `sources[]`, tải xuống `.deb` được ghim từ
   URL của nó, xác nhận SHA-256 của nó khớp với `deb_sha256`, giải nén nó, và xác nhận các tệp nhị
   phân/thư viện mà nó chứa băm ra cùng những giá trị đã được đi kèm. Bản thân các tệp `.deb` trong
   kho Termux được phục vụ từ kho apt đã ký của Termux.
3. **Dựng lại từ đầu.** Tự chạy `.github/scripts/build_bin.sh` (chỉ cần `curl`, `ar`, `tar`, `xz`,
   `zstd`, `readelf`) và so sánh kết quả với những gì được đi kèm.
4. **Companion và dex.** Dựng lại `companion/` và `dex/` từ mã nguồn; chữ ký của companion là khóa
   dự án (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Báo cáo

Nếu bất kỳ tệp được đi kèm nào không khớp với nguồn đã ghi của nó, hãy coi đó là một vấn đề bảo mật
và báo cáo nó (xem [SECURITY.md](SECURITY.md)). Đây chính là loại sai lệch mà bản kê này tồn tại để
làm cho nó hiển thị rõ.

<!-- doc-footer -->

---

> _Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Chúng tôi hoan nghênh các chỉnh sửa và cải tiến; xem [CONTRIBUTING.md](CONTRIBUTING.md)._

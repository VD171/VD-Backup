> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../id/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · Tiếng Việt · [中文](../zh/RECOVERY.md)

---

# VDBackup, khôi phục một bản backup trên PC (Windows / macOS / Linux)

Các bản backup VDBackup của bạn dùng **các định dạng chuẩn**, nên bạn có thể mở chúng ở bất cứ đâu,
mà không cần module này. Một thư mục backup chứa một `manifest.json`, các APK
(`*.apk.zst`) và các archive dữ liệu (`<item>.tar.zst`, `.tar.gz` hoặc `.tar.lz4`),
tùy chọn được mã hóa với một đuôi `.age`.

**Nếu dữ liệu được mã hóa**, siêu dữ liệu cũng được mã hóa, nên không có gì trong đó rò rỉ cho bất
kỳ ai chỉ có các tập tin. Khi đó thư mục còn chứa `manifest.full.age` (manifest đầy đủ) và hai tập
tin `stub.*.age` nhỏ. Trong trường hợp đó `manifest.json` chỉ là một điểm đánh dấu nhỏ không nhạy
cảm; các chi tiết thật nằm trong `manifest.full.age`. Mọi thứ khả chuyển (các archive dữ liệu và
`manifest.full.age`) giải mã chỉ bằng **cụm mật khẩu** của bạn - xem bước 1. Các tập tin
`stub.dev.age` / `stub.pass.age` chỉ là bộ nhớ đệm liệt kê trên thiết bị của module; bạn có thể bỏ
qua chúng trên một PC.

## Các công cụ bạn có thể cần

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`, Linux: `apt install zstd`)
- **age** (chỉ cho các tập tin `.age`): https://github.com/FiloSottile/age/releases
- `tar` được tích hợp sẵn trong macOS, Linux và Windows 10/11 hiện đại.
- `gzip` được tích hợp sẵn ở mọi nơi, với `.tar.gz` bạn không cần gì thêm.

## 1. Giải mã (chỉ khi tập tin kết thúc bằng `.age`)

Cụm mật khẩu (cách khả chuyển - hoạt động trên bất kỳ PC nào chỉ với cụm mật khẩu của bạn):

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Làm tương tự cho mỗi tập tin `*.age` (các APK và các archive dữ liệu). Nếu bản backup được mã hóa,
hãy giải mã `manifest.full.age` theo cùng cách để đọc manifest đầy đủ:

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

## 2. Giải nén + trích xuất

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd đọc được lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

Các APK chỉ là các tập tin APK (ZIP) được nén bằng zstd:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Ghi chú

- Các tập tin được trích xuất giữ các đường dẫn tương đối của chúng, context SELinux, uid/gid và modes
  nằm bên trong tar (và chỉ được áp dụng lại đúng khi bạn restore trên Android).
- `manifest.json` mô tả chính xác mỗi tập tin là gì, phiên bản ứng dụng và
  chủ sở hữu/context gốc. Nó là nguồn chân lý. Với một bản backup được mã hóa, manifest đầy đủ là
  `manifest.full.age` (giải mã nó như ở bước 1); `manifest.json` dạng văn bản thuần chỉ là một điểm
  đánh dấu nhỏ và không mang dữ liệu nhạy cảm.
- Không có gì ở đây bị gắn với một thiết bị cụ thể: cùng cụm mật khẩu hoạt động trên bất kỳ
  máy nào.

<!-- doc-footer -->

---

> _Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Chúng tôi hoan nghênh các chỉnh sửa và cải tiến, xem [CONTRIBUTING.md](CONTRIBUTING.md)._

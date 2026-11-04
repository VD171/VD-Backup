> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · Tiếng Việt · [中文](../zh/AI-AGENTS.md)

---

# Điều khiển VDBackup từ một tác nhân AI

VDBackup được xây dựng để một trợ lý hoặc tác nhân AI có thể quản trị **mọi** nội dung và
hành động của mô-đun theo kiểu headless, giống như cách một người làm qua WebUI. WebUI chỉ
là một trong các máy khách của một API JSON nhỏ; tác nhân của bạn là một máy khách khác. Hãy
dùng API, đừng quét (scrape) WebUI.

## Giao kèo

Mọi thứ đều đi qua một điểm vào duy nhất, chạy với quyền root trên thiết bị:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Các đối số là một đối tượng JSON duy nhất, **được mã hóa base64**, truyền vào như một token argv.
- Lệnh in ra **một đối tượng JSON** trên stdout: `{"ok":true,...}` hoặc
  `{"ok":false,"code":"ERR_...","message":"..."}`. Hãy phân tích nó; đừng bao giờ quét văn bản.
- Các thao tác dài (`backup`, `restore`, `import`) trả về `{"ok":true,"opid":"..."}` ngay lập tức
  và chạy **tách rời (detached)** (chúng sống sót khi trình gọi/WebUI biến mất). Hãy thăm dò
  tiến trình của chúng; chúng chưa xong khi lệnh trả về.
- `progress` và `cancel` nhận **base64 của chuỗi opid thô**, không phải một đối tượng JSON.

Một trình trợ giúp nhỏ cho shell của bạn:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Để điều khiển nó từ một máy trạm, hãy chạy lệnh đó qua kênh root thông thường của bạn tới
thiết bị (adb shell với quyền root, hoặc một thiết lập SSH-to-root). Mô-đun đi kèm các tệp nhị
phân đóng gói sẵn, nên sau khi cài đặt nó **không cần internet** cho backup/restore cục bộ; chỉ
các đích đám mây (`rclone`/`restic`/ssh) mới nói chuyện với mạng.

## Các động từ

| Động từ | Đối số (JSON) | Trả về |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | đối tượng config (hoặc `{key,value}`) | `{ok}` |
| `keygen` | `{}` | tạo cặp khóa `age` để mã hóa |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, dự phòng shell) |
| `label` | `{package,user?}` | `{ok,label}` (tên ứng dụng bản địa hóa thật, không phụ thuộc ngữ cảnh) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; lưu đệm theo package+`vc`) |
| `backup` | xem bên dưới | `{ok,opid}` (tách rời) |
| `restore` | xem bên dưới | `{ok,opid}` (tách rời) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (tách rời) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | `progress-<opid>.json` trực tiếp |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (gắn lại sau khi kết nối lại) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | danh sách ứng dụng / lô biểu tượng base64 |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `backup-info` | `{ref}` | `{ok,...}` toàn bộ chi tiết của một bản sao lưu (phiên bản, nguồn cài đặt, trạng thái, ngày, chế độ, kích thước, mục, số lượng quyền, thiết bị) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 từ manifest (hoạt động cả khi ứng dụng đã bị gỡ cài đặt) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref phải nằm dưới thư mục backups) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` giữ N bản mới nhất của một gói |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` nhật ký kiểm toán, mới nhất trước |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` sao lưu toàn hệ thống (tách rời) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (cần khởi động lại; `confirm` canh gác nó) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | gắn một ứng dụng đã cài làm ứng dụng hệ thống (mô-đun con không-hệ-thống; trực tiếp qua NoMount, nếu không thì ở lần khởi động kế tiếp) |
| `companion-status` / `companion-install` | `{}` | trạng thái / cài đặt theo yêu cầu của ứng dụng đồng hành Google Drive |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | quản lý đích |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | quản lý remote rclone (tạo mục `rclone.conf` mà một đích `type:"rclone"` trỏ tới) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | các công việc theo lịch |
| `scheduler-tick` | `{}` | chạy các công việc đến hạn + áp dụng lưu giữ + bộ quan sát tự động sao lưu (nhịp khởi động gọi cái này) |

### Đối số của `backup`

```json
{
  "package": "com.example.app",
  "user": 0,
  "mode": "full",                 // full | snapshot | mirror
  "compression": "zstd:10",       // none | lz4 | zstd[:N] | gzip
  "items": ["apk","data","data_de","obb","external","media"],
  "encrypt_data": false,
  "encrypt_apk": false,
  "dest": "local",                // local | <destination id>
  "verify": true,                 // băm lại mỗi kho lưu trữ so với manifest (mặc định bật cho Full)
  "dry_run": false,               // true = báo cáo kế hoạch kích thước, không ghi gì cả
  "ssaid": false                  // OPT-IN, xem bên dưới
}
```

`restore`/`import` nhận `{ref}` (một thư mục sao lưu / ref quét). `restore` cũng chấp nhận:
`"items"` (một tập con các loại mục của bản sao lưu để khôi phục; bỏ qua để lấy tất cả),
`"test": true` (giải nén vào một thư mục tạm và xác minh, không chạm vào ứng dụng đang chạy),
`"mode"` cho snapshot/mirror, `"password"` cho một bản sao lưu đã mã hóa, `"ssaid"` (opt-in),
và các tùy chọn nguồn cài đặt `"spoof_installer"` (mặc định lấy từ config, đặt trình cài đặt
thành Play Store tại thời điểm cài) cùng `"deep_spoof": true` (opt-in nâng cao; còn giả mạo gói
khởi tạo và nguồn gói bằng cách chỉnh sửa cơ sở dữ liệu gói, có hiệu lực sau khi khởi động lại).
`import` nhận `"from": "neo" | "databackup"` và, với một bản sao lưu Neo đã mã hóa, `"password"`.

### Đối số của `remote-add`

Một đích đám mây là một đích `type:"rclone"` đặt tên cho một remote `rclone`; hãy tạo remote đó
trước bằng `remote-add`. Các trường mật khẩu được lưu ở dạng che giấu, không bao giờ ở dạng rõ.
Các giá trị `backend` được hỗ trợ và `params` của chúng:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = đầu ra của `rclone authorize "drive"`)
```

Google Drive có hai đường: remote `drive` này (không cần dự án Google Cloud, dùng OAuth riêng
của rclone - chạy `rclone authorize "drive"` một lần trên bất kỳ máy tính nào và truyền token)
hoặc ứng dụng đồng hành tùy chọn (OAuth client id của riêng bạn). Cả hai đều kết thúc như những
đích thông thường.

### Chính sách mạng

Trường config `network_policy` kiểm soát loại kết nối nào mà các lần truyền đám mây có thể dùng:
`any` (mặc định), `wifi`, hoặc `mobile`. Đặt nó bằng `config-set`. Khi nó là `wifi` hoặc
`mobile`, mọi lần truyền đám mây (Full tải lên `rclone`/Drive, đồng bộ Mirror, backup/restore
snapshot `restic` từ xa, restore Mirror) sẽ kiểm tra phương tiện truyền dẫn đang hoạt động trước
và hủy với `ERR_NET_POLICY` nếu không khớp - cho cả công việc thủ công lẫn theo lịch. Các đích
cục bộ không bao giờ bị chặn.

## Các lan can an toàn mà tác nhân của bạn phải tôn trọng

- **`ssaid` là opt-in nghiêm ngặt (mặc định tắt).** Nó sao lưu / khôi phục ANDROID_ID của thiết
  bị bằng cách ghi lại một tệp hệ thống; một lần khôi phục chỉ áp dụng sau khi khởi động lại, và
  tệp trước đó luôn được lưu trước để hoàn tác. Chỉ gửi `"ssaid": true` theo một yêu cầu trực
  tiếp, có chủ ý của người dùng - không bao giờ theo mặc định.
- **Các hành động làm thay đổi (restore, delete, import) có tính phá hủy** và được ghi vào một
  dấu vết kiểm toán cục bộ (`logs/audit.jsonl`). Khôi phục là trung thực (xóa-rồi-giải-nén), nên
  nó đưa ứng dụng về đúng trạng thái của bản sao lưu. Hãy xác nhận ý định trước khi gọi chúng.
- **Không bao giờ làm suy yếu** việc bảo tồn (SELinux/uid/gid/chế độ/xattr) hay quy tắc APK (APK
  luôn được nén, không bao giờ mã hóa trừ khi `encrypt_apk` được đặt).
- Hãy coi đầu ra JSON là nguồn sự thật; kiểm tra `ok`/`code`, thăm dò `progress`, và đưa ra các
  mã `ERR_*` thay vì đoán.

Xem [ARCHITECTURE.md](ARCHITECTURE.md) và
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) để biết các chi tiết nội bộ.

---

*Tài liệu này được tạo với Claude (Anthropic) và được VD171 duy trì. Hoan nghênh các chỉnh sửa và cải tiến - xem [CONTRIBUTING.md](CONTRIBUTING.md).*

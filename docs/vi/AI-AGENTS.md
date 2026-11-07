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
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` số đếm (kích thước theo byte): ứng dụng có bản sao lưu, tổng số thực thể bản sao lưu, bản sao lưu đường dẫn độc lập, công việc đã lập lịch, tổng kích thước bản sao lưu, và dung lượng trống/tổng của hệ thống tệp bản sao lưu. Không tách rời, trả về ngay lập tức; được dùng bởi tổng quan trang chủ của WebUI. |
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
| `list-users` | `{}` | `{ok,users:[{id,name}]}` người dùng Android của thiết bị (đa người dùng). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` thư mục con của một đường dẫn (bộ chọn thư mục). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` sao lưu thư mục/tệp độc lập. |
| `provenance` | `{}` | tệp kê khai kiểm toán các nhị phân đi kèm (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` toàn bộ chi tiết của một bản sao lưu (phiên bản, nguồn cài đặt, trạng thái, ngày, chế độ, kích thước, mục, số lượng quyền, thiết bị) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 từ manifest (hoạt động cả khi ứng dụng đã bị gỡ cài đặt) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref phải nằm dưới thư mục backups) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` giữ N bản mới nhất của một gói |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` nhật ký kiểm toán, mới nhất trước |
| `log-export` | `{user?}` | `{ok:true,path}` (đường dẫn tuyệt đối của một tệp `.txt` được ghi dưới thư mục bản sao lưu) hoặc `{ok:false,code:"ERR_LOG_EXPORT"}`. Ghi nhật ký hoạt động (`audit.jsonl`) cùng một tiêu đề bản dựng/thiết bị ngắn vào một tệp văn bản duy nhất mà người dùng thấy được để có thể đính kèm vào báo cáo lỗi. Không tách rời, trả về ngay lập tức. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` sao lưu toàn hệ thống (tách rời) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (cần khởi động lại; `confirm` canh gác nó) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` sao lưu bất kỳ đường dẫn tuyệt đối nào thành `tar.zst`+`manifest.json` dưới `.paths/` (tách rời) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` khôi phục một bản sao lưu đường dẫn về vị trí gốc của nó (`confirm` canh gác nó; tách rời) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | gắn một ứng dụng đã cài làm ứng dụng hệ thống (mô-đun con không-hệ-thống; trực tiếp qua NoMount, nếu không thì ở lần khởi động kế tiếp) |
| `companion-status` / `companion-install` | `{}` | trạng thái / cài đặt theo yêu cầu của ứng dụng đồng hành Google Drive |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | quản lý đích |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | quản lý remote rclone (tạo mục `rclone.conf` mà một đích `type:"rclone"` trỏ tới); `backend` có thể là bất kỳ backend rclone nào, không có whitelist |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (engine đã mở trình duyệt của điện thoại đến URL đồng ý đó qua một Android VIEW intent) hoặc `{ok:false,code:"ERR_AUTHORIZE"}`. Chạy `rclone authorize <backend>` trên một callback server cục bộ (`127.0.0.1:53682`) để OAuth ngay trên thiết bị. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` trong khi chờ, `{ok:true,done:true,token}` khi người dùng đã đồng ý (`token` để truyền cho `remote-add`), hoặc `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; dừng một ủy quyền đang chờ. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (các tệp nhị phân `rclone`/`restic` có hiện diện không, phiên bản `lite` này có thể tải chúng không, kích thước tải xuống tính bằng byte) |
| `cloud-fetch` | `{}` | `{ok,opid}` (tách rời) tải+xác minh+cài đặt addon `rclone`/`restic` trên phiên bản `lite` |
| `schedule-set` / `schedule-list` / `schedule-delete` | xem bên dưới | các công việc theo lịch (một bản sao lưu hoặc một bản khôi phục; nhắm tới một ứng dụng, một tập hợp, hoặc tất cả ứng dụng) |
| `scheduler-tick` | `{}` | chạy các công việc đến hạn + áp dụng lưu giữ + bộ quan sát tự động sao lưu (nhịp khởi động gọi cái này) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (không tách rời; trả về ngay; `ERR_UPDATE_CHECK` khi thất bại - xem bên dưới) |

### Các trường của `progress`

Việc poll `progress` trả về `progress-<opid>.json` trực tiếp của thao tác. Các trường này
**luôn hiện diện**:

| Trường | Kiểu | Ý nghĩa |
|--------|------|---------|
| `opid` | string | id của thao tác |
| `percent` | int | mức hoàn thành 0-100 |
| `phase` | string | nhãn giai đoạn hiện tại |
| `item` | string | loại mục đang được xử lý |
| `done` | bool | true ở lần ghi kết thúc (finish / dry-run / restore-test) |

Một thao tác đang chạy cũng có thể mang các trường trực tiếp **tùy chọn** này. Chúng vắng mặt
hoặc rỗng khi chưa biết, và bị **bỏ qua ở các lần ghi kết thúc** (finish / dry-run /
restore-test):

| Trường | Kiểu | Ý nghĩa |
|--------|------|---------|
| `rate` | string | tốc độ truyền, ví dụ `"4.2 MiB/s"` (rỗng = chưa biết) |
| `eta` | string | thời gian còn lại ước tính, ví dụ `"1m12s"` (rỗng = chưa biết) |
| `n` | int | chỉ số mục hiện tại (0 = chưa biết) |
| `of` | int | tổng số mục (0 = chưa biết) |
| `cur` | string | tên mục hiện tại (rỗng = không có) |

Các lần truyền đám mây điền `rate`/`eta` (percent đến từ rclone); các bản sao lưu Full cục bộ
điền `n`/`of`/`cur`. Các nhãn giai đoạn bao gồm giai đoạn niêm phong checksum **`verified`** và,
đối với các lần truyền đám mây, **`transfer`** và **`mirror <item>`**.

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

### Đối số của `schedule-set`

Một công việc theo lịch chọn **một** mục tiêu và một **hành động**:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (mặc định) | "restore"
  "package": "com.example.app",   // một ứng dụng   - HOẶC -
  "packages": ["com.a","com.b"],  // một tập hợp ứng dụng   - HOẶC -
  "all": true,                    // tất cả ứng dụng, trừ danh sách ứng dụng loại trừ
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // cổng: chỉ chạy trên Wi-Fi
  "require_charging": false,      // cổng: chỉ chạy khi đang sạc
  "min_battery": 0,               // cổng: chỉ chạy khi pin >= mức % này (0-100)
  "days": [1,2,3,4,5]             // cổng: chỉ chạy vào các ngày này trong tuần (0=Chủ Nhật)
}
```

Hãy cung cấp đúng **một** trong số `package`, `packages` hoặc `all` cho mục tiêu. Một công việc
`backup` giữ nguyên `mode`/`dest`/`keep`/`items` thông thường. Một công việc `restore`
(`action: "restore"`) khôi phục bản sao lưu **gần nhất** của mỗi ứng dụng mục tiêu (hoặc một
`ref` chỉ định rõ) và **ghi đè dữ liệu hiện tại của ứng dụng ở mỗi lần chạy** - điều này là có
chủ đích và phải tự chọn, nên chỉ đặt nó theo yêu cầu trực tiếp của người dùng.

### Chặn cổng bộ lập lịch

Một công việc theo lịch có thể mang các **điều kiện cổng tùy chọn**. Khi cổng của một công việc
đến hạn không được thỏa, công việc bị **bỏ qua và thử lại ở nhịp kế tiếp, mà không đẩy tiến lịch
của nó** (`last_run` của nó không được đóng dấu, nên nó kích hoạt ngay khi điều kiện được thỏa):

| Trường | Kiểu | Cổng |
|--------|------|------|
| `require_wifi` | bool | chỉ chạy khi đang trên Wi-Fi |
| `require_charging` | bool | chỉ chạy khi đang sạc |
| `min_battery` | int (0-100) | chỉ chạy khi pin ở mức này trở lên |
| `days` | array of int (0-6, 0=Chủ Nhật) | chỉ chạy vào các ngày này trong tuần |

Trên tất cả các cổng này, một kiểm tra **an toàn nhiệt** tối thiểu luôn được áp dụng: một thao
tác theo lịch bị bỏ qua khi thiết bị nóng tới mức nguy hiểm. Mỗi lần bỏ qua do cổng được ghi vào
nhật ký kiểm toán dưới dạng `op:"scheduler-gated"` với `reason` là `wifi` / `charging` /
`battery` / `days` / `thermal`.

### Đối số của `remote-add`

Một đích đám mây là một đích `type:"rclone"` đặt tên cho một remote `rclone`; hãy tạo remote đó
trước bằng `remote-add`. `backend` có thể là **bất kỳ backend rclone nào** - không có whitelist.
`remote-add` chấp nhận bất kỳ tên backend nào (`dropbox`, `onedrive`, `box`, `pcloud`, `mega`,
`b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` và khoảng ~70 backend khác mà rclone hỗ trợ),
và `params` được truyền thẳng vào cấu hình `rclone` dưới dạng các cặp `key=value`. Các trường mật
khẩu được lưu ở dạng che giấu, không bao giờ ở dạng rõ. Các backend thông dụng và `params` của chúng:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = đầu ra của `rclone authorize "drive"`)
```

**OAuth ngay trên thiết bị (không cần PC).** Các backend cần đăng nhập qua trình duyệt (Google
Drive, Dropbox, OneDrive, Box, pCloud) không cần máy tính để bàn hay token dán thủ công. Gọi
`remote-authorize` với `{backend}`: engine chạy `rclone authorize <backend>` với một callback
server cục bộ (`127.0.0.1:53682`) và mở trình duyệt của chính điện thoại tại trang đồng ý của nhà
cung cấp qua một Android VIEW intent, trả về `{ok:true,url}` (hoặc `{ok:false,code:"ERR_AUTHORIZE"}`).
Poll `remote-authorize-poll` (`{}`): nó trả về `{ok:true,done:false,url}` trong khi chờ và
`{ok:true,done:true,token}` khi người dùng chấp thuận - truyền `token` đó cho `remote-add`.
`remote-authorize-cancel` (`{}`) dừng một ủy quyền đang chờ (`{ok:true,cancelled:true}`). Việc dán
thủ công đầu ra của `rclone authorize "<backend>"` từ bất kỳ máy tính nào vẫn được hỗ trợ như một
phương án dự phòng.

Google Drive có hai đường: remote `drive` này (không cần dự án Google Cloud, dùng OAuth riêng
của rclone - ủy quyền ngay trên thiết bị bằng `remote-authorize`, hoặc chạy `rclone authorize "drive"`
một lần trên bất kỳ máy tính nào và truyền token) hoặc ứng dụng đồng hành tùy chọn (OAuth client id
của riêng bạn). Cả hai đều kết thúc như những đích thông thường.

### Chính sách mạng

Trường config `network_policy` kiểm soát loại kết nối nào mà các lần truyền đám mây có thể dùng:
`any` (mặc định), `wifi`, hoặc `mobile`. Đặt nó bằng `config-set`. Khi nó là `wifi` hoặc
`mobile`, mọi lần truyền đám mây (Full tải lên `rclone`/Drive, đồng bộ Mirror, backup/restore
snapshot `restic` từ xa, restore Mirror) sẽ kiểm tra phương tiện truyền dẫn đang hoạt động trước
và hủy với `ERR_NET_POLICY` nếu không khớp - cho cả công việc thủ công lẫn theo lịch. Các đích
cục bộ không bao giờ bị chặn.

### Toàn vẹn và hạn mức đám mây

- **Niêm phong checksum (đám mây).** Sau một lần sao chép đám mây thành công, engine chạy một
  kiểm tra checksum từ xa (`rclone check`); một sai khớp khiến thao tác thất bại với `ERR_VERIFY`.
  Các backend không chia sẻ hàm băm chung nào với phía cục bộ sẽ bị bỏ qua (không phải là lỗi).
- **Kiểm tra hạn mức (đám mây, chế độ Full).** Trước một lần tải lên chế độ Full tới một remote
  `rclone`, engine truy vấn dung lượng trống của remote (`rclone about --json`) và từ chối với
  `ERR_QUOTA` nếu bản sao lưu sẽ không vừa. Các remote không báo cáo thông tin hạn mức sẽ bị bỏ
  qua. Chế độ Mirror là một đồng bộ delta và được miễn trừ.

### Tệp nhị phân đám mây (phiên bản `lite`)

Phiên bản `full` đóng gói tất cả tệp nhị phân và không bao giờ cần mạng. Phiên bản `lite` bỏ qua
hai tệp lớn nhất, `rclone` và `restic`, và tải chúng theo yêu cầu vào lần đầu tiên bạn chạy một
hành động đám mây hoặc snapshot. `cloud-status` báo cáo chúng đã hiện diện chưa, phiên bản này có
thể tải chúng không, và kích thước tải xuống tính bằng byte. `cloud-fetch` chạy **tách rời** (hãy
poll `progress` bằng `opid` của nó): nó tải addon `rclone`+`restic` theo kiến trúc, xác minh với
SHA-256 được nung vào module, và cài đặt vào bộ nhớ đệm thời gian chạy. Các pha tiến trình là
`downloading`, `verifying` và `installing`; mã cuối cùng là `ERR_NONE` khi thành công, hoặc
`ERR_FETCH` (tải thất bại) / `ERR_FETCH_VERIFY` (checksum không khớp, đã loại bỏ) khi thất bại.
Trên phiên bản `full` thì không cần. Một `backup`/`restore` tới đích đám mây hoặc snapshot trên
phiên bản `lite`, trước khi các tệp nhị phân hiện diện, sẽ thất bại với `ERR_CLOUD_FETCHABLE`;
client nên đề nghị chạy `cloud-fetch`, rồi thử lại.

### Các danh mục sao lưu đặc biệt

`special-categories` báo cáo một thiết bị có những danh mục toàn hệ thống nào; `special-backup` nắm
bắt những danh mục bạn truyền trong `categories` và `special-restore` áp dụng lại chúng. Các danh
mục là:

| Danh mục | Nó là gì | Ngữ nghĩa khôi phục |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | thay thế qua provider (xóa + giải nén) |
| `contacts` | danh bạ và nhật ký cuộc gọi | thay thế qua provider (xóa + giải nén) |
| `wifi` | các mạng Wi-Fi đã lưu | thay thế qua provider (xóa + giải nén) |
| `bluetooth` | các cặp ghép nối Bluetooth | thay thế qua provider (xóa + giải nén) |
| `calendar` | provider lịch (`com.android.providers.calendar`, ứng dụng + dữ liệu); cũng được xuất khả chuyển sang `calendar.json` | thay thế qua provider (xóa + giải nén) |
| `wallpaper` | hình nền màn hình chính và màn hình khóa cùng `wallpaper_info.xml`, lưu ở dạng thô (nhị phân) | tệp bị thay thế |
| `dns` | chế độ và bộ định danh DNS riêng tư, đọc từ cài đặt | `settings put` idempotent |
| `system_settings` | bản dump đầy đủ các cài đặt system/global/secure | **opt-in**, `settings put` idempotent, ghi đè cài đặt thiết bị |

**`system_settings` là opt-in nghiêm ngặt và có tính phá hủy khi khôi phục.** Giống `ssaid`, nó ghi
đè các cài đặt trên toàn thiết bị khi được khôi phục, nên nó được canh gác sau sự đồng ý rõ ràng của
người dùng và được ghi vào dấu vết kiểm toán. Không bao giờ chọn nó theo mặc định; chỉ theo một yêu
cầu trực tiếp, có chủ ý của người dùng.

### Sao lưu đường dẫn độc lập

`path-backup` / `path-restore` sao lưu và khôi phục **bất kỳ đường dẫn tuyệt đối nào** - một thư mục
hoặc một tệp đơn - trên bộ nhớ dùng chung hoặc dưới `/data`, bên ngoài mô hình theo từng ứng dụng.
Kho lưu trữ được ghi dưới dạng `tar.zst` cộng một `manifest.json` theo định dạng riêng của VDBackup
(được niêm phong bằng SHA-256, kèm một bộ RECOVERY khi được mã hóa) dưới `.paths/` trong thư mục
backups.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- Đường dẫn nguồn phải là **tuyệt đối** và nằm dưới một trong các gốc được phép: `/storage/emulated`,
  `/data/media`, `/sdcard`, `/data`. Một đường dẫn không tồn tại sẽ thất bại với `ERR_NO_PATH`; một
  đường dẫn bên ngoài các gốc được phép, hoặc một đường dẫn chứa `..`, sẽ thất bại với `ERR_BAD_PATH`.
- `path-restore` ghi lại về vị trí gốc, nên nó có tính phá hủy và yêu cầu `"confirm": true` - một
  cổng ma sát cao, giống `special-restore`. Một `ref` không phải là một bản sao lưu đường dẫn hợp lệ
  sẽ thất bại với `ERR_BAD_REF`.
- Cả hai đều chạy **tách rời**; thăm dò `progress` bằng `opid` được trả về.

### `update-check`

`update-check` báo cáo liệu một phiên bản mới hơn của mô-đun đã được phát hành hay chưa, để một
tác nhân (hoặc WebUI) có thể hiển thị nó. Đây là một **động từ đọc trả về ngay lập tức** - nó
**không** tách rời, nên không có `opid` để poll. Chỉ được kích hoạt bởi một hành động rõ ràng của
người dùng, nó tải manifest cập nhật đã phát hành của mô-đun (URL `updateJson` từ `module.prop`)
bằng `curl` đi kèm qua một yêu cầu HTTP phía root - cái này chạy ngoài WebView, nên không chịu ràng
buộc bởi CSP của WebUI - và so sánh `versionCode` đã phát hành với cái đã cài đặt. Nó **không nhận
đối số nào**.

Khi thành công nó trả về:

| Trường | Kiểu | Ý nghĩa |
|--------|------|---------|
| `ok` | bool | `true` |
| `current_version` | string | versionName đã cài đặt |
| `current_code` | int | versionCode đã cài đặt |
| `latest_version` | string | versionName đã phát hành |
| `latest_code` | int | versionCode đã phát hành |
| `update_available` | bool | `true` khi `latest_code` lớn hơn `current_code` |
| `zipUrl` | string | URL của zip đã phát hành |
| `changelog` | string | URL của changelog đã phát hành |
| `notes` | string | ghi chú phát hành |

Nếu không có URL `updateJson`, yêu cầu mạng thất bại, hoặc manifest không thể phân tích, nó trả về
`{"ok":false,"code":"ERR_UPDATE_CHECK"}`.

`update-check` chỉ **báo cáo** tính khả dụng và ghi chú phát hành; bản cập nhật thực sự được thực
hiện bởi trình quản lý root của bạn (KernelSU / APatch / Magisk) thông qua `updateJson` của mô-đun,
không bao giờ bởi động từ này.

## Các lan can an toàn mà tác nhân của bạn phải tôn trọng

- **`ssaid` là opt-in nghiêm ngặt (mặc định tắt).** Nó sao lưu / khôi phục ANDROID_ID của thiết
  bị bằng cách ghi lại một tệp hệ thống; một lần khôi phục chỉ áp dụng sau khi khởi động lại, và
  tệp trước đó luôn được lưu trước để hoàn tác. Chỉ gửi `"ssaid": true` theo một yêu cầu trực
  tiếp, có chủ ý của người dùng - không bao giờ theo mặc định.
- **Các hành động làm thay đổi (restore, delete, import) có tính phá hủy** và được ghi vào một
  dấu vết kiểm toán cục bộ (`logs/audit.jsonl`). Khôi phục là trung thực (xóa-rồi-giải-nén), nên
  nó đưa ứng dụng về đúng trạng thái của bản sao lưu. Hãy xác nhận ý định trước khi gọi chúng.
- **`system_settings` là opt-in và có tính phá hủy, y hệt `ssaid`.** Khôi phục nó sẽ ghi đè các cài
  đặt trên toàn thiết bị, nên chỉ gửi nó theo một yêu cầu trực tiếp của người dùng; nó được canh gác
  bằng sự đồng ý rõ ràng và được ghi vào dấu vết kiểm toán.
- **Khôi phục là idempotent.** Các khôi phục provider thô (messages/contacts/wifi/bluetooth/calendar)
  **thay thế** thay vì hợp nhất - dữ liệu provider bị xóa và kho lưu trữ được giải nén đè lên - nên
  khôi phục lại cùng một bản sao lưu không thể tạo ra các hàng trùng lặp. `dns` và `system_settings`
  được áp dụng lại bằng `settings put` idempotent.
- **Việc giải nén kho lưu trữ được bảo vệ chống lại path traversal.** Khôi phục chạy với quyền root,
  nên mọi kho lưu trữ (restore, import, special-restore, path-restore) đều được kiểm tra trước bất kỳ
  thao tác ghi nào: một kho mà các thành viên dùng đường dẫn tuyệt đối hoặc chứa `..` sẽ bị từ chối
  ngay từ đầu với `ERR_UNSAFE_ARCHIVE`, trước khi một thao tác ghi phá hủy duy nhất nào diễn ra (GNU
  tar cũng chạy với `--no-absolute-names`). Một kho lưu trữ bị giả mạo không bao giờ có thể thoát khỏi
  thư mục đích của nó.
- **Không bao giờ làm suy yếu** việc bảo tồn (SELinux/uid/gid/chế độ/xattr) hay quy tắc APK (APK
  luôn được nén, không bao giờ mã hóa trừ khi `encrypt_apk` được đặt).
- Hãy coi đầu ra JSON là nguồn sự thật; kiểm tra `ok`/`code`, thăm dò `progress`, và đưa ra các
  mã `ERR_*` thay vì đoán.

Xem [ARCHITECTURE.md](ARCHITECTURE.md) và
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) để biết các chi tiết nội bộ.

---

*Tài liệu này được tạo với Claude (Anthropic) và được VD171 duy trì. Hoan nghênh các chỉnh sửa và cải tiến - xem [CONTRIBUTING.md](CONTRIBUTING.md).*

> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · Tiếng Việt · [中文](../zh/CHANGELOG.md)

---

# Nhật ký thay đổi

Mọi thay đổi đáng chú ý của VDBackup được ghi lại ở đây. Chỉ bằng tiếng Anh.

## v1.03.1

Phạm vi sao lưu mới:

- Các danh mục sao lưu đặc biệt mới: lịch (trình cung cấp lịch, cùng một bản xuất di động
  `calendar.json`), hình nền (hình nền màn hình chính và màn hình khóa), DNS riêng tư (chế độ
  và bộ chỉ định) và cài đặt hệ thống (bản kết xuất đầy đủ các cài đặt system/global/secure).
  Cài đặt hệ thống là opt-in và ghi đè các cài đặt trên toàn thiết bị khi khôi phục, nên nó
  được rào chắn như SSAID, với sự đồng ý rõ ràng và một mục kiểm toán đầy đủ.
- Sao lưu thư mục và tệp độc lập: sao lưu bất kỳ đường dẫn tuyệt đối nào (bộ nhớ chia sẻ hoặc
  dữ liệu ứng dụng) thành một kho lưu trữ được nén và niêm phong bằng manifest, rồi khôi phục
  nó về cùng đường dẫn. Khôi phục cần một xác nhận rõ ràng.

Khôi phục an toàn hơn:

- Mỗi kho lưu trữ được kiểm tra trước khi ghi bất cứ thứ gì: một bản sao lưu có nội dung trỏ
  ra ngoài đích của nó (một đường dẫn tuyệt đối hoặc một thành phần `..`) sẽ bị từ chối, nên
  một lần khôi phục chạy với quyền root không thể bị lừa để ghi ra ngoài đích.

Tiến trình và lập lịch:

- Tiến trình trực tiếp giờ đây hiển thị tốc độ truyền, ETA và một bộ đếm mục trong khi sao
  lưu, cùng một bước được xác minh bằng checksum cho các lần tải lên đám mây và một bước
  kiểm tra trước "không đủ dung lượng".
- Các công việc đã lập lịch có thể bị điều kiện hóa: chỉ chạy trên Wi-Fi, chỉ khi đang sạc,
  chỉ khi pin trên một mức, hoặc chỉ vào các ngày trong tuần đã chọn; một công việc đã lập
  lịch cũng bị bỏ qua khi thiết bị nóng tới mức nguy hiểm. Một công việc bị bỏ qua sẽ thử lại
  ở tick kế tiếp.

Đích đám mây:

- Kết nối bất kỳ backend rclone nào từ giao diện: danh sách thả xuống của remote đám mây
  cung cấp các nhà cung cấp phổ biến (Google Drive, Dropbox, OneDrive, Box, pCloud, Mega,
  Backblaze B2, S3, SFTP, WebDAV, FTP, SMB) cùng một tùy chọn "Custom (advanced)" nơi bạn gõ
  tên bất kỳ backend rclone nào khác và các tham số `key=value` của nó, nên mọi backend của
  rclone đều có thể truy cập.
- Đăng nhập trên thiết bị (không cần PC): các nhà cung cấp cần đăng nhập bằng trình duyệt
  (Google Drive, Dropbox, OneDrive, Box, pCloud) có một nút "Authorize in browser" mở trình
  duyệt của chính điện thoại tới trang đồng ý của nhà cung cấp; sau khi bạn chấp thuận, bạn
  quay lại ứng dụng và remote được lưu tự động, với token được bắt lấy trên thiết bị. Dán
  token bằng tay vẫn còn sẵn như một phương án dự phòng.

Giao diện:

- Một tỷ lệ giao diện có thể điều chỉnh (một thanh trượt có thể kéo) co giãn toàn bộ giao diện, để
  nó vừa với các màn hình có mật độ điểm ảnh khác nhau; 100% là mặc định và không thay đổi.
- Giao diện giờ đây hiển thị từ phải sang trái cho tiếng Ả Rập và tiếng Ba Tư.
- Một tổng quan trang chủ với số đếm bản sao lưu và một thanh lưu trữ, huy hiệu trạng thái,
  sao chép hash và đường dẫn vào bảng tạm, công tắc gạt kiểu Android, và một hành động "Check for updates".
- Nhật ký hoạt động là một màn hình đầy đủ mở ra ngay lập tức, với một hành động "Export logs" lưu
  một tệp nhật ký mà bạn có thể đính kèm vào một báo cáo.

Sửa lỗi:

- Khôi phục và nhập không còn thất bại trên các thiết bị có `tar` đi kèm không chấp nhận tùy
  chọn `--no-absolute-names`; việc kiểm tra an toàn kho lưu trữ độc lập với tùy chọn đó.
- "Check for updates" hoạt động ngay cả khi không có HTTP client đi kèm, bằng cách quay lại dùng
  rclone đi kèm; và nhật ký hoạt động không còn mất nhiều thời gian để mở.

## v1.01

Bản phát hành công khai đầu tiên. Một mô-đun WebUI cho KernelSU/APatch/Magisk sao lưu và khôi phục các ứng
dụng cùng dữ liệu của chúng hoàn toàn với quyền root, không có lời nhắc cấp quyền.

Động cơ và định dạng:

- Động cơ sao lưu/khôi phục chạy như một tiến trình root tách rời (`setsid`): nó tồn tại qua việc đóng
  WebUI hoặc trình quản lý root, và giao diện kết nối lại với tiến trình đang chạy theo `opid`.
- Ba chế độ sao lưu: Full (tar.zst, cục bộ hoặc từ xa), Snapshot (kho restic, được mã hóa và khử trùng
  lặp) và Mirror (đồng bộ 1:1 bằng rclone/rsync). Các tệp APK luôn được nén, ngay cả trong một bản mirror.
- Các mục theo ứng dụng: APK (base + các split), `data`, `data_de`, `obb`, bên ngoài và media. Ngữ cảnh
  SELinux, uid/gid, các chế độ và xattr/caps đều được bảo toàn; việc khôi phục dùng một phiên `pm install`
  và ánh xạ lại quyền sở hữu/ngữ cảnh sang uid đang hoạt động.
- Nhận biết theo từng người dùng (đa người dùng) xuyên suốt. Các bản sao lưu được lưu dưới `/sdcard/VDBackup`
  (theo người dùng), nằm ngoài `/data/adb`, nên chúng không thể đọc được trước lần mở khóa đầu tiên; mọi
  đích đến đều được đặt trong không gian tên dưới `<path>/vdbackup`.
- Nén: không nén, lz4, zstd (các mức) hoặc gzip ("chế độ tương thích"). Một manifest JSON ghi lại thiết bị,
  gói (bao gồm cả nhãn ứng dụng), các mục và các quyền.
- Mã hóa di động bằng `age` (tạo khóa), cùng một hướng dẫn KHÔI PHỤC trên PC được kèm theo bên trong mỗi
  bản sao lưu được mã hóa để nó có thể được giải mã và trích xuất ở bất cứ đâu, mà không cần mô-đun.

Đích đến và đám mây:

- Các đích đến: thêm/liệt kê/kiểm tra/xóa (cục bộ, remote rclone, kho restic, và một ứng dụng đồng hành
  Google Drive tùy chọn); thông tin đăng nhập được lưu trữ ở dạng ẩn, không bao giờ ở dạng rõ.
- Tạo các remote rclone từ giao diện/API (`remote-add`/`remote-list`/`remote-del`), nên bất kỳ backend đám
  mây nào (SFTP, SMB, WebDAV, FTP, S3, Google Drive, và nhiều hơn nữa) đều có thể truy cập mà không cần
  chỉnh sửa `rclone.conf` thủ công.
- Google Drive theo hai cách: qua rclone (không cần tài khoản Google Cloud) hoặc ứng dụng đồng hành không
  giao diện tùy chọn (`ru.vd171.vdbackup`), vốn mang theo một thông báo ẩn bằng HMA-OSS bắt buộc.
- Chính sách mạng: chọn xem các lần truyền đám mây có thể dùng bất kỳ kết nối nào, chỉ Wi-Fi, hay chỉ dữ
  liệu di động; được áp dụng cho cả tác vụ thủ công và tác vụ theo lịch. Các đích đến cục bộ được miễn trừ.

Nhập để di chuyển:

- Nhập từ Neo-Backup, bao gồm các bản sao lưu được mã hóa bằng mật khẩu (AES-256-GCM được giải mã bởi trợ
  giúp dex; WebUI nhắc nhập mật khẩu).
- Nhập từ Android-DataBackup (cài đặt các APK, trích xuất các kho lưu trữ user/user_de/data, ánh xạ lại).
- Cả hai đều được kiểm chứng với các bản sao lưu thực trên nhiều thiết bị.

Tính toàn vẹn và an toàn:

- Khôi phục xóa-rồi-trích-xuất trung thực; xác minh sha256 theo từng kho lưu trữ (mặc định bật cho Full, cùng
  một lần kiểm tra tính toàn vẹn kho cho Snapshot), chạy thử và kiểm thử khôi phục. Các kho lưu trữ được đọc
  lại để kiểm tra tính đầy đủ; một kho lưu trữ bị hỏng hoặc một tên gói không hợp lệ không bao giờ có thể kích
  hoạt một lần khôi phục mang tính phá hủy, và các lỗi truyền từ xa đều được báo cáo, không bao giờ âm thầm.
- Khôi phục chọn lọc: khôi phục bất kỳ tập con nào các mục mà một bản sao lưu nắm giữ (APK, data, dữ liệu
  được bảo vệ, OBB, external, media), tất cả được chọn theo mặc định.
- Xóa các bản sao lưu từ giao diện/API (`delete-backup`) và lưu giữ keep-last-N cho các bản sao lưu thủ công
  (`prune`); mọi lần xóa, khôi phục, tỉa và chạy theo lịch đều được ghi vào một nhật ký kiểm toán JSON cục bộ
  mà bạn có thể xem trong ứng dụng.
- Các quyền thời gian chạy và AppOps được ghi vào manifest và áp dụng lại khi khôi phục. Nguồn cài đặt
  (installerPackageName) và trạng thái bật/tắt cũng được ghi lại và áp dụng lại khi khôi phục.
- Giả mạo nguồn cài đặt: theo mặc định một ứng dụng đã khôi phục báo cáo Play Store là nguồn cài đặt của nó
  (được đặt tại thời điểm cài qua phiên cài đặt, vì nếu không một ứng dụng đã khôi phục sẽ trông như được cài
  ngoài); có thể chuyển đổi trên toàn cục và theo từng lần khôi phục, và khi tắt thì nguồn đã ghi được giữ
  lại. Một chế độ "deep" opt-in nâng cao còn giả mạo thêm gói khởi tạo và nguồn gói bằng cách chỉnh sửa cơ sở
  dữ liệu gói của hệ thống (sao lưu chính xác từng byte trước tiên, có hiệu lực sau khi khởi động lại) để ứng
  dụng trông như được cài hoàn toàn từ cửa hàng.
- SSAID (ANDROID_ID của thiết bị): hoàn toàn tùy chọn và được gắn cờ nổi bật; nhận biết ABX; tệp đang hoạt
  động luôn được sao lưu chính xác từng byte trước mọi lần ghi đè để có thể hoàn tác; có hiệu lực sau khi
  khởi động lại.
- Khôi phục và nhập yêu cầu một xác nhận rõ ràng "điều này ghi đè lên dữ liệu ứng dụng hiện tại" trước khi
  tiếp tục.

Lập lịch và tự động hóa:

- Các bản sao lưu theo lịch với lưu giữ keep-N, được quản lý từ một tab Schedule (theo ứng dụng, theo
  ngày/giờ/tuần với một thời điểm, chế độ và đích đến tùy chọn).
- Tự động sao lưu khi cài đặt hoặc cập nhật: một bộ quan sát opt-in bám theo nhịp của bộ lập lịch, sao lưu các
  ứng dụng mới hoặc được cập nhật ở nền, và chỉ gieo ở lần chạy đầu tiên nên việc bật nó không bao giờ sao lưu
  mọi thứ cùng một lúc. Tôn trọng cài đặt ứng dụng loại trừ (danh sách chặn).

Sao lưu đặc biệt (toàn hệ thống):

- Sao lưu tin nhắn (SMS/MMS), danh bạ và nhật ký cuộc gọi, Wi-Fi và Bluetooth dưới dạng dữ liệu hệ thống thô,
  được lưu trữ trung thực (cùng việc bảo toàn SELinux/xattr và mã hóa age tùy chọn như các bản sao lưu ứng
  dụng). Khôi phục là trung thực trên cùng-thiết-bị/cùng-ROM, cần khởi động lại, và được canh gác sau một lời
  thừa nhận ghi-đè-và-khởi-động-lại nổi bật.
- Bản xuất khả chuyển tùy chọn bên cạnh kho lưu trữ thô: tin nhắn, nhật ký cuộc gọi và danh bạ cũng được ghi
  dưới dạng JSON mở được (đọc bằng sqlite3 đi kèm trực tiếp từ các cơ sở dữ liệu provider, nên nội dung tin
  nhắn có dấu phẩy hoặc xuống dòng vẫn còn nguyên vẹn), cho một bản sao xuyên thiết bị, không cần mô-đun. Bản
  sao khả chuyển cũng được mã hóa khi bản sao lưu được mã hóa, nên nó không bao giờ làm lộ những gì kho lưu
  trữ bảo vệ.

Tích hợp hệ thống:

- Gắn một ứng dụng đã cài làm ứng dụng hệ thống mà không chạm vào phân vùng /system thật: VDBackup dàn dựng
  (các) APK của ứng dụng vào mô-đun con overlay của riêng nó, do trình quản lý root gắn kết. Với NoMount trên
  KernelSU nó được tiêm trực tiếp (không cần khởi động lại); nếu không thì nó áp dụng ở lần khởi động kế tiếp,
  nên nó không bao giờ phụ thuộc vào việc NoMount phải được cài. Chọn vị trí đặt thường hoặc đặc quyền.

WebUI:

- Danh sách ứng dụng hiển thị tên ứng dụng được bản địa hóa thực sự (được phân giải từ APK, nên nó tồn tại
  qua một lần gỡ cài đặt) bên cạnh gói, với các biểu tượng được tải lười, lưu vào bộ nhớ đệm, hiển thị dưới
  dạng các ô bo tròn, nhận biết biểu tượng thích ứng.
- Chạm vào một ứng dụng để mở lịch sử sao lưu của nó và khôi phục bất kỳ bản sao lưu trước đó nào; tab
  Backups hiển thị tên và gói trên các dòng riêng biệt và mở một trang chi tiết cho mỗi bản sao lưu (phiên
  bản, nguồn cài đặt, trạng thái, ngày, kích thước, các mục, số lượng quyền, thiết bị).
- Lọc danh sách ứng dụng theo người dùng/hệ thống/tất cả và sắp xếp theo tên hoặc gói; chọn nhiều ứng dụng và
  sao lưu chúng trong một lô; loại trừ các ứng dụng khỏi sao lưu tự động và theo lịch.
- Chọn những gì để bao gồm và bật/tắt xác minh hoặc chạy thử theo từng bản sao lưu; chọn một lần khôi phục
  chỉ-để-thử giải nén vào staging mà không chạm vào ứng dụng đang chạy.
- Giao diện sáng/tối, bộ chọn màu nhấn, bộ chọn ngôn ngữ, một tab About (kèm các dự án anh em và tệp kê khai kiểm toán nhị phân đi kèm), bộ chọn thư mục cho đích cục bộ, tiến trình thao tác được bản địa hóa với phản hồi tức
  thì, và các hộp thoại trong ứng dụng hiện đại (không có cửa sổ bật lên alert/confirm của hệ thống).
- Điều hướng bằng nút quay lại trở về tab trước đó và đóng các hộp thoại trước; các hộp thoại nổi và ứng dụng
  tồn tại qua việc mở lại bằng cách gắn lại vào các thao tác đang chạy.

Thân thiện với AI và i18n:

- Một bề mặt điều khiển JSON được ghi tài liệu để các tác nhân có thể quản trị mọi hành động mà không cần
  giao diện (`docs/AI-AGENTS.md`); WebUI chỉ là một trong các client của API đó.
- README và toàn bộ tài liệu dự án được dịch sang 21 ngôn ngữ chuẩn (`docs/<lang>/`), với tài liệu được
  phản chiếu sang wiki.
- Việc liệt kê ứng dụng phong phú và giải mã Neo chạy qua một trợ giúp dex được điều khiển với quyền root
  (`IPackageManager` qua ServiceManager), nên chúng hoạt động ở những nơi mà ActivityThread bị treo.

*Tài liệu này được tạo với Claude (Anthropic) và được VD171 duy trì. Hoan nghênh các chỉnh sửa và cải tiến - xem [CONTRIBUTING.md](CONTRIBUTING.md).*

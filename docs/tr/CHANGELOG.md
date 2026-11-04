> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · Türkçe · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Değişiklik Günlüğü

VDBackup'taki tüm kayda değer değişiklikler burada belgelenir. Yalnızca İngilizce.

## v1.01

İlk genel sürüm. Uygulamaları ve verilerini tamamen root olarak, izin istemi olmadan yedekleyen ve geri
yükleyen bir KernelSU/APatch/Magisk WebUI modülü.

Motor ve biçimler:

- Yedekleme/geri yükleme motoru ayrılmış bir root işlemi (`setsid`) olarak çalışır: WebUI'nin veya root
  yöneticisinin kapatılmasından sağ çıkar ve arayüz canlı ilerlemeye `opid` ile yeniden bağlanır.
- Üç yedekleme modu: Full (tar.zst, yerel veya uzak), Snapshot (restic deposu, şifreli ve yinelenenlerden
  arındırılmış) ve Mirror (rclone/rsync 1:1 eşitleme). APK'ler, bir aynada bile, her zaman sıkıştırılır.
- Uygulama başına öğeler: APK (temel + split'ler), `data`, `data_de`, `obb`, harici ve medya. SELinux
  bağlamı, uid/gid, kipler ve xattr/caps korunur; geri yükleme bir `pm install` oturumu kullanır ve
  sahipliği/bağlamı canlı uid'ye yeniden eşler.
- Baştan sona kullanıcı bazında (çok kullanıcılı) farkındalık. Yedekler `/sdcard/VDBackup` altında
  (kullanıcı başına), `/data/adb` dışında saklanır, bu yüzden ilk kilit açımından önce okunamazlar; her
  hedef `<path>/vdbackup` altında ad alanına yerleştirilir.
- Sıkıştırma: yok, lz4, zstd (düzeyler) veya gzip ("uyumluluk modu"). Bir JSON manifestosu cihazı, paketi
  (uygulama etiketi dahil), öğeleri ve izinleri kaydeder.
- `age` ile taşınabilir şifreleme (anahtar üretimi), ayrıca her şifreli yedeğin içinde gönderilen bir PC
  KURTARMA kılavuzu, böylece modül olmadan her yerde şifresi çözülüp çıkarılabilir.

Hedefler ve bulut:

- Hedefler: ekle/listele/test et/sil (yerel, rclone uzak, restic deposu ve isteğe bağlı bir Google Drive
  eşlikçisi); kimlik bilgileri gizlenmiş olarak saklanır, asla açık metin olarak değil.
- rclone uzak birimlerini arayüzden/API'den oluşturun (`remote-add`/`remote-list`/`remote-del`), böylece
  herhangi bir bulut arka ucu (SFTP, SMB, WebDAV, FTP, S3, Google Drive ve daha fazlası) `rclone.conf`
  dosyasını elle düzenlemeden erişilebilir olur.
- Google Drive iki yolla: rclone aracılığıyla (Google Cloud hesabı gerekmez) ya da isteğe bağlı başsız
  eşlikçi uygulama (`ru.vd171.vdbackup`) aracılığıyla; bu uygulama zorunlu bir HMA-OSS gizleme uyarısı
  taşır.
- Ağ ilkesi: bulut aktarımlarının herhangi bir bağlantıyı mı, yalnızca Wi-Fi'yi mi yoksa yalnızca mobil
  veriyi mi kullanabileceğini seçin; manuel ve zamanlanmış işler için uygulanır. Yerel hedefler muaftır.

İçe aktarma (geçiş):

- Neo-Backup'tan içe aktarma, parolayla şifrelenmiş yedekler dahil (AES-256-GCM dex yardımcısı tarafından
  çözülür; WebUI parolayı sorar).
- Android-DataBackup'tan içe aktarma (APK'leri yükle, user/user_de/data arşivlerini çıkar, yeniden eşle).
- Her ikisi de farklı cihazlardaki gerçek yedeklere karşı doğrulandı.

Bütünlük ve güvenlik:

- Sadık sil-sonra-çıkar geri yüklemesi; arşiv başına sha256 doğrulaması (Full için varsayılan olarak
  açık ve Snapshot için bir depo bütünlük kontrolü), kuru çalıştırma ve geri yükleme testi. Arşivler
  eksiksizlik için geri okunur; bozuk bir arşiv ya da geçersiz bir paket adı asla yıkıcı bir geri
  yüklemeyi tetikleyemez ve uzak aktarım hataları bildirilir, asla sessizce geçilmez.
- Seçmeli geri yükleme: bir yedeğin içerdiği öğelerden herhangi bir alt kümeyi geri yükleyin (APK, data,
  korumalı veri, OBB, harici, medya), tümü varsayılan olarak seçili.
- Yedekleri arayüzden/API'den silin (`delete-backup`) ve manuel yedekler için son-N tutma saklaması
  (`prune`); her silme, geri yükleme, budama ve zamanlanmış çalıştırma, uygulamada görüntüleyebileceğiniz
  yerel bir JSON denetim günlüğüne yazılır.
- Çalışma zamanı izinleri ve AppOps manifestoya yakalanır ve geri yüklemede yeniden uygulanır. Kurulum
  kaynağı (installerPackageName) ve etkin/devre dışı durumu da yakalanır ve geri yüklemede yeniden
  uygulanır.
- Kurulum kaynağı sahtekarlığı: varsayılan olarak geri yüklenen bir uygulama kurulum kaynağı olarak Play
  Store'u bildirir (kurulum oturumu aracılığıyla kurulum sırasında ayarlanır, çünkü geri yüklenen bir
  uygulama aksi takdirde sideload edilmiş görünür); genel olarak ve geri yükleme başına değiştirilebilir
  ve kapalıyken yakalanan kaynak korunur. Gelişmiş, katılımlı bir "deep" mod, ayrıca sistem paket
  veritabanını düzenleyerek başlatan paketi ve paket kaynağını sahteler (önce bayt bazında birebir yedek,
  yeniden başlatmadan sonra uygulanır), böylece uygulama tamamen mağazadan kurulmuş görünür.
- SSAID (cihaz ANDROID_ID): kesinlikle isteğe bağlı ve belirgin şekilde işaretlenmiş; ABX farkında; canlı
  dosya, geri alma için herhangi bir üzerine yazmadan önce her zaman bayt bazında birebir yedeklenir;
  yeniden başlatmadan sonra geçerli olur.
- Geri yükleme ve içe aktarma, devam etmeden önce "bu, mevcut uygulama verilerinin üzerine yazar" şeklinde
  açık bir onay gerektirir.

Zamanlama ve otomasyon:

- Bir Schedule sekmesinden yönetilen, keep-N saklamalı zamanlanmış yedekler (uygulama başına,
  günlük/saatlik/haftalık, isteğe bağlı bir saat, mod ve hedefle).
- Kurulumda veya güncellemede otomatik yedekleme: katılımlı bir gözlemci, zamanlayıcı sinyaline binerek
  yeni veya güncellenen uygulamaları arka planda yedekler ve yalnızca ilk çalıştırmada tohumlar, böylece
  onu etkinleştirmek asla her şeyi bir kerede yedeklemez. Hariç tutulan uygulamalar (engelleme listesi)
  ayarına uyar.

Özel (sistem genelinde) yedekler:

- Mesajları (SMS/MMS), kişileri ve arama günlüğünü, Wi-Fi ve Bluetooth'u ham, sadık şekilde arşivlenmiş
  sistem verisi olarak yedekleyin (uygulama yedekleriyle aynı SELinux/xattr koruması ve isteğe bağlı age
  şifrelemesi). Geri yükleme aynı cihaz/aynı ROM sadıktır, yeniden başlatma gerektirir ve belirgin bir
  üzerine-yaz-ve-yeniden-başlat onayının arkasında kapı tutulur.
- Ham arşivin yanında isteğe bağlı taşınabilir dışa aktarım: mesajlar, arama günlüğü ve kişiler ayrıca
  açılabilir JSON olarak da yazılır (paketlenmiş sqlite3 ile doğrudan sağlayıcı veritabanlarından okunur,
  böylece virgül veya satır sonu içeren mesaj gövdeleri bozulmadan korunur), cihazlar arası, modül
  gerektirmeyen bir kopya sağlar. Yedek şifrelendiğinde taşınabilir kopya da şifrelenir, böylece arşivin
  koruduğu şeyi asla sızdırmaz.

Sistem entegrasyonu:

- Kurulu bir uygulamayı, gerçek /system bölümüne dokunmadan bir sistem uygulaması olarak bağlayın:
  VDBackup, uygulamanın APK'larını root yöneticisinin bağladığı kendi overlay alt-modülüne hazırlar.
  KernelSU'da NoMount ile canlı olarak enjekte edilir (yeniden başlatma yok); aksi takdirde bir sonraki
  açılışta uygulanır, böylece asla NoMount'un kurulu olmasına bağlı değildir. Normal veya ayrıcalıklı
  yerleşim seçin.

WebUI:

- Uygulama listesi, paketin yanında gerçek yerelleştirilmiş uygulama adını (APK'den çözülür, böylece bir
  kaldırmadan sonra da kalır) gösterir; simgeler tembel yüklenir, önbelleğe alınır ve yuvarlatılmış,
  uyarlanabilir simge farkındalı kutucuklar olarak işlenir.
- Yedekleme geçmişini açmak ve önceki herhangi bir yedeği geri yüklemek için bir uygulamaya dokunun;
  Backups sekmesi adı ve paketi ayrı satırlarda gösterir ve her yedek için bir ayrıntı sayfası açar
  (sürüm, kurulum kaynağı, durum, tarih, boyut, öğeler, izin sayıları, cihaz).
- Uygulama listesini kullanıcı/sistem/tümü olarak filtreleyin ve ada veya pakete göre sıralayın; birkaç
  uygulama seçip tek bir toplu işlemde yedekleyin; uygulamaları otomatik ve zamanlanmış yedeklerden hariç
  tutun.
- Neyin dahil edileceğini seçin ve yedek başına doğrulama veya kuru çalıştırmayı açıp kapatın; canlı
  uygulamaya dokunmadan hazırlık alanına çıkaran yalnızca-test bir geri yükleme seçin.
- Açık/koyu tema, bir vurgu rengi seçici, dil seçici, bir About sekmesi (kardeş projeler ve paketlenmiş
  ikili dosya denetim manifestosu ile), yerel hedef için bir klasör seçici, anında geri bildirimli
  yerelleştirilmiş işlem ilerlemesi ve modern uygulama içi iletişim kutuları (sistem uyarı/onay açılır
  pencereleri yok).
- Geri düğmesi gezinmesi önceki sekmeye döner ve önce iletişim kutularını kapatır; iletişim kutuları
  yüzergezerdir ve uygulama, canlı işlemlere yeniden bağlanarak yeniden açılmaktan sağ çıkar.

Yapay zeka dostu ve i18n:

- Belgelenmiş bir JSON kontrol yüzeyi, böylece aracılar her eylemi başsız yönetebilir
  (`docs/AI-AGENTS.md`); WebUI, o API'nin yalnızca bir istemcisidir.
- README ve tüm proje belgeleri 21 standart dile çevrilmiştir (`docs/<lang>/`); belgeler wiki'ye
  yansıtılır.
- Zengin uygulama listesi ve Neo şifre çözümü, root olarak çalıştırılan bir dex yardımcısı aracılığıyla
  yürütülür (`IPackageManager`, ServiceManager üzerinden), böylece ActivityThread'in takıldığı yerlerde
  bile çalışırlar.

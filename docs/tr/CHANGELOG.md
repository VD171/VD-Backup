> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · Türkçe · [Українська](../uk/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Değişiklik Günlüğü

VDBackup'taki tüm kayda değer değişiklikler burada belgelenir. Yalnızca İngilizce.

## v1.07

Güvenilirlik:

- Çalışan bir yedek artık kendini uygulamanın işlem grubunun dışına taşıyor; böylece uygulamayı arka plana aldığınızda veya kapattığınızda Android'in app freezer'ı ve phantom-process killer'ı onu duraklatamıyor ya da sonlandıramıyor. Gözetimsiz ve zamanlanmış yedekler güvenilir biçimde tamamlanır; bu, v1.05'teki ayrık işlem çalışmasının üzerine kuruludur.

Geri yükleme:

- Bir uygulamanın izinlerini geri yüklemek artık özel ROM'larda çalışıyor. İptal edilmiş çalışma zamanı izinleri yalnızca pakete göre değil, UID'ye göre yeniden uygulanır; böylece LineageOS tarzı UID başına izin modları doğru şekilde geri gelir. Geri yüklenen bir uygulamanın kaydedilmiş ağ erişim ilkesi (mobil veri ve Wi-Fi izni) de yeniden uygulanır; hem Android 16 hem de 17'de görülen iç içe ve düz netpolicy.xml düzenlerinde.

Ayarlar:

- Artık uygulama bazında, uygulamanın ağ erişim ilkesini de yedeklemeyi ve geri yüklemeyi seçebilirsiniz.
- Ayarları dışa aktarma ve herhangi bir şifreli yedek, bu cihazda şifreleme çalıştırılamadığında artık genel bir aktarım hatası yerine açık ve belirli bir mesajla başarısız oluyor. Uygulama ayrıca yüklenirken şifrelemenin kullanılabilirliğini bildirir.

Arayüz:

- Ayarlar'da arayüz ölçeği kaydırıcısını sürüklemek artık başka bir sekmeye geçmiyor.

Diller:

- Ukraynaca eklendi; böylece arayüz ve belgeler 22 dile ulaştı.

## v1.06

Geri yükleme:

- Bir uygulamayı yeni bir kurulumun üzerine geri yüklemek artık verilerini o kuruluma göre yeniden etiketliyor. İç depolamaya geri yüklenen dosyalara yeni kurulumun SELinux kategorileri verilir; bu da uygulamanın kendi verilerine erişiminin reddedildiği bir çökmeyi düzeltir. Dış depolamaya (Android/data, Android/obb, Android/media) geri yüklenen dosyalar yeni uygulamanın sahipliğine geçirilir; böylece uygulama başlangıçta takılmak yerine onları yeniden okuyabilir. Full, snapshot ve mirror geri yüklemelerinde geçerlidir.

## v1.05

Güvenilirlik:

- Toplu yedekler, uygulamadan çıktığınızda artık yarıda durmuyor. Tüm bir seçim, bir etiket grubu veya zamanlanmış bir çalıştırma artık WebUI kapatıldığında da süren ve bellek baskısı altında sonlandırılmaya karşı korunan tek bir ayrık kök işlemi tarafından yürütülüyor. İlerleme görünümü geri döndüğünüzde yeniden bağlanır.

Ayarlar:

- Ayar yedeği: hedeflerinizi, zamanlamalarınızı, hazır ayarlarınızı ve kayıtlı kimlik bilgilerinizi tek bir şifreli dosyaya aktarın, ardından başka bir cihaza veya temiz kurulumdan sonra içe aktarın. Dosya uzak parolalar içerdiği için her zaman bir parola ifadesi ister ve içe aktarma, zaten var olanları kaldırmadan cihazla birleştirir.
- Kayıtlı uzak kimlik bilgilerini ve cihaz şifreleme anahtarını artık ayarlardan tek adımda silebilirsiniz; hedefleriniz, zamanlamalarınız ve yedekleriniz yerinde kalır.

Güvenlik:

- Yedekler yalnızca bekleme sırasında şifreli kaldıkları yerlerde saklanabilir. İlk kilit açmadan önce okunabilen yollar altındaki hedefler (örneğin /data/adb veya /data/system) reddedilir.
- Kayıtlı kimlik bilgileri, rclone.conf ve age anahtarı artık önceden okunabilen bir konum yerine, ilk kilit açmaya kadar kilitli kalan kimlik bilgisiyle şifreli depolamada bulunuyor; bir modül güncellemesi onları oraya kalıcı olarak taşır.
- Yedekler artık başlamadan önce boş alanı denetler ve yarıda başarısız olmak yerine açık bir mesajla durur.

Geri yükleme:

- Artık yüklü olmayan bir uygulamayı geri yüklemek önce APK'sını yeniden yükler ve yedekte APK olduğunda geri yükleme iletişim kutusu APK seçeneğini sunar. Uygulamayı yükleyemeyen bir geri yükleme, başarıyı iddia etmek yerine hatayı bildirir.
- Uygulama, izin ve ayar işlemleri artık temiz bir ortamda çalışıyor; bu da bazı ROM'larda geri yüklemeyi, app-ops'u ve ayarları engelleyen "Failed transaction" hatalarını düzeltiyor.

Hedefler:

- SD karta veya USB sürücüye yedekleyebilirsiniz: klasör seçici her depolama birimine bir kısayol gösterir ve çıkarılabilir ortam yollarını kabul eder.

## v1.04

Düzeltmeler:

- Yedek klasörleri artık bir dosya yöneticisiyle otomatik olarak açılabilir kalıyor: izinleri kurulumda, her açılışta ve WebUI her açıldığında yeniden uygulanır, böylece yalnızca sahibine kalmış bir klasör (örneğin v1.03.2 öncesi alınmış bir yedek) elle hiçbir adım gerektirmeden kendini onarır.

Gizlilik:

- Yerel yedekleriniz olduğunda, Yedekler sekmesi artık tıpkı yardımcı uygulama gibi yedek klasörünü SUSFS ile gizlemenizi hatırlatır: aksi hâlde varlığı root'u veya kilidi açık bir önyükleyiciyi açığa çıkarabilir. Gizlemeyi SUSFS yapar; hatırlatma yalnızca yolu gösterir.

Yedekler:

- Artık her uygulamanın hangi öğeleri yedekleyeceğini ayarlayabilirsiniz, örneğin yalnızca APK veya APK + OBB, bu toplu, otomatik ve zamanlanmış yedeklere uygulanır. Tek bir elle yedekte yine o anda seçebilirsiniz, uygulamanın kümesinden önceden doldurulmuş olarak. Ayarlar'da, hariç tutulan uygulamalar listesinin yanında ayarlayın.

- Yedek ön ayarları: neyin dahil edileceğine dair adlandırılmış kümeleri kaydedin ve yedek penceresinde tek seçimle uygulayın.
- Çoklu kullanıcı: uygulama yedekleri, özel yedekler ve geri yüklemeler artık seçtiğiniz Android kullanıcısını izler.
- Uygulamalar daha hazır ve eksiksiz döner: ART derleme profilleri ile bildirim dinleyici, erişilebilirlik ve Doze pil muafiyeti izinleri yedeklenir ve geri yüklenir.
- Daha güvenilir geri yükleme: dosya sahipliği ve SELinux bağlamı hedef cihazda yeniden türetilir, böylece geri yükleme cihazlar ve kullanıcılar arasında doğru çalışır.
- Daha güvenli geri yükleme: Play Protect ve kurulum doğrulayıcı yalnızca kurulum sırasında susturulur ve aynen geri alınır; root yöneticisi asla yedeklenmez veya geri yüklenmez; ve kurulum kaynağı doğrulanıp kaydedilir.
- Uygulama etiketleri: uygulamalara games veya work gibi serbest etiketler verin, uygulama listesini etikete göre filtreleyin ve etiketli bir grubun tamamını tek seferde yedekleyin.

## v1.03.2

Düzeltmeler:

- Cihazdaki bulut oturum açma sayfası, oturum açma başarılı olsa bile her zaman "Sign-in failed"
  gösteriyordu. Artık gerçek sonucu gösteriyor.
- Kaydedilen yedekler artık bir dosya yöneticisiyle açılabilir: uygulama başına yedek
  klasörleri yalnızca sahibine açıktı, bu yüzden root bir dosya yöneticisi bile giremiyordu;
  artık /sdcard/VDBackup'ın geri kalanı gibi erişilebilir.

Bulut hedefleri:

- İsteğe bağlı Google Drive companion uygulaması artık derlenip paketleniyor, böylece Google
  Drive, rclone'a ek olarak cihazdaki companion üzerinden çalışır (cihaz hesabınız, elle
  token yapıştırmak yok).

Arayüz:

- Yedekleme iletişim kutusunda bir hedef seçici var; böylece bir yedek, önce Ayarlar'daki varsayılan
  hedefi değiştirmeden seçilen bir bulut veya uzak hedefe gidebilir.
- Uygulama açılışta daha yeni bir sürüm olup olmadığını denetler (saatte en fazla bir kez) ve
  güncelleme afişini yalnızca varsa gösterir; güncel veya çevrimdışıysa sessiz kalır.

## v1.03.1

Yeni yedek kapsamı:

- Yeni özel yedek kategorileri: takvim (takvim sağlayıcısı, artı taşınabilir bir
  `calendar.json` dışa aktarımı), duvar kağıdı (ana ekran ve kilit ekranı duvar kağıdı),
  özel DNS (mod ve belirteç) ve sistem ayarları (system/global/secure ayarlarının tam
  dökümü). Sistem ayarları opt-in'dir ve geri yüklemede cihaz genelindeki ayarların üzerine
  yazar, bu yüzden SSAID gibi açık onay ve tam bir denetim kaydıyla çevrelenmiştir.
- Bağımsız klasör ve dosya yedeği: herhangi bir mutlak yolu (paylaşılan depolama veya
  uygulama verisi) sıkıştırılmış, manifestoyla mühürlenmiş bir arşiv olarak yedekleyin ve
  aynı yola geri yükleyin. Geri yükleme açık bir onay gerektirir.

Daha güvenli geri yükleme:

- Her arşiv, herhangi bir şey yazılmadan önce denetlenir: içeriği hedefinin dışını gösteren
  (mutlak bir yol veya bir `..` bileşeni) bir yedek reddedilir, böylece root olarak çalışan
  bir geri yükleme, hedefin dışına yazması için kandırılamaz.

İlerleme ve zamanlama:

- Canlı ilerleme artık yedekler sırasında aktarım hızını, ETA'yı ve bir öğe sayacını, ayrıca
  bulut yüklemeleri için sağlama toplamıyla doğrulanmış bir adımı ve bir "yeterli alan yok"
  ön kontrolünü gösterir.
- Zamanlanmış işler koşullandırılabilir: yalnızca Wi-Fi'de, yalnızca şarj olurken, yalnızca
  bir pil düzeyinin üzerinde veya yalnızca seçilen hafta günlerinde çalışsın; zamanlanmış bir
  iş, cihaz kritik derecede sıcakken de atlanır. Atlanan bir iş bir sonraki tick'te yeniden
  denenir.

Bulut hedefleri:

- Arayüzden herhangi bir rclone arka ucuna bağlanın: bulut uzağı açılır listesi popüler
  sağlayıcıları (Google Drive, Dropbox, OneDrive, Box, pCloud, Mega, Backblaze B2, S3, SFTP,
  WebDAV, FTP, SMB) ve başka herhangi bir rclone arka uç adını ve onun `key=value`
  parametrelerini yazdığınız bir "Custom (advanced)" seçeneğini sunar, böylece rclone'un tüm
  arka uçlarına erişilebilir.
- Cihaz üzerinde oturum açma (PC gerekmez): tarayıcıyla oturum açmayı gerektiren
  sağlayıcıların (Google Drive, Dropbox, OneDrive, Box, pCloud) telefonun kendi tarayıcısını
  sağlayıcının onay sayfasına açan bir "Authorize in browser" düğmesi vardır; onayladıktan
  sonra uygulamaya dönersiniz ve uzak otomatik olarak kaydedilir, belirteç cihazda yakalanır.
  Bir belirteci elle yapıştırmak yedek olarak kullanılabilir kalır.

Arayüz:

- Ayarlanabilir bir arayüz ölçeği (sürüklenebilir bir kaydırıcı) tüm arayüzü yeniden ölçekler,
  böylece farklı piksel yoğunluklu ekranlara uyar; %100 varsayılandır ve değişmez.
- Arayüz artık Arapça ve Farsça için sağdan sola görüntülenir.
- Yedek sayıları ve bir depolama çubuğu, durum rozetleri, karma ve yolları panoya kopyalama,
  Android tarzı aç/kapat anahtarları ve bir "Check for updates" eylemi olan bir başlangıç genel görünümü.
- Etkinlik günlüğü, anında açılan tam bir ekrandır; bir rapora ekleyebileceğiniz bir günlük
  dosyasını kaydeden bir "Export logs" eylemi vardır.

Düzeltmeler:

- Geri yükleme ve içe aktarma, paketlenmiş `tar`'ı `--no-absolute-names` seçeneğini kabul
  etmeyen cihazlarda artık başarısız olmuyor; arşivin güvenlik kontrolü bu seçenekten
  bağımsızdır.
- "Check for updates", hiçbir HTTP istemcisi paketlenmemiş olsa bile, paketlenmiş rclone'a geri
  dönerek çalışır; ve etkinlik günlüğünün açılması artık uzun sürmüyor.

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
  eşlikçi uygulama (`ru.vd171.vdbackup`) aracılığıyla; bu uygulama zorunlu bir [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) gizleme uyarısı
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

<!-- doc-footer -->

---

> _Bu belgeler Claude (Anthropic) ile oluşturulmuş olup VD171 tarafından yürütülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır; bkz. [CONTRIBUTING.md](CONTRIBUTING.md)._

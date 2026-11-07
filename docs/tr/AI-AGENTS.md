> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · Türkçe · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# VDBackup'ı bir YZ ajanından yönetme

VDBackup, bir YZ asistanının veya ajanının modülün **her** içeriğini ve
eylemini, tıpkı bir kişinin WebUI üzerinden yaptığı gibi başsız (headless) olarak
yönetebilmesi için tasarlanmıştır. WebUI, küçük bir JSON API'nin yalnızca bir
istemcisidir; ajanınız da bir diğeridir. API'yi kullanın, WebUI'yi kazımayın.

## Sözleşme

Her şey, cihazda root olarak çalıştırılan tek bir giriş noktasından geçer:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Argümanlar tek bir JSON nesnesidir, **base64 ile kodlanır** ve tek bir argv token'ı olarak geçirilir.
- Komut, stdout üzerine **tek bir JSON nesnesi** yazdırır: `{"ok":true,...}` veya
  `{"ok":false,"code":"ERR_...","message":"..."}`. Bunu ayrıştırın; asla metni kazımayın.
- Uzun işlemler (`backup`, `restore`, `import`) hemen `{"ok":true,"opid":"..."}` döndürür
  ve **ayrık (detached)** çalışır (çağıran/WebUI kapansa bile hayatta kalırlar). İlerlemelerini
  yoklayın; çağrı döndüğünde henüz bitmemişlerdir.
- `progress` ve `cancel`, bir JSON nesnesi değil, **ham opid dizesinin base64'ünü** alır.

Kabuğunuz için küçük bir yardımcı:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Bunu bir iş istasyonundan yönetmek için, cihaza giden olağan root kanalınız üzerinden
çalıştırın (root olarak adb shell veya SSH-to-root kurulumu). Modül, paketlenmiş ikili
dosyalarla gelir, bu yüzden kurulduktan sonra yerel yedekleme/geri yükleme için
**internet gerektirmez**; yalnızca bulut hedefleri (`rclone`/`restic`/ssh) ağla konuşur.

## Fiiller

| Fiil | Argümanlar (JSON) | Döndürür |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` sayılar (boyutlar bayt cinsinden): yedeği olan uygulamalar, toplam yedek örneği, bağımsız yol yedekleri, zamanlanmış işler, toplam yedek boyutu ve yedek dosya sisteminin boş/toplam alanı. Ayrık değildir, hemen döner; WebUI başlangıç genel görünümü tarafından kullanılır. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | config nesnesi (veya `{key,value}`) | `{ok}` |
| `keygen` | `{}` | şifreleme için `age` anahtar çiftini üretir |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, shell yedeği) |
| `label` | `{package,user?}` | `{ok,label}` (gerçek yerelleştirilmiş uygulama adı, bağlamsız) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; paket+`vc` başına önbelleklenir) |
| `backup` | aşağıya bakın | `{ok,opid}` (ayrık) |
| `restore` | aşağıya bakın | `{ok,opid}` (ayrık) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (ayrık) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | canlı `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (yeniden bağlandıktan sonra yeniden eklenir) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | uygulama listesi / toplu base64 simgeler |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `backup-info` | `{ref}` | `{ok,...}` bir yedeğin tüm ayrıntıları (sürüm, kurulum kaynağı, durum, tarih, mod, boyut, öğeler, izin sayıları, cihaz) |
| `backup-icon` | `{ref}` | `{ok,icon}` manifestten base64 PNG (uygulama kaldırıldığında da çalışır) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref, backups dizininin altında olmalıdır) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` bir paketin en yeni N tanesini tutar |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` denetim günlüğü, en yeni önce |
| `log-export` | `{user?}` | `{ok:true,path}` (yedek dizini altında yazılmış bir `.txt` dosyasının mutlak yolu) veya `{ok:false,code:"ERR_LOG_EXPORT"}`. Etkinlik günlüğünü (`audit.jsonl`) artı kısa bir yapı/cihaz başlığını, bir hata raporuna eklenebilmesi için kullanıcıya görünür tek bir metin dosyasına yazar. Ayrık değildir, hemen döner. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` sistem genelinde yedek (ayrık) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (yeniden başlatma gerekir; `confirm` buna kapı tutar) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` herhangi bir mutlak yolu `tar.zst`+`manifest.json` olarak `.paths/` altında yedekler (ayrık) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` bir yol yedeğini orijinal konumuna geri yükler (`confirm` buna kapı tutar; ayrık) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | kurulu bir uygulamayı sistem uygulaması olarak bağlar (sistemsiz alt-modül; NoMount ile canlı, yoksa sonraki açılışta) |
| `companion-status` / `companion-install` | `{}` | Google Drive eşlikçi durumu / istek üzerine kurulum |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | hedef yönetimi |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone uzak yönetimi (bir `type:"rclone"` hedefinin işaret ettiği `rclone.conf` girdisini oluşturur); `backend` herhangi bir rclone backend'i olabilir, whitelist yok |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (motor, telefon tarayıcısını o onay URL'sine bir Android VIEW intent ile zaten açtı) veya `{ok:false,code:"ERR_AUTHORIZE"}`. Cihaz üzerinde OAuth için yerel bir geri çağırma sunucusunda (`127.0.0.1:53682`) `rclone authorize <backend>` çalıştırır. |
| `remote-authorize-poll` | `{}` | beklerken `{ok:true,done:false,url}`, kullanıcı onay verdiğinde `{ok:true,done:true,token}` (`remote-add`'e geçirilecek `token`), veya `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; bekleyen bir yetkilendirmeyi durdurur. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (`rclone`/`restic` ikili dosyaları mevcut mu, bu `lite` sürümü onları getirebilir mi, bayt cinsinden indirme boyutu) |
| `cloud-fetch` | `{}` | `{ok,opid}` (ayrık) bir `lite` sürümünde `rclone`/`restic` eklentisini indirir+doğrular+kurar |
| `schedule-set` / `schedule-list` / `schedule-delete` | aşağıya bakın | zamanlanmış işler (bir yedekleme veya bir geri yükleme; tek bir uygulamayı, bir kümeyi veya tüm uygulamaları hedefler) |
| `scheduler-tick` | `{}` | vadesi gelen işleri çalıştırır + saklama uygular + otomatik yedekleme gözlemcisi (açılış sinyali bunu çağırır) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (ayrık değil; hemen döner; başarısızlıkta `ERR_UPDATE_CHECK` - aşağıya bakın) |

### `progress` alanları

`progress` sorgulamak, işlemin canlı `progress-<opid>.json` dosyasını döndürür. Bu alanlar
**her zaman mevcuttur**:

| Alan | Tür | Anlamı |
|------|-----|--------|
| `opid` | string | işlem kimliği |
| `percent` | int | 0-100 tamamlanma |
| `phase` | string | mevcut aşama etiketi |
| `item` | string | işlenmekte olan mevcut öğe türü |
| `done` | bool | sonlandırıcı yazımda true (finish / dry-run / restore-test) |

Çalışan bir işlem şu **isteğe bağlı** canlı alanları da taşıyabilir. Bilinmediğinde yok ya da
boştur ve **sonlandırıcı yazımlarda atlanır** (finish / dry-run / restore-test):

| Alan | Tür | Anlamı |
|------|-----|--------|
| `rate` | string | aktarım hızı, örn. `"4.2 MiB/s"` (boş = bilinmiyor) |
| `eta` | string | tahmini kalan süre, örn. `"1m12s"` (boş = bilinmiyor) |
| `n` | int | mevcut öğe dizini (0 = bilinmiyor) |
| `of` | int | toplam öğe sayısı (0 = bilinmiyor) |
| `cur` | string | mevcut öğe adı (boş = yok) |

Bulut aktarımları `rate`/`eta` alanlarını doldurur (percent rclone'dan gelir); yerel Full
yedekleri `n`/`of`/`cur` alanlarını doldurur. Aşama etiketleri sağlama toplamı mühürleme aşaması
**`verified`** ile, bulut aktarımları için, **`transfer`** ve **`mirror <item>`** aşamalarını
içerir.

### `backup` argümanları

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
  "verify": true,                 // her arşivi manifeste karşı yeniden hashler (Full için varsayılan açık)
  "dry_run": false,               // true = boyut planı bildirir, hiçbir şey yazmaz
  "ssaid": false                  // KATILIMLI, aşağıya bakın
}
```

`restore`/`import`, `{ref}` alır (bir yedek dizini / tarama ref'i). `restore` ayrıca şunları
kabul eder: `"items"` (geri yüklenecek, yedeğin öğe türlerinin bir alt kümesi; hepsi için
atlayın), `"test": true` (geçici bir dizine çıkarır ve canlı uygulamaya dokunmadan doğrular),
snapshot/mirror için `"mode"`, şifrelenmiş bir yedek için `"password"`, `"ssaid"` (katılımlı)
ve kurulum kaynağı seçenekleri `"spoof_installer"` (yapılandırmadan varsayılan, kurulum
sırasında yükleyiciyi Play Store olarak ayarlar) ve `"deep_spoof": true` (gelişmiş katılımlı;
ayrıca paket veritabanını düzenleyerek başlatan paketi ve paket kaynağını sahteler, yeniden
başlatmadan sonra uygulanır). `import`, `"from": "neo" | "databackup"` alır ve şifrelenmiş bir
Neo yedeği için `"password"`.

### `schedule-set` argümanları

Bir zamanlama işi **bir** hedef ve bir **eylem** seçer:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (varsayılan) | "restore"
  "package": "com.example.app",   // tek bir uygulama   - VEYA -
  "packages": ["com.a","com.b"],  // bir uygulama kümesi   - VEYA -
  "all": true,                    // tüm uygulamalar, hariç tutulan uygulamalar listesi çıkarılarak
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // kapı: yalnızca Wi-Fi'de çalıştır
  "require_charging": false,      // kapı: yalnızca şarj olurken çalıştır
  "min_battery": 0,               // kapı: yalnızca pil >= bu % iken çalıştır (0-100)
  "days": [1,2,3,4,5]             // kapı: yalnızca bu hafta günlerinde çalıştır (0=Pazar)
}
```

Hedef için `package`, `packages` veya `all` değerlerinden tam olarak **birini** verin. Bir
`backup` işi her zamanki `mode`/`dest`/`keep`/`items` değerlerini korur. Bir `restore` işi
(`action: "restore"`) her hedef uygulamanın **en son** yedeğini (veya açık bir `ref`) geri
yükler ve **her çalıştırmada uygulamanın mevcut verilerinin üzerine yazar** - bu, kasıtlı ve
isteğe bağlıdır, bu yüzden yalnızca doğrudan bir kullanıcı isteği üzerine ayarlayın.

### Zamanlayıcı kapılama

Zamanlanmış bir iş **isteğe bağlı kapı koşulları** taşıyabilir. Vadesi gelen bir işin kapısı
karşılanmadığında iş **atlanır ve zamanlaması ilerletilmeden sonraki tıkta yeniden denenir**
(`last_run` damgalanmaz, böylece koşul sağlanır sağlanmaz çalışır):

| Alan | Tür | Kapı |
|------|-----|------|
| `require_wifi` | bool | yalnızca Wi-Fi'ye bağlıyken çalıştır |
| `require_charging` | bool | yalnızca şarj olurken çalıştır |
| `min_battery` | int (0-100) | yalnızca pil bu düzeyde veya üzerindeyken çalıştır |
| `days` | array of int (0-6, 0=Pazar) | yalnızca bu hafta günlerinde çalıştır |

Bunların üzerine her zaman minimal bir **termal güvenlik** kontrolü uygulanır: cihaz kritik
derecede sıcakken zamanlanmış bir işlem atlanır. Her kapı atlaması denetim izine
`op:"scheduler-gated"` olarak, `reason` değeri `wifi` / `charging` / `battery` / `days` /
`thermal` ile yazılır.

### `remote-add` argümanları

Bir bulut hedefi, bir `rclone` uzak biriminin adını veren bir `type:"rclone"` hedefidir;
o uzak birimi önce `remote-add` ile oluşturun. `backend` **herhangi bir rclone backend'i**
olabilir - whitelist yoktur. `remote-add` herhangi bir backend adını kabul eder (`dropbox`,
`onedrive`, `box`, `pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` ve
rclone'un desteklediği ~70 diğeri) ve `params`, `rclone` yapılandırmasına doğrudan `key=value`
çiftleri olarak aktarılır. Parola alanları gizlenmiş olarak saklanır, asla açık metin olarak
değil. Sık kullanılan backend'ler ve bunların `params`'ı:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = `rclone authorize "drive"` çıktısı)
```

**Cihaz üzerinde OAuth (PC gerekmez).** Tarayıcıyla oturum açmayı gerektiren backend'ler
(Google Drive, Dropbox, OneDrive, Box, pCloud) bir masaüstü ya da elle yapıştırılan bir token
gerektirmez. `remote-authorize`'ı `{backend}` ile çağırın: motor yerel bir geri çağırma
sunucusuna (`127.0.0.1:53682`) karşı `rclone authorize <backend>` çalıştırır ve bir Android
VIEW intent ile telefonun kendi tarayıcısını sağlayıcının onay sayfasında açar, `{ok:true,url}`
(veya `{ok:false,code:"ERR_AUTHORIZE"}`) döndürür. `remote-authorize-poll`'u (`{}`) yoklayın:
beklerken `{ok:true,done:false,url}` ve kullanıcı onayladığında `{ok:true,done:true,token}`
döndürür - o `token`'ı `remote-add`'e geçirin. `remote-authorize-cancel` (`{}`) bekleyen bir
yetkilendirmeyi durdurur (`{ok:true,cancelled:true}`). `rclone authorize "<backend>"` çıktısını
herhangi bir bilgisayardan elle yapıştırmak hâlâ bir yedek olarak desteklenir.

Google Drive'ın iki yolu vardır: bu `drive` uzak birimi (Google Cloud projesi gerekmez,
rclone'un kendi OAuth'unu kullanır - cihaz üzerinde `remote-authorize` ile yetkilendirin veya
herhangi bir bilgisayarda bir kez `rclone authorize "drive"` çalıştırın ve token'ı geçirin) veya
katılımlı eşlik eden uygulama (kendi OAuth istemci kimliğiniz). Her ikisi de sıradan hedefler
olarak sonuçlanır.

### Ağ politikası

`network_policy` config alanı, bulut aktarımlarının hangi bağlantıyı kullanabileceğini denetler:
`any` (varsayılan), `wifi` veya `mobile`. `config-set` ile ayarlayın. `wifi` veya `mobile`
olduğunda, her bulut aktarımı (Full `rclone`/Drive yüklemesi, Mirror senkronizasyonu, uzak
`restic` anlık yedek yedekleme/geri yükleme, Mirror geri yükleme) önce etkin taşıyıcıyı
kontrol eder ve eşleşmezse `ERR_NET_POLICY` ile iptal eder - hem manuel hem de zamanlanmış
işler için. Yerel hedefler asla kapılanmaz.

### Bulut bütünlüğü ve kota

- **Sağlama toplamı mührü (bulut).** Başarılı bir bulut kopyasından sonra motor uzak bir sağlama
  toplamı kontrolü (`rclone check`) çalıştırır; bir uyuşmazlık işlemi `ERR_VERIFY` ile başarısız
  kılar. Yerel tarafla ortak bir karma paylaşmayan arka uçlar atlanır (bir başarısızlık değildir).
- **Kota kontrolü (bulut, Full modu).** Bir `rclone` uzak hedefine Full modunda yüklemeden önce
  motor uzak hedefin boş alanını sorgular (`rclone about --json`) ve yedek sığmayacaksa `ERR_QUOTA`
  ile reddeder. Kota bilgisi bildirmeyen uzak hedefler atlanır. Mirror modu bir delta eşitlemesidir
  ve muaftır.

### Bulut ikilileri (`lite` sürümü)

Bir `full` sürüm tüm ikilileri paketler ve asla ağa ihtiyaç duymaz. `lite` sürüm en büyük ikisini,
`rclone` ve `restic`, atlar ve bir bulut veya snapshot eylemini ilk çalıştırdığınızda onları istek
üzerine getirir. `cloud-status`, bunların zaten mevcut olup olmadığını, bu sürümün onları getirip
getiremeyeceğini ve bayt cinsinden indirme boyutunu bildirir. `cloud-fetch` **ayrık** çalışır
(kendi `opid`'si ile `progress`'i yoklayın): mimariye özgü `rclone`+`restic` eklentisini indirir,
onu modüle gömülü SHA-256 ile doğrular ve çalışma zamanı önbelleğine kurar. İlerleme aşamaları
`downloading`, `verifying` ve `installing`'dir; son kod başarıda `ERR_NONE`, başarısızlıkta
`ERR_FETCH` (indirme başarısız) / `ERR_FETCH_VERIFY` (sağlama toplamı uyuşmuyor, atıldı) olur. Bir
`full` sürümde gereksizdir. `lite` sürümde ikililer mevcut olmadan önce bir bulut veya snapshot
hedefine yapılan `backup`/`restore`, `ERR_CLOUD_FETCHABLE` ile başarısız olur; istemci
`cloud-fetch` çalıştırmayı önermeli, ardından yeniden denemelidir.

### Özel yedek kategorileri

`special-categories`, bir cihazın hangi sistem genelindeki kategorilere sahip olduğunu bildirir;
`special-backup`, `categories` içinde ilettiklerinizi yakalar ve `special-restore` onları yeniden
uygular. Kategoriler şunlardır:

| Kategori | Ne olduğu | Geri yükleme semantiği |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | provider değiştirme (sil + çıkar) |
| `contacts` | kişiler ve arama günlüğü | provider değiştirme (sil + çıkar) |
| `wifi` | kaydedilmiş Wi-Fi ağları | provider değiştirme (sil + çıkar) |
| `bluetooth` | Bluetooth eşleştirmeleri | provider değiştirme (sil + çıkar) |
| `calendar` | takvim provider'ı (`com.android.providers.calendar`, uygulama + veri); ayrıca `calendar.json`'a taşınabilir olarak dışa aktarılır | provider değiştirme (sil + çıkar) |
| `wallpaper` | ana ekran ve kilit ekranı duvar kağıdı artı `wallpaper_info.xml`, ham (ikili) olarak saklanır | dosyalar değiştirilir |
| `dns` | ayarlardan okunan özel DNS modu ve belirteci | idempotent `settings put` |
| `system_settings` | sistem/global/secure ayarlarının tam dökümü | **katılımlı**, idempotent `settings put`, cihaz ayarlarının üzerine yazar |

**`system_settings` kesinlikle katılımlıdır ve geri yüklemede yıkıcıdır.** `ssaid` gibi, geri
yüklendiğinde cihaz genelindeki ayarların üzerine yazar, bu yüzden açık kullanıcı rızasının arkasında
kapı tutulur ve denetim izine yazılır. Onu asla varsayılan olarak seçmeyin; yalnızca doğrudan,
kasıtlı bir kullanıcı isteğinde.

### Bağımsız yol yedeği

`path-backup` / `path-restore`, uygulama başına modelin dışında, paylaşılan depolamada veya `/data`
altında **herhangi bir mutlak yolu** - bir klasör veya tek bir dosya - yedekler ve geri yükler.
Arşiv, backups dizini altındaki `.paths/` içinde VDBackup'ın kendi formatında (SHA-256 ile mühürlü,
şifrelendiğinde bir RECOVERY kitiyle) `tar.zst` artı bir `manifest.json` olarak yazılır.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- Kaynak yol **mutlak** olmalı ve izin verilen köklerden birinin altında olmalıdır:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. Var olmayan bir yol `ERR_NO_PATH` ile
  başarısız olur; izin verilen köklerin dışındaki veya `..` içeren bir yol `ERR_BAD_PATH` ile
  başarısız olur.
- `path-restore`, orijinal konuma geri yazar, bu yüzden yıkıcıdır ve `"confirm": true` gerektirir -
  `special-restore` gibi yüksek sürtünmeli bir kapı. Geçerli bir yol yedeği olmayan bir `ref`,
  `ERR_BAD_REF` ile başarısız olur.
- İkisi de **ayrık** çalışır; döndürülen `opid` ile `progress`'i yoklayın.

### `update-check`

`update-check`, modülün daha yeni bir sürümünün yayınlanıp yayınlanmadığını bildirir, böylece bir
ajan (veya WebUI) bunu gösterebilir. **Hemen dönen bir okuma fiilidir** - ayrık **değildir**,
dolayısıyla sorgulanacak bir `opid` yoktur. Yalnızca kullanıcının açık bir eylemiyle tetiklenir ve
modülün yayınlanmış güncelleme manifestini (`module.prop` içindeki `updateJson` URL'si) paketlenmiş
`curl` ile root tarafındaki bir HTTP isteği üzerinden alır - bu, WebView dışında çalışır, bu yüzden
WebUI'nin CSP'sine tabi değildir - ve yayınlanan `versionCode` ile kurulu olanı karşılaştırır.
**Hiçbir argüman** almaz.

Başarılı olduğunda şunu döner:

| Alan | Tür | Anlamı |
|------|-----|--------|
| `ok` | bool | `true` |
| `current_version` | string | kurulu versionName |
| `current_code` | int | kurulu versionCode |
| `latest_version` | string | yayınlanan versionName |
| `latest_code` | int | yayınlanan versionCode |
| `update_available` | bool | `latest_code`, `current_code`'dan büyük olduğunda `true` |
| `zipUrl` | string | yayınlanan zip'in URL'si |
| `changelog` | string | yayınlanan changelog'un URL'si |
| `notes` | string | sürüm notları |

`updateJson` URL'si yoksa, ağ isteği başarısız olursa veya manifest ayrıştırılamıyorsa
`{"ok":false,"code":"ERR_UPDATE_CHECK"}` döner.

`update-check` yalnızca kullanılabilirliği ve sürüm notlarını **bildirir**; güncellemenin kendisini
root yöneticiniz (KernelSU / APatch / Magisk) modülün `updateJson`'ı aracılığıyla yapar, asla bu
fiil yapmaz.

## Ajanınızın uyması gereken güvenlik korkulukları

- **`ssaid` kesinlikle katılımlıdır (varsayılan kapalı).** Cihaz ANDROID_ID'sini bir sistem
  dosyasını yeniden yazarak yedekler / geri yükler; bir geri yükleme yalnızca yeniden başlatmadan
  sonra uygulanır ve önceki dosya geri alma için her zaman önce kaydedilir. `"ssaid": true`'yu
  yalnızca doğrudan, kasıtlı bir kullanıcı isteğinde gönderin - asla varsayılan olarak.
- **Değiştiren eylemler (restore, delete, import) yıkıcıdır** ve yerel bir denetim izine
  (`logs/audit.jsonl`) kaydedilir. Geri yükleme sadıktır (önce sil-sonra çıkar), bu nedenle
  uygulamayı yedeğin tam durumuna döndürür. Çağırmadan önce niyeti onaylayın.
- **`system_settings`, tıpkı `ssaid` gibi katılımlı ve yıkıcıdır.** Onu geri yüklemek cihaz
  genelindeki ayarların üzerine yazar, bu yüzden onu yalnızca doğrudan bir kullanıcı isteğinde
  gönderin; açık rızayla kapı tutulur ve denetim izine kaydedilir.
- **Geri yükleme idempotenttir.** Ham provider geri yüklemeleri (messages/contacts/wifi/bluetooth/
  calendar) birleştirmek yerine **değiştirir** - provider verisi silinir ve arşiv onun üzerine
  çıkarılır - bu yüzden aynı yedeği yeniden geri yüklemek satırları çoğaltamaz. `dns` ve
  `system_settings` idempotent `settings put` ile yeniden uygulanır.
- **Arşiv çıkarma, yol geçişine (path traversal) karşı korunur.** Geri yükleme root olarak çalışır,
  bu yüzden her arşiv (restore, import, special-restore, path-restore) herhangi bir yazmadan önce
  kontrol edilir: üyeleri mutlak yollar kullanan veya `..` içeren bir arşiv, tek bir yıkıcı yazma
  gerçekleşmeden önce `ERR_UNSAFE_ARCHIVE` ile baştan reddedilir (GNU tar ayrıca `--no-absolute-names`
  ile çalışır). Kurcalanmış bir arşiv, hedef dizininden asla kaçamaz.
- Korumayı (SELinux/uid/gid/modlar/xattr) veya APK kuralını (APK'lar her zaman sıkıştırılır,
  `encrypt_apk` ayarlanmadıkça asla şifrelenmez) **asla zayıflatmayın**.
- JSON çıktısını gerçeğin kaynağı olarak ele alın; `ok`/`code`'u kontrol edin, `progress`'i
  yoklayın ve tahmin etmek yerine `ERR_*` kodlarını yüzeye çıkarın.

Dahili yapı için [ARCHITECTURE.md](ARCHITECTURE.md) ve
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) dosyalarına bakın.

---

*Bu belge Claude (Anthropic) ile oluşturuldu ve VD171 tarafından sürdürülüyor. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır - bkz. [CONTRIBUTING.md](CONTRIBUTING.md).*

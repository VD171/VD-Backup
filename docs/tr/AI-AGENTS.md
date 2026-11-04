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
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` sistem genelinde yedek (ayrık) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (yeniden başlatma gerekir; `confirm` buna kapı tutar) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | kurulu bir uygulamayı sistem uygulaması olarak bağlar (sistemsiz alt-modül; NoMount ile canlı, yoksa sonraki açılışta) |
| `companion-status` / `companion-install` | `{}` | Google Drive eşlikçi durumu / istek üzerine kurulum |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | hedef yönetimi |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone uzak yönetimi (bir `type:"rclone"` hedefinin işaret ettiği `rclone.conf` girdisini oluşturur) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | zamanlanmış işler |
| `scheduler-tick` | `{}` | vadesi gelen işleri çalıştırır + saklama uygular + otomatik yedekleme gözlemcisi (açılış sinyali bunu çağırır) |

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

### `remote-add` argümanları

Bir bulut hedefi, bir `rclone` uzak biriminin adını veren bir `type:"rclone"` hedefidir;
o uzak birimi önce `remote-add` ile oluşturun. Parola alanları gizlenmiş olarak saklanır,
asla açık metin olarak değil. Desteklenen `backend` değerleri ve bunların `params`'ı:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = `rclone authorize "drive"` çıktısı)
```

Google Drive'ın iki yolu vardır: bu `drive` uzak birimi (Google Cloud projesi gerekmez,
rclone'un kendi OAuth'unu kullanır - herhangi bir bilgisayarda bir kez `rclone authorize "drive"`
çalıştırın ve token'ı geçirin) veya katılımlı eşlik eden uygulama (kendi OAuth istemci kimliğiniz).
Her ikisi de sıradan hedefler olarak sonuçlanır.

### Ağ politikası

`network_policy` config alanı, bulut aktarımlarının hangi bağlantıyı kullanabileceğini denetler:
`any` (varsayılan), `wifi` veya `mobile`. `config-set` ile ayarlayın. `wifi` veya `mobile`
olduğunda, her bulut aktarımı (Full `rclone`/Drive yüklemesi, Mirror senkronizasyonu, uzak
`restic` anlık yedek yedekleme/geri yükleme, Mirror geri yükleme) önce etkin taşıyıcıyı
kontrol eder ve eşleşmezse `ERR_NET_POLICY` ile iptal eder - hem manuel hem de zamanlanmış
işler için. Yerel hedefler asla kapılanmaz.

## Ajanınızın uyması gereken güvenlik korkulukları

- **`ssaid` kesinlikle katılımlıdır (varsayılan kapalı).** Cihaz ANDROID_ID'sini bir sistem
  dosyasını yeniden yazarak yedekler / geri yükler; bir geri yükleme yalnızca yeniden başlatmadan
  sonra uygulanır ve önceki dosya geri alma için her zaman önce kaydedilir. `"ssaid": true`'yu
  yalnızca doğrudan, kasıtlı bir kullanıcı isteğinde gönderin - asla varsayılan olarak.
- **Değiştiren eylemler (restore, delete, import) yıkıcıdır** ve yerel bir denetim izine
  (`logs/audit.jsonl`) kaydedilir. Geri yükleme sadıktır (önce sil-sonra çıkar), bu nedenle
  uygulamayı yedeğin tam durumuna döndürür. Çağırmadan önce niyeti onaylayın.
- Korumayı (SELinux/uid/gid/modlar/xattr) veya APK kuralını (APK'lar her zaman sıkıştırılır,
  `encrypt_apk` ayarlanmadıkça asla şifrelenmez) **asla zayıflatmayın**.
- JSON çıktısını gerçeğin kaynağı olarak ele alın; `ok`/`code`'u kontrol edin, `progress`'i
  yoklayın ve tahmin etmek yerine `ERR_*` kodlarını yüzeye çıkarın.

Dahili yapı için [ARCHITECTURE.md](ARCHITECTURE.md) ve
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) dosyalarına bakın.

---

*Bu belge Claude (Anthropic) ile oluşturuldu ve VD171 tarafından sürdürülüyor. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır - bkz. [CONTRIBUTING.md](CONTRIBUTING.md).*

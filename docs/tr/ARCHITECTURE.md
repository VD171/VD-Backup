> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · Türkçe · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Mimari

VDBackup bir root WebUI modülüdür. Üç katmanı vardır: **WebUI** (gördüğünüz şey),
**shell arka ucu** (işi yapan şey, root olarak) ve **paketlenmiş ikili dosyalar**
(arşivleyiciler ve taşıyıcılar). Her şey zaten root olarak çalışır, bu yüzden hiçbir
izin istemi yoktur ve çekirdek özellikler için bir yardımcı uygulama yoktur.

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

## Önemli noktalar

- **Zaten root.** Modül süreci root'tur, bu yüzden motor sade shell'dir. İşin ~%85'i
  saf shell'dir (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Ayrık yürütme.** Yedekleme/geri yükleme, bağımsız bir root süreci olarak `setsid nohup` ile
  çalışır. WebUI'yi kapatmak onları kesmez; arayüz,
  `logs/progress-<opid>.json` dosyasını okuyarak yeniden bağlanır.
- **Framework yardımcısı (~%15).** İnce ayarlı izinler, AppOps, SSAID, StorageStats,
  simgeler ve ayrıcalıklı Wi-Fi, Android framework'üne ihtiyaç duyar. `app_process` üzerinden çalıştırılan
  küçük bir `dex` (yüklü uygulama yok) bunları bir shell yedeğiyle birlikte halleder.
- **Taşınabilirlik.** Yalnızca standart biçimler; yedekler bu modül olmadan bir PC'de açılır.
- **Durum**, `/data/adb/vdbackup/` içinde bulunur (yapılandırma, işler, hedefler, şifrelenmiş
  kimlik bilgileri, günlükler, staging). **Yedekler**, kullanıcıya görünür, kimlik bilgisiyle
  şifrelenmiş depolamaya `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, kullanıcı başına) yazılır,
  `/data/adb` içine değil (orası cihazla şifrelenmiştir ve ilk kilit açmadan önce okunabilir).

## Uyumluluk garantisi

Bir yedek sonsuza dek geri yüklenebilir kalmalıdır. Bu bir elden geldiğince çabası değil, katı bir kuraldır.

**Kapsam.** Garanti, **v1.01'den itibaren** (resmi olarak yayımlanan ilk sürüm) yazılan
yedekleri ve yalnızca resmi olarak yayımlanmış, sürümü çıkmış sürümleri kapsar. v1.00
yalnızca test amaçlı bir derlemeydi ve açıkça kapsam dışıdır; ön sürüm ve geliştirme
derlemeleri kapsanmaz. İlk genel sürümden itibaren, aşağıdaki söz mutlaktır:

- **Yalnızca standart biçimler.** Her arşiv, `zstd`, `gzip` veya `lz4` ile sıkıştırılmış,
  isteğe bağlı olarak `age` ile sarılmış sade bir `tar`'dır. Özel bir kapsayıcı yoktur, bu yüzden
  bir yedek, bu modül olmadan bile sıradan araçlarla herhangi bir PC'de açılabilir (bkz.
  `etc/RECOVERY.md`). Vazgeçemeyeceğimiz bir biçim.
- **Yalnızca eklenen üst veri.** `manifest.json`, `format_version` taşır. Şema yalnızca
  büyür: alanlar *eklenebilir*, asla kaldırılamaz, yeniden adlandırılamaz veya yeniden amaçlandırılamaz. Geri yükleme,
  her alanı savunmacı şekilde okur (eksik isteğe bağlı alanlar bir varsayılana geri döner) ve
  APK'ları dosya adlarına ve uzantılarına göre yükler, arşivleri aynı şekilde çıkarır, sabit bir manifest
  şekli varsaymaz.
- **İleriye dönük uyumlu geri yükleme.** Geri yükleme bir yedeği eski olduğu için asla reddetmez ve
  daha eski bir VDBackup, bilmediği öğe türlerini başarısız olmak yerine sessizce atlar. Bu nedenle daha yeni bir
  VDBackup, herhangi bir daha eski yedeği geri yükler ve standart biçimli arşivler her durumda elle
  geri yüklenebilir kalır.

Kısacası: VDBackup'ın şimdiye dek yazdığı her şey, gelecekteki her VDBackup (ve sade bir PC)
hâlâ geri yükleyebilir. Biçimi, önceki bir yedeği bozacak şekilde değiştirmek
yasaktır; yeni yetenekler `format_version` ve yeni, eklenen alanların arkasına eklenir.

Tam teknik tasarım için (arşiv biçimi, üst veri şeması, pipeline'lar, kripto,
hedefler, içe aktarıcılar) bakımcılar ayrıntılı tasarım notları tutar; bu dosya,
katkıda bulunanlara yönelik genel bakıştır.

<!-- doc-footer -->

---

> _Bu belgeler Claude (Anthropic) ile oluşturulmuş olup VD171 tarafından yürütülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır; bkz. [CONTRIBUTING.md](CONTRIBUTING.md)._

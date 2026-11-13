<!--
  VD BACKUP: full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171. SPDX-License-Identifier: AGPL-3.0-or-later
-->

# VD Backup

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VD Backup" width="320">
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases/latest"><img src="https://img.shields.io/github/v/release/VD171/VD-Backup?label=release&color=0969da" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0--or--later-1a7f37" alt="License"></a>
  <a href="https://github.com/VD171/VD-Backup/releases"><img src="https://img.shields.io/github/downloads/VD171/VD-Backup/total?label=downloads&color=8250df" alt="Downloads"></a>
  <a href="https://github.com/VD171/VD-Backup/stargazers"><img src="https://img.shields.io/github/stars/VD171/VD-Backup?color=d29922" alt="Stars"></a>
</p>

<p align="center">
  <b>Root ile tam uygulama ve veri yedekleme ve geri yükleme, tamamen bir WebUI üzerinden yönetilir.</b><br>
  KernelSU / APatch / Magisk modülü. "su ver" istemi yok, <code>sucompat</code> açıp kapatmak yok.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Releases</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/tr-Home">Wiki</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/tr-USER-GUIDE">Kullanıcı kılavuzu</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/tr-AI-AGENTS">Yapay zeka aracıları</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/tr-ARCHITECTURE">Mimari</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/tr-BINARIES">Paket içi ikili dosyalar</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/tr-CHANGELOG">Değişiklik günlüğü</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

| Home | Apps | Schedule |
|:---:|:---:|:---:|
| ![Home](docs/screenshots/en/home-dark.png) | ![Apps](docs/screenshots/en/apps-dark.png) | ![Schedule](docs/screenshots/en/schedule-dark.png) |
| **Destinations** | **Settings** | **Activity log** |
| ![Destinations](docs/screenshots/en/destinations-dark.png) | ![Settings](docs/screenshots/en/settings-dark.png) | ![Activity log](docs/screenshots/en/activitylog-dark.png) |

---

## Nedir

VDBackup, uygulamalarınızı ve verilerini **temel özellikler için bir yardımcı uygulama olmadan**
yedekleyip geri yükleyen bir root **WebUI modülüdür**: modül zaten root olduğundan "izin verilecek"
bir şey yoktur. Popüler yedekleme uygulamalarının yaptığı her şeyi tek bir yerde, temiz bir WebUI ile
kapsamayı hedefler.

**Swift Backup, Neo-Backup ve Android-DataBackup**'ın açık, root-doğal **ardılı** olarak
tasarlanmıştır: yaptıklarının birleşimi, AGPLv3 altında; hatta geçiş yapabilmeniz için mevcut
Neo-Backup ve Android-DataBackup yedeklerini içe aktarabilir.

## Özellikler

- **Uygulamalar:** APK (temel + split'ler), uygulama verisi (`/data/data`), cihazca korunan veri
  (`/data/user_de`), harici veri (`Android/data`), OBB, medya.
- **Sistem/özel veri:** izinler, AppOps ve (tercihe bağlı) SSAID, root'un izin verdiği yerlerde.
- **Yedekleme modları:** **Full** (taşınabilir `tar.zst`), **Snapshot** (artımlı +
  sürümlü, `restic` ile) ve **Mirror** (1:1 eşitleme, `rclone`/`rsync` ile).
- **Sadık koruma:** SELinux bağlamları, uid/gid, modlar, xattr ve yetenekler (capabilities).
- **Sıkıştırma:** yok / lz4 / zstd / gzip (gzip = "uyumluluk modu", her yerde açılır).
- **Şifreleme:** isteğe bağlı ve taşınabilir (`age` + parola ya da AES-256 zip), asla cihaz
  donanımına bağlı değildir, böylece bir yedek başka bir cihazda geri yüklenir veya bir PC'de açılır.
- **Hedefler:** yerel, SFTP, SCP, SMB, WebDAV, FTP, S3 ve 70'ten fazlası (`rclone`),
  ayrıca `rsync` ve `restic` depoları. Küçük, tercihe bağlı bir yardımcı ile isteğe bağlı Google Drive.
- **Bütünlük:** her arşiv manifest'e karşı doğrulanır; dry-run ve geri yükleme testi, hiçbir şeye
  dokunmadan bir yedeği denetlemenizi sağlar.
- **Seçmeli ve toplu geri yükleme:** bir yedeğin öğelerinden herhangi bir alt kümeyi geri
  yükleyin veya birden çok yedeği seçip hepsini tek seferde geri yükleyin; yedekleri silin ve
  her yıkıcı eylemin bir etkinlik/denetim günlüğünü tutun.
- **Özel yedekler:** mesajlar (SMS/MMS), kişiler ve arama günlüğü, Wi-Fi ve Bluetooth;
  bir PC'de açabileceğiniz isteğe bağlı taşınabilir bir JSON dışa aktarımıyla.
- **Zamanlama + otomasyon:** tek bir uygulamayı, bir kümeyi veya tüm uygulamaları hedefleyen
  **yedekleme veya geri yükleme** için yinelenen işler, keep-N budamayla, ayrıca
  kurulum/güncellemede katılımlı otomatik yedekleme ve bir hariç tutulan uygulamalar listesi.
- **Kurulum kaynağı:** geri yüklenen uygulamalar varsayılan olarak kurulum kaynağı olarak
  Play Store'u bildirir (açılıp kapatılabilir); gelişmiş bir katılımlı seçenek ayrıca başlatan
  paketi ve kaynağı sahteler.
- **Sistem uygulaması bağlama:** kurulu bir uygulamayı, gerçek `/system` bölümüne dokunmadan
  bir sistem uygulaması olarak bağlayın (sistemsiz overlay alt-modülü, NoMount farkında).
- **Arka plan:** yedekleme/geri yükleme ayrı çalışır ve WebUI kapatıldığında da devam eder,
  başlangıç/bitiş bildirimleriyle.
- **İçe taşıma:** mevcut Neo-Backup ve Android-DataBackup yedeklerini, parolayla şifrelenenler
  dahil, içe aktarır.

## Kurulum

1. En son `VD-Backup-vX.Y.zip` dosyasını [Sürümler](https://github.com/VD171/VD-Backup/releases) sayfasından indirin.
2. KernelSU / APatch / Magisk yöneticisinde flaşlayın, hemen kullanılabilir, yeniden başlatma gerekmez.
3. Yedeklemeleri yapılandırmak ve çalıştırmak için modülün **WebUI**'sini açın. Hepsi bu.

**Sürüm çeşitleri.** Her sürüm altı zip halinde gelir. `universal-full`, her mimari ve her ikili gömülü halde (bulut sağlayıcıları için `rclone` ve anlık görüntüler için `restic` dahil), tamamen çevrimdışı, hiçbir şey asla indirilmez, her cihaz, en büyüğü. `universal-lite`, her mimari, ancak en büyük iki ikili (`rclone`, `restic`) çıkarılmış, en küçüğü; yine de yerel, SSH/SFTP ve `rsync` yedeklemelerini indirme olmadan yapar ve bir bulut hedefini (`rclone`) ya da anlık görüntü modunu (`restic`) ilk kez kullandığında o küçük mimariye özel eklentiyi bir kez indirmeyi önerir (SHA-256 ile doğrulanır) ve önbelleğe alır, böylece o özellikler de çalışır. `<abi>-full` (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`), her ikili gömülü halde tek bir mimari, `universal-full`'dan küçük. Mimarini biliyor musun -> `<abi>-full` seç; en küçüğünü istiyor ve bulut ya da anlık görüntüler için tek seferlik bir indirmeye aldırmıyorsan -> `universal-lite`; her şeyi gömülü halde ve hiçbir indirme olmadan istiyorsan (çevrimdışı / kurtarma) -> bir full sürüm. Bkz. [Sürümler](https://github.com/VD171/VD-Backup/releases).

Yeni misiniz? [Kullanıcı kılavuzu](docs/USER-GUIDE.md) sizi kurulumdan geri yüklemeye kadar adım adım götürür.

## Taşınabilirlik

Yedekleriniz **bu modüle kilitli değildir**. Her şey, Windows, macOS ve Linux'ta yaygın araçlar
veya dosya yöneticileriyle açılan standart biçimler (`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`)
kullanır. Şifrelenmiş her yedek, bir PC'de şifre çözme ve çıkarmaya yönelik tam komutları içeren bir
**RECOVERY** notuyla birlikte gelir.

## Derleme

Modül, shell + WebUI'nin yanı sıra `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` için derlenmiş
ABI başına statik ikili dosyalardan (`tar`, `zstd`, `lz4`, `rclone`, `rsync`, ssh, `restic`) oluşur.
[CONTRIBUTING.md](CONTRIBUTING.md) dosyasına ve CI iş akışlarına bakın.

## Yapay zeka dostu

VDBackup, yalnızca insanlara değil, yapay zeka asistanlarına ve aracılarına da kucak açacak
şekilde inşa edilmiştir. Motor JSON konuşur (her `helper.sh` fiili tek bir JSON nesnesi döndürür),
kod, belgeler ve dosya yapısı makine okumasına göre düzenlenmiştir ve yapay zeka destekli katkılar
diğerleri gibi incelenip kabul edilir. Bir aracı, WebUI'nin kullandığı aynı API üzerinden modülün
**her** eylemini arayüzsüz yönetebilir, tam kontrol yüzeyi için
**[docs/AI-AGENTS.md](docs/AI-AGENTS.md)**'ye, katkıda bulunmak için ise
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome)'ye bakın.

## Belgeler

- **[Wiki](https://github.com/VD171/VD-Backup/wiki/tr-Home)**: belgeler, çevrimiçi göz atılabilir.
- **[Kullanıcı kılavuzu](https://github.com/VD171/VD-Backup/wiki/tr-USER-GUIDE)**: baştan sona, kurulumdan geri yüklemeye.
- **[Yapay zeka aracıları](https://github.com/VD171/VD-Backup/wiki/tr-AI-AGENTS)**: her eylemi JSON API üzerinden arayüzsüz yönetin.
- **[Mimari](https://github.com/VD171/VD-Backup/wiki/tr-ARCHITECTURE)** ve **[Dosya yapısı](https://github.com/VD171/VD-Backup/wiki/tr-FILE-STRUCTURE)**: nasıl çalışır.
- **[Paket içi ikili dosyalar](https://github.com/VD171/VD-Backup/wiki/tr-BINARIES)**: her önceden derlenmiş ikili dosyanın kaynağı ve SHA-256 değeri, tam denetim için.
- **[Kurtarma](https://github.com/VD171/VD-Backup/wiki/tr-RECOVERY)**: bir yedeği modül olmadan bilgisayarda açın ve şifresini çözün.
- **[Katkıda bulunma](https://github.com/VD171/VD-Backup/wiki/tr-CONTRIBUTING)** ve **[Güvenlik](https://github.com/VD171/VD-Backup/wiki/tr-SECURITY)**.
- **[Değişiklik günlüğü](https://github.com/VD171/VD-Backup/wiki/tr-CHANGELOG)** ve **[Davranış kuralları](https://github.com/VD171/VD-Backup/wiki/tr-CODE_OF_CONDUCT)**.

<!-- /vd-docs -->

## Ayrıca bakınız

Aynı yazarın kardeş projeleri:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: bir cihaz yöntem hata ayıklayıcısı: her öğeyi, onu okuyabilen her yöntemle okur ve bunları yan yana karşılaştırır.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: Google hizmetleriniz (RCS, Wallet, Play Integrity doğrulamaları), internet olmadan cihazınızda okunur.
- **[COPG-VD](https://github.com/VD171/COPG-VD)**: taze bir parmak izini tutarlı, uyumlu bir profile dönüştüren bir cihaz sahteleyici.
- **[VD-dropbear](https://github.com/VD171/VD-dropbear)**: bağımsız, root yetkili bir SSH artalan süreci (Dropbear).

## İletişim

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
* **GitHub:** @VD171 https://github.com/VD171

## Lisans

[GNU AGPL-3.0-or-later](LICENSE). Ağ copyleft'i: değiştirilmiş bir sürümü, bir hizmet olarak bile
çalıştırırsanız, kaynağını sunmak zorundasınız.

## Ticari markalar

VD Backup bağımsız, resmi olmayan bir projedir. Google LLC veya başka herhangi bir satıcıyla bağlantılı değildir, onlar tarafından onaylanmamış veya desteklenmemiştir. "Google Drive", "Android" ve ilgili adlar ile logolar, ilgili sahiplerinin ticari markalarıdır. VD Backup cihazınızda çalışır ve yalnızca yapılandırdığınız hedeflere yükleme yapar.

## Tags

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`

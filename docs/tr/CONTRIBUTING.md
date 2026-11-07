> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · Türkçe · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# VDBackup'a katkıda bulunma

Yardımınız için teşekkürler! VDBackup'ın katkıda bulunması kolay olacak şekilde
tasarlanmıştır. Bu kılavuz, işlerin nerede durduğunu ve izlediğimiz birkaç kuralı anlatır.

## Projeye bir bakış

VDBackup bir **KernelSU/APatch/Magisk WebUI modülüdür**: shell betikleri + vanilla-JS
WebUI + ABI başına statik ikili dosyalar. Çekirdek özellikler için bir uygulama gerekmez. Bakınız
[ARCHITECTURE.md](ARCHITECTURE.md) ve [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Bu, **Swift Backup, Neo-Backup ve Android-DataBackup**'ın açık, root-yerel
**halefidir** - özelliklerinin AGPLv3 altında birleşimi ve insanların taşınabilmesi için
mevcut Neo-Backup ve Android-DataBackup yedeklerinin içe aktarılması.

## Yapay zeka katkıcıları hoş geldiniz

Yapay zeka asistanları ve ajanları burada sonradan akla gelen değil, birinci sınıf katkıcılardır.

- Proje makinece okunabilir olacak şekilde kurulmuştur: her `helper.sh` fiili tek bir
  JSON nesnesi yazdırır, motor düz POSIX shell'dir ve dosya düzeni
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md) içinde belgelenmiştir.
- Bir ajan, modülün **her** içeriğini ve eylemini bu JSON API aracılığıyla başsız olarak
  yönetebilir - tam kontrol yüzeyi, fiiller ve güvenlik korkulukları
  [docs/AI-AGENTS.md](AI-AGENTS.md) içindedir.
- Yapay zeka destekli yamalar, diğerleriyle aynı koşullarda - kim (ya da ne) yazdığına
  göre değil, doğruluk, netlik ve aşağıdaki kurallara göre incelenip kabul edilir.
- VDBackup'ı bir ajandan sürüyorsanız sözleşme olarak `helper.sh`'nin JSON çıktısını
  kullanın; WebUI'yi kazımayın.
- Herkes için aynı çıta: gerçek özellikler asla zayıflatılmaz, sırlar ve cihaz verileri
  asla depoya girmez (katı [.gitignore](.gitignore) dosyasına bakın) ve değiştiren
  eylemler onaylı ve denetlenmiş kalır.

## Geliştirme kurulumu

- Test için köklenmiş bir cihaz/emülatör (KernelSU, APatch veya Magisk) gerekir.
- Flashlanabilir zip'i oluşturun: `cd module && zip -r9 ../VD-Backup-dev.zip .` ardından flashlayın.
- WebUI `module/webroot/` içindedir (root yöneticisinden açın). Arka uç
  `module/helper.sh` (dağıtıcı) ve `module/worker.sh` (ayrık motor) dosyalarıdır.
- Yerel ikili dosyalar `module/bin/<abi>/` içindedir ve CI tarafından üretilir
  (`.github/scripts/build_bin.sh`); normalde elle yeniden derlemezsiniz.

## Kurallar

- **Her kaynak dosya** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) proje
  banner başlığıyla başlar (mevcut herhangi bir dosyadan kopyalayın). İstisnasız.
- **Kod ve yorumlar İngilizce.** Yorumları minimumda tutun ve yalnızca gerektiğinde kullanın.
- **Em-dash veya en-dash yok**; her zaman düz tire `-` kullanın.
- WebUI **vanilla JS**'tir (tek bir `scripts.js`); framework yok. Root ile yalnızca
  `helper(verb, args)` sarmalayıcısı üzerinden konuşun ve her interpole edilen değeri kaçırın.
- Gerçek bir özelliği (örneğin SELinux/uid/gid/modlarının korunması) **asla zayıflatmayın**.
- Değiştiren eylemler (geri yükleme, silme) onay istemeli ve bir denetim günlüğü yazmalıdır.

## Uluslararasılaştırma (i18n)

- UI dizeleri `module/webroot/lang/` içindedir. İngilizce kanonik yedektir
  (`en.js` + `en.json`); diğer 20 dil `<code>.json`'dur.
- Bir dizeyi eklemek veya değiştirmek için: `en.js` **ve** `en.json`'u düzenleyin, ardından
  her `<code>.json`'u güncelleyin. Görünür bir etikete dokunmak, **tüm** dil dosyalarını
  ve **tüm** `README.<code>.md` dosyalarını güncellemek demektir.
- Çeviriler düz JSON'dur - harika bir ilk katkı. `module/webroot/i18n.js` içindeki dil
  listesine bakın.

## Commit'ler ve PR'ler

- PR'leri odaklı tutun. Neyi ve nedenini açıklayın.
- Commit'lerinizi imzalayın (DCO): `git commit -s` (`Signed-off-by:` ekler).
- CI yeşil kalmalı. İncelemelerde nazik olun - bkz. [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## İyi ilk konular

`good first issue` ve `help wanted` etiketlerini arayın. Çeviriler, belgeler, yeni
`rclone` hedef hazır ayarları ve WebUI cilası harika başlangıç noktalarıdır.

*Bu belge Claude (Anthropic) ile oluşturuldu ve VD171 tarafından sürdürülüyor. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır - bkz. [CONTRIBUTING.md](CONTRIBUTING.md).*

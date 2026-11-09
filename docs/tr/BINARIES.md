> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · Türkçe · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# Paketlenmiş ikili dosyalar: köken ve denetim

Gizlilik ve güvenlik VDBackup'ta isteğe bağlı değildir. Bir yedekleme aracı en kişisel
verilerinizin üzerinde root olarak çalışır, bu yüzden içinde tam olarak neyin sevk
edildiğini görebilmeniz gerekir. Bu sayfa, modülün taşıdığı her önceden derlenmiş ikili
dosyayı ve kütüphaneyi, her birinin nereden geldiğini ve içine opak hiçbir şeyin
sokulmadığını nasıl doğrulayacağınızı belgeler.

## İlkeler

- **Opak hiçbir şey yok.** Sevk edilen her ikili dosya ve kütüphane, sabitlenmiş bir
   sürümde, adı belli ve herkese açık bir üst kaynağa, kayıtlı bir SHA-256 ile izlenebilir.
  Denetleyebileceğiniz bir kayıt olmadan hiçbir blob paketlenmez.
- **Üst kaynaktan çekilir, asla bir cihazdan değil.** Yerel araçlar resmi Termux paket
  deposundan gelir (`packages.termux.dev/apt` adresindeki imzalı `.deb` dosyaları), asla
  bir telefona kurulu bir Termux'tan kopyalanmaz. Derleme yüksek sesle başarısız olur,
  asla doğaçlama yapmaz.
- **Yeniden üretilebilir.** Derlemeyi tekrar çalıştırın, aynı dosyaları alırsınız;
   sabitlenmiş kaynakları tekrar çekin, SHA-256 değerleri eşleşir.
- **Denetim izi modülle birlikte gelir.** Sadece web sitesinde değil - kurulu modülün
  içinde, cihazınızda yolculuk eder, böylece çevrimdışı denetim yapabilirsiniz.

## Ne sevk edilir ve nereden

| Ürün | Kaynak | Nasıl derlenir |
|---|---|---|
| `bin/<abi>/` yerel araçlar (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + bunların `lib/` kapanışı | Resmi **Termux** apt deposu (`packages.termux.dev/apt`), resmi `.deb` paketleri | `.github/scripts/build_bin.sh` `.deb` dosyalarını + geçişli bağımlılıklarını indirir, onları çıkarır ve ikili dosyaların yanı sıra her birinin ihtiyaç duyduğu yalnızca paylaşılan kütüphaneleri kopyalar |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (ABX dönüştürücü yedeği) | **rhythmcache/android-xml-converter** GitHub sürümü (`ABX_RELEASE`, statik ELF) | `build_bin.sh` tarafından sabitlenmiş sürümden indirilir |
| `companion.apk` (isteğe bağlı Google Drive yardımcısı) | **Bu depo**, `companion/` (Gradle/Kotlin) | CI tarafından kaynaktan derlenir ve proje anahtarıyla imzalanır; önceden derlenmiş bir blob değil |
| `vdbackup_helper.dex` (çerçeve yardımcısı) | **Bu depo**, `dex/src/` (Java) | CI tarafından `javac` + `d8` ile kaynaktan derlenir |

Yalnızca ilk iki satır önceden derlenmiş üçüncü taraf ikili dosyalardır; son ikisi bu
depoda bulunan ve okunup yeniden derlenebilen kaynaktan derlenir.

> **Full ve lite sürümler.** lite sürümler küçük kalmak için yalnızca `rclone` ve `restic`
> (en büyük iki ikili dosya) atlar ve bir bulut hedefini ya da anlık görüntü modunu ilk kez
> kullandığınızda bunları isteğe bağlı olarak (SHA-256 ile doğrulanarak) indirir; `rsync` ve
> `ssh`/`scp`/`sftp` hâlâ mevcuttur ve yukarıda listelenen diğer tüm ikili dosyalar da mevcuttur.
> Full sürümler `rclone` (bulut sağlayıcıları) ve `restic` (anlık görüntüler) gömülü halde sunar,
> böylece hiçbir şey asla indirilmez.

## Cihaz üzerindeki manifest: `PROVENANCE.json`

`build_bin.sh` her ABI için bir `bin/<abi>/PROVENANCE.json` yazar. Kurulumda modül
yalnızca cihazınızın ABI'sini tutar, bu yüzden o dosya cihazda
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json` konumunda kalır. Şunları kaydeder:

- `sources`: her üst kaynak `.deb` (paket, sürüm, tam URL, `.deb` dosyasının SHA-256'sı)
   ve ABX sürümü (URL, arşivin SHA-256'sı).
- `files`: `bin/<abi>/` altında gerçekten sevk edilen her dosya (yol, boyut, SHA-256).

Bunu WebUI'de okuyabilirsiniz (**About** sekmesi ona bağlantı verir) veya ajan API'si
üzerinden:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Nasıl doğrulanır (adım adım)

1. **Sevk edilen dosyaları denetleyin.** Cihazınızda `bin/<abi>/` altındaki her dosyanın
   hash'ini alın ve `PROVENANCE.json` içindeki `files[].sha256` ile karşılaştırın:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Dosyaları üst kaynağa karşı denetleyin.** Her `sources[]` girdisi için, sabitlenmiş
   `.deb` dosyasını URL'sinden indirin, SHA-256'sının `deb_sha256` ile eşleştiğini
   doğrulayın, onu çıkarın ve içerdiği ikili dosyaların/kütüphanelerin sevk edilen aynı
   değerlere hash'lendiğini doğrulayın. Termux deposundaki `.deb` dosyaları da Termux'un
   imzalı apt deposundan sunulur.
3. **Sıfırdan yeniden derleyin.** `.github/scripts/build_bin.sh` betiğini kendiniz
   çalıştırın (yalnızca `curl`, `ar`, `tar`, `xz`, `zstd`, `readelf` gerekir) ve çıktıyı
   sevk edilenle karşılaştırın.
4. **Yardımcı ve dex.** `companion/` ve `dex/` dizinlerini kaynaktan yeniden derleyin;
   yardımcının imzası proje anahtarı 'dir (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Raporlama

Sevk edilen herhangi bir dosya kayıtlı kaynağıyla eşleşmezse, bunu bir güvenlik sorunu
olarak değerlendirin ve bildirin (bkz. [SECURITY.md](SECURITY.md)). Bu, tam olarak bu
manifestin görünür kılmak için var olduğu türden bir tutarsızlıktır.

*Bu belge Claude (Anthropic) ile oluşturuldu ve VD171 tarafından sürdürülüyor. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır - bkz. [CONTRIBUTING.md](CONTRIBUTING.md).*

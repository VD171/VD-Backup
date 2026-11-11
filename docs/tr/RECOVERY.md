> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · Türkçe · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, bir yedeği bir PC'de kurtarma (Windows / macOS / Linux)

VDBackup yedekleriniz **standart biçimler** kullanır, dolayısıyla onları bu modül olmadan
her yerde açabilirsiniz. Bir yedek klasörü bir `manifest.json`, APK'ları (`*.apk.zst`) ve
veri arşivlerini (`<item>.tar.zst`, `.tar.gz` veya `.tar.lz4`) içerir, isteğe bağlı olarak
sonunda bir `.age` ile şifrelenmiş.

## İhtiyaç duyabileceğiniz araçlar

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (yalnızca `.age` dosyaları için): https://github.com/FiloSottile/age/releases
- `tar`, macOS, Linux ve modern Windows 10/11'de yerleşiktir.
- `gzip` her yerde yerleşiktir; `.tar.gz` için fazladan hiçbir şeye ihtiyacınız yoktur.

## 1. Şifre çözme (yalnızca dosya `.age` ile bitiyorsa)

Anahtar dosyası (önerilen):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Parola:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Her `*.age` dosyası için aynısını yapın (APK'lar ve veri arşivleri).

## 2. Sıkıştırmayı aç + çıkar

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd lz4 okur):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK'lar yalnızca zstd-sıkıştırılmış APK (ZIP) dosyalarıdır:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Notlar

- Çıkarılan dosyalar göreli yollarını korur; SELinux bağlamı, uid/gid ve modlar tar'ın
  içindedir (ve yalnızca Android'de geri yüklediğinizde düzgün bir şekilde yeniden uygulanır).
- `manifest.json`, her dosyanın tam olarak ne olduğunu, uygulama sürümünü ve orijinal
  sahibi/bağlamı açıklar. Doğruluk kaynağıdır.
- Buradaki hiçbir şey belirli bir cihaza bağlı değildir: aynı parola/anahtar dosyası herhangi
  bir makinede çalışır.

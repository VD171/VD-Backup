> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../id/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · Türkçe · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, bir yedeği bir PC'de kurtarma (Windows / macOS / Linux)

VDBackup yedekleriniz **standart biçimler** kullanır, dolayısıyla onları bu modül olmadan
her yerde açabilirsiniz. Bir yedek klasörü bir `manifest.json`, APK'ları (`*.apk.zst`) ve
veri arşivlerini (`<item>.tar.zst`, `.tar.gz` veya `.tar.lz4`) içerir, isteğe bağlı olarak
sonunda bir `.age` ile şifrelenmiş.

**Veri şifrelenmişse** üst veri de şifrelenir, dolayısıyla yalnızca dosyalara sahip olan birine
hiçbiri sızmaz. Klasör o zaman ayrıca `manifest.full.age` (tam manifesto) ve iki küçük
`stub.*.age` dosyası tutar. Bu durumda `manifest.json` yalnızca küçük, hassas olmayan bir
işaretçidir; gerçek ayrıntılar `manifest.full.age` içindedir. Taşınabilir olan her şey (veri
arşivleri ve `manifest.full.age`) yalnızca **parolanızla** şifresi çözülür - bkz. adım 1.
`stub.dev.age` / `stub.pass.age` dosyaları yalnızca modülün cihaz üzerindeki listeleme
önbelleğidir; bir PC'de bunları yok sayabilirsiniz.

## İhtiyaç duyabileceğiniz araçlar

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`, Linux: `apt install zstd`)
- **age** (yalnızca `.age` dosyaları için): https://github.com/FiloSottile/age/releases
- `tar`, macOS, Linux ve modern Windows 10/11'de yerleşiktir.
- `gzip` her yerde yerleşiktir, `.tar.gz` için fazladan hiçbir şeye ihtiyacınız yoktur.

## 1. Şifre çözme (yalnızca dosya `.age` ile bitiyorsa)

Parola (taşınabilir yol - yalnızca parolanızla herhangi bir PC'de çalışır):

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Her `*.age` dosyası için aynısını yapın (APK'lar ve veri arşivleri). Yedek şifrelenmişse, tam
manifestoyu okumak için `manifest.full.age` dosyasının şifresini aynı şekilde çözün:

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

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

- Çıkarılan dosyalar göreli yollarını korur, SELinux bağlamı, uid/gid ve modlar tar'ın
  içindedir (ve yalnızca Android'de geri yüklediğinizde düzgün bir şekilde yeniden uygulanır).
- `manifest.json`, her dosyanın tam olarak ne olduğunu, uygulama sürümünü ve orijinal
  sahibi/bağlamı açıklar. Doğruluk kaynağıdır. Şifrelenmiş bir yedek için tam manifesto
  `manifest.full.age` dosyasıdır (adım 1'deki gibi şifresini çözün); düz metin `manifest.json`
  yalnızca küçük bir işaretçidir ve hassas veri taşımaz.
- Buradaki hiçbir şey belirli bir cihaza bağlı değildir: aynı parola herhangi
  bir makinede çalışır.

<!-- doc-footer -->

---

> _Bu belgeler Claude (Anthropic) ile oluşturulmuş olup VD171 tarafından yürütülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır, bkz. [CONTRIBUTING.md](CONTRIBUTING.md)._

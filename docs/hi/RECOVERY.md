> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · हिन्दी · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup - एक PC पर एक backup recover करें (Windows / macOS / Linux)

आपके VDBackup backups **standard formats** का उपयोग करते हैं, इसलिए आप उन्हें कहीं भी,
इस मॉड्यूल के बिना खोल सकते हैं। एक backup folder में एक `manifest.json`, APKs
(`*.apk.zst`) और data archives (`<item>.tar.zst`, `.tar.gz` या `.tar.lz4`) होते हैं,
वैकल्पिक रूप से एक trailing `.age` के साथ encrypted।

## Tools जिनकी आपको जरूरत पड़ सकती है

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (केवल `.age` files के लिए): https://github.com/FiloSottile/age/releases
- `tar` macOS, Linux और आधुनिक Windows 10/11 में built-in है।
- `gzip` हर जगह built in है; `.tar.gz` के लिए आपको कुछ अतिरिक्त की जरूरत नहीं।

## 1. Decrypt (केवल अगर file `.age` में समाप्त होती है)

Keyfile (अनुशंसित):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Passphrase:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

प्रत्येक `*.age` file के लिए यही करें (APKs और data archives)।

## 2. Decompress + extract

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd lz4 पढ़ता है):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APKs बस zstd-compressed APK (ZIP) files हैं:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Notes

- Extracted files अपने relative paths रखती हैं; SELinux context, uid/gid और modes
  tar के अंदर हैं (और केवल तभी ठीक से फिर से लागू होते हैं जब आप Android पर restore करते हैं)।
- `manifest.json` ठीक-ठीक वर्णन करता है कि प्रत्येक file क्या है, app version और
  मूल owner/context। यह source of truth है।
- यहाँ कुछ भी एक specific device से बंधा नहीं है: वही passphrase/keyfile किसी भी
  machine पर काम करता है।

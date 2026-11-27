> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · हिन्दी · [Bahasa Indonesia](../id/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, एक PC पर एक backup recover करें (Windows / macOS / Linux)

आपके VDBackup backups **standard formats** का उपयोग करते हैं, इसलिए आप उन्हें कहीं भी,
इस मॉड्यूल के बिना खोल सकते हैं। एक backup folder में एक `manifest.json`, APKs
(`*.apk.zst`) और data archives (`<item>.tar.zst`, `.tar.gz` या `.tar.lz4`) होते हैं,
वैकल्पिक रूप से एक trailing `.age` के साथ encrypted।

**अगर data encrypted है**, तो metadata भी encrypted होता है, इसलिए किसी ऐसे व्यक्ति को जिसके पास केवल
files हैं, इसमें से कुछ भी leak नहीं होता। तब folder में `manifest.full.age` (पूरा manifest) और दो छोटी
`stub.*.age` files भी होती हैं। उस स्थिति में `manifest.json` केवल एक छोटा non-sensitive marker है; असली
details `manifest.full.age` में हैं। सब कुछ portable (data archives और `manifest.full.age`) केवल आपके
**passphrase** से decrypt होता है - step 1 देखें। `stub.dev.age` / `stub.pass.age` files केवल मॉड्यूल की
on-device listing cache हैं; आप उन्हें PC पर अनदेखा कर सकते हैं।

## Tools जिनकी आपको जरूरत पड़ सकती है

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`, Linux: `apt install zstd`)
- **age** (केवल `.age` files के लिए): https://github.com/FiloSottile/age/releases
- `tar` macOS, Linux और आधुनिक Windows 10/11 में built-in है।
- `gzip` हर जगह built in है, `.tar.gz` के लिए आपको कुछ अतिरिक्त की जरूरत नहीं।

## 1. Decrypt (केवल अगर file `.age` में समाप्त होती है)

Passphrase (portable तरीका - केवल आपके passphrase से किसी भी PC पर काम करता है):

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

प्रत्येक `*.age` file के लिए यही करें (APKs और data archives)। अगर backup encrypted है, तो पूरा manifest
पढ़ने के लिए `manifest.full.age` को उसी तरह decrypt करें:

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

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

- Extracted files अपने relative paths रखती हैं, SELinux context, uid/gid और modes
  tar के अंदर हैं (और केवल तभी ठीक से फिर से लागू होते हैं जब आप Android पर restore करते हैं)।
- `manifest.json` ठीक-ठीक वर्णन करता है कि प्रत्येक file क्या है, app version और
  मूल owner/context। यह source of truth है। encrypted backup के लिए पूरा manifest
  `manifest.full.age` है (इसे step 1 की तरह decrypt करें); plaintext `manifest.json`
  केवल एक छोटा marker है और इसमें कोई sensitive data नहीं होता।
- यहाँ कुछ भी एक specific device से बंधा नहीं है: वही passphrase किसी भी
  machine पर काम करता है।

<!-- doc-footer -->

---

> _यह दस्तावेज़ Claude (Anthropic) से तैयार किया गया है और इसे VD171 द्वारा अनुरक्षित किया जाता है। सुधार और संशोधन का स्वागत है, देखें [CONTRIBUTING.md](CONTRIBUTING.md)।_

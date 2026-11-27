> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../id/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · ไทย · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, การกู้คืน backup บน PC (Windows / macOS / Linux)

backup ของ VDBackup ใช้ **รูปแบบมาตรฐาน** ดังนั้นคุณสามารถเปิดมันได้ทุกที่
โดยไม่ต้องมีโมดูลนี้ โฟลเดอร์ backup มี `manifest.json` ตัว APK
(`*.apk.zst`) และ archive ข้อมูล (`<item>.tar.zst`, `.tar.gz` หรือ `.tar.lz4`)
ซึ่งอาจเข้ารหัสด้วย `.age` ต่อท้ายเป็นตัวเลือก

**หากข้อมูลถูกเข้ารหัส** เมทาดาทาก็จะถูกเข้ารหัสด้วย ดังนั้นจึงไม่มีส่วนใดรั่วไหลไปยังใครก็ตามที่มีเพียงไฟล์
จากนั้นโฟลเดอร์จะมี `manifest.full.age` (manifest ฉบับเต็ม) และไฟล์ `stub.*.age` ขนาดเล็กสองไฟล์เพิ่มเข้ามาด้วย
ในกรณีนั้น `manifest.json` เป็นเพียง marker ขนาดเล็กที่ไม่ละเอียดอ่อน รายละเอียดจริงอยู่ใน `manifest.full.age`
ทุกอย่างที่พกพาได้ (archive ข้อมูลและ `manifest.full.age`) ถอดรหัสได้ด้วยเพียง **passphrase** ของคุณ - ดูขั้นตอนที่ 1
ไฟล์ `stub.dev.age` / `stub.pass.age` เป็นเพียงแคชการแสดงรายการบนอุปกรณ์ของโมดูล คุณสามารถเพิกเฉยต่อมันบน PC ได้

## เครื่องมือที่คุณอาจต้องใช้

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`, Linux: `apt install zstd`)
- **age** (เฉพาะไฟล์ `.age`): https://github.com/FiloSottile/age/releases
- `tar` มีมาในตัวบน macOS, Linux และ Windows 10/11 รุ่นใหม่
- `gzip` มีมาในตัวทุกที่, สำหรับ `.tar.gz` คุณไม่ต้องการอะไรเพิ่ม

## 1. ถอดรหัส (เฉพาะเมื่อไฟล์ลงท้ายด้วย `.age`)

Passphrase (วิธีที่พกพาได้ - ใช้ได้บน PC ใดก็ได้ด้วยเพียง passphrase ของคุณ):

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

ทำแบบเดียวกันสำหรับแต่ละไฟล์ `*.age` (ทั้ง APK และ archive ข้อมูล) หาก backup ถูกเข้ารหัส
ให้ถอดรหัส `manifest.full.age` ด้วยวิธีเดียวกันเพื่ออ่าน manifest ฉบับเต็ม:

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

## 2. แตกการบีบอัด + แตกไฟล์

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd อ่าน lz4 ได้):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK เป็นเพียงไฟล์ APK (ZIP) ที่บีบอัดด้วย zstd:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## หมายเหตุ

- ไฟล์ที่แตกออกมายังคง relative path ของมันไว้, SELinux context, uid/gid และ modes
  อยู่ภายใน tar (และจะถูกนำกลับมาใช้อย่างถูกต้องก็ต่อเมื่อคุณ restore บน Android)
- `manifest.json` อธิบายอย่างแน่นอนว่าแต่ละไฟล์คืออะไร เวอร์ชันแอป และ
  เจ้าของ/context เดิม มันเป็นแหล่งความจริง สำหรับ backup ที่เข้ารหัส manifest ฉบับเต็มคือ
  `manifest.full.age` (ถอดรหัสมันตามขั้นตอนที่ 1) ส่วน `manifest.json` ที่เป็น plaintext เป็นเพียง
  marker ขนาดเล็กและไม่มีข้อมูลที่ละเอียดอ่อน
- ไม่มีอะไรในนี้ผูกกับอุปกรณ์เฉพาะ: passphrase เดียวกันใช้ได้บนเครื่องใด
  ก็ได้

<!-- doc-footer -->

---

> _เอกสารนี้สร้างขึ้นด้วย Claude (Anthropic) และดูแลโดย VD171 ยินดีรับการแก้ไขและการปรับปรุง ดู [CONTRIBUTING.md](CONTRIBUTING.md)_

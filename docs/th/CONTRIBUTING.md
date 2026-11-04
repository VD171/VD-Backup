> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · ไทย · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# การร่วมพัฒนา VDBackup

ขอบคุณที่ช่วยกัน! VDBackup ถูกออกแบบมาให้ร่วมพัฒนาได้ง่าย คู่มือนี้จะบอกคุณ
ว่าสิ่งต่าง ๆ อยู่ที่ไหนและมีข้อตกลงไม่กี่ข้อที่เรายึดถือ

## ภาพรวมโครงการ

VDBackup เป็น **โมดูล WebUI ของ KernelSU/APatch/Magisk**: shell script + WebUI แบบ vanilla-JS
+ binary แบบ static ต่อ ABI ไม่ต้องใช้แอปสำหรับฟีเจอร์หลัก ดู
[ARCHITECTURE.md](ARCHITECTURE.md) และ [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md)

เป็น **ผู้สืบทอดแบบเปิดและ root-native ของ Swift Backup, Neo-Backup และ
Android-DataBackup** - การรวมฟีเจอร์ของทั้งหมดไว้ภายใต้ AGPLv3 พร้อมการนำเข้า
backup เดิมของ Neo-Backup และ Android-DataBackup เพื่อให้ผู้คนย้ายข้อมูลได้

## ยินดีต้อนรับผู้ร่วมพัฒนาที่เป็น AI

ผู้ช่วยและ agent ที่เป็น AI เป็นผู้ร่วมพัฒนาระดับชั้นหนึ่งที่นี่ ไม่ใช่สิ่งที่คิดทีหลัง

- โครงการนี้สร้างมาให้เครื่องอ่านได้: ทุก verb ของ `helper.sh` พิมพ์ออกเป็น
  JSON object เดียว เอนจินเป็น POSIX shell ล้วน และโครงสร้างไฟล์มีบันทึกไว้ใน
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md)
- agent สามารถบริหารจัดการ **ทุก** เนื้อหาและการกระทำของโมดูลแบบ headless ผ่าน
  JSON API นั้น - พื้นผิวการควบคุมทั้งหมด, verb และราวกันภัยอยู่ใน
  [docs/AI-AGENTS.md](AI-AGENTS.md)
- แพตช์ที่ช่วยเขียนโดย AI จะได้รับการตรวจและยอมรับด้วยเกณฑ์เดียวกับอื่น ๆ - โดยดูที่
  ความถูกต้อง ความชัดเจน และข้อตกลงด้านล่าง ไม่ใช่ว่าใคร (หรืออะไร) เป็นคนเขียน
- หากคุณขับเคลื่อน VDBackup จาก agent ให้ใช้ output แบบ JSON ของ `helper.sh` เป็น
  สัญญา (contract) อย่าขูด (scrape) WebUI
- มาตรฐานเดียวกันสำหรับทุกคน: ฟีเจอร์จริงจะไม่ถูกทำให้อ่อนลง ความลับและข้อมูลอุปกรณ์
  จะไม่เข้าไปอยู่ใน repo (ดู [.gitignore](.gitignore) ที่เข้มงวด) และการกระทำที่
  เปลี่ยนแปลงข้อมูลยังคงต้องยืนยันและถูกบันทึกตรวจสอบ

## การตั้งค่าสำหรับนักพัฒนา

- คุณต้องมีอุปกรณ์/อีมูเลเตอร์ที่ root แล้ว (KernelSU, APatch หรือ Magisk) เพื่อทดสอบ
- สร้าง zip ที่แฟลชได้: `cd module && zip -r9 ../VD-Backup-dev.zip .` แล้วแฟลชมัน
- WebUI คือ `module/webroot/` (เปิดจากตัวจัดการ root) แบ็กเอนด์คือ
  `module/helper.sh` (dispatcher) และ `module/worker.sh` (เอนจินแบบ detached)
- binary เนทีฟอยู่ใน `module/bin/<abi>/` และสร้างโดย CI
  (`.github/scripts/build_bin.sh`) ปกติคุณไม่ต้อง rebuild มันด้วยมือ

## ข้อตกลง

- **ไฟล์ซอร์สทุกไฟล์** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) ขึ้นต้นด้วย
  banner header ของโครงการ (คัดลอกจากไฟล์ที่มีอยู่) ไม่มีข้อยกเว้น
- **โค้ดและคอมเมนต์เป็นภาษาอังกฤษ** คอมเมนต์ให้น้อยที่สุดและเฉพาะที่จำเป็น
- **ห้ามใช้ em-dash หรือ en-dash** ให้ใช้ hyphen ธรรมดา `-` เสมอ
- WebUI เป็น **vanilla JS** (`scripts.js` ไฟล์เดียว) ไม่มีเฟรมเวิร์ก คุยกับ root ผ่าน
  wrapper `helper(verb, args)` เท่านั้น และ escape ทุกค่าที่แทรกเข้าไป
- **ห้ามทำให้อ่อนลง** ฟีเจอร์จริง (เช่น การคงไว้ซึ่ง SELinux/uid/gid/modes)
- การกระทำที่เปลี่ยนแปลงข้อมูล (restore, delete) ต้องขอการยืนยันและเขียน audit log

## การทำให้รองรับหลายภาษา (i18n)

- สตริง UI อยู่ใน `module/webroot/lang/` ภาษาอังกฤษเป็น fallback หลัก
  (`en.js` + `en.json`) อีก 20 ภาษาเป็น `<code>.json`
- การเพิ่มหรือแก้สตริง: แก้ `en.js` **และ** `en.json` จากนั้นอัปเดตทุก
  `<code>.json` การแตะ label ที่มองเห็นได้หมายถึงต้องอัปเดตไฟล์ภาษา **ทั้งหมด** และ
  `README.<code>.md` **ทั้งหมด**
- คำแปลเป็น JSON ล้วน - เป็นการร่วมพัฒนาครั้งแรกที่ดีเยี่ยม ดูรายการภาษาใน
  `module/webroot/i18n.js`

## Commits และ PRs

- ทำ PR ให้โฟกัส อธิบายว่าทำอะไรและทำไม
- Sign off commit ของคุณ (DCO): `git commit -s` (เพิ่ม `Signed-off-by:`)
- CI ต้องผ่าน (เขียว) เสมอ ใจดีในการรีวิว - ดู [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## issue แรกที่ดีสำหรับมือใหม่

มองหา label `good first issue` และ `help wanted` การแปล, เอกสาร, preset destination
`rclone` ใหม่ และการขัดเกลา WebUI ล้วนเป็นจุดเริ่มต้นที่ยอดเยี่ยม

> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · ไทย · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# การควบคุม VDBackup จาก AI agent

VDBackup ถูกสร้างขึ้นเพื่อให้ผู้ช่วย AI หรือ agent สามารถจัดการเนื้อหาและการกระทำ **ทุกอย่าง**
ของโมดูลได้แบบ headless เช่นเดียวกับที่คนทำผ่าน WebUI WebUI เป็นเพียงไคลเอนต์หนึ่งของ JSON API
ขนาดเล็ก agent ของคุณก็เป็นอีกไคลเอนต์หนึ่ง จงใช้ API อย่าขูด (scrape) WebUI

## สัญญา (contract)

ทุกอย่างผ่านจุดเข้าเดียว รันเป็น root บนอุปกรณ์:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- อาร์กิวเมนต์เป็นอ็อบเจกต์ JSON เดียว **เข้ารหัสแบบ base64** ส่งเป็น argv token เดียว
- คำสั่งจะพิมพ์ **อ็อบเจกต์ JSON หนึ่งตัว** ออกทาง stdout: `{"ok":true,...}` หรือ
  `{"ok":false,"code":"ERR_...","message":"..."}` จง parse ค่านั้น อย่าขูดข้อความเด็ดขาด
- การทำงานที่ใช้เวลานาน (`backup`, `restore`, `import`) จะคืนค่า `{"ok":true,"opid":"..."}`
  ทันทีและรันแบบ **แยกออก (detached)** (ยังทำงานต่อแม้ผู้เรียก/WebUI จะหายไป) จง poll
  ความคืบหน้าของมัน งานยังไม่เสร็จเมื่อการเรียกคืนค่า
- `progress` และ `cancel` รับ **base64 ของสตริง opid ดิบ** ไม่ใช่อ็อบเจกต์ JSON

ตัวช่วยเล็ก ๆ สำหรับ shell ของคุณ:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

หากต้องการควบคุมจากเครื่องเวิร์กสเตชัน ให้รันคำสั่งนั้นผ่านช่องทาง root ปกติของคุณไปยังอุปกรณ์
(adb shell เป็น root หรือการตั้งค่า SSH-to-root) โมดูลมาพร้อมไบนารีที่ฝังมาให้แล้ว ดังนั้น
เมื่อติดตั้งแล้วจะ **ไม่ต้องใช้อินเทอร์เน็ต** สำหรับการ backup/restore ในเครื่อง มีเพียงปลายทาง
คลาวด์ (`rclone`/`restic`/ssh) เท่านั้นที่คุยกับเครือข่าย

## Verbs

| Verb | Args (JSON) | Returns |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | อ็อบเจกต์ config (หรือ `{key,value}`) | `{ok}` |
| `keygen` | `{}` | สร้างคู่กุญแจ `age` สำหรับการเข้ารหัส |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, shell fallback) |
| `label` | `{package,user?}` | `{ok,label}` (ชื่อแอปจริงที่แปลภาษาแล้ว ไม่ขึ้นกับบริบท) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; แคชต่อ package+`vc`) |
| `backup` | ดูด้านล่าง | `{ok,opid}` (detached) |
| `restore` | ดูด้านล่าง | `{ok,opid}` (detached) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (detached) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | ไฟล์ `progress-<opid>.json` แบบสด |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (เชื่อมต่อใหม่หลังรีคอนเนกต์) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | รายการแอป / ไอคอน base64 แบบกลุ่ม |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `backup-info` | `{ref}` | `{ok,...}` รายละเอียดครบของ backup หนึ่งชุด (เวอร์ชัน, แหล่งติดตั้ง, สถานะ, วันที่, mode, ขนาด, items, จำนวนสิทธิ์, อุปกรณ์) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64 PNG จาก manifest (ใช้ได้แม้แอปถูกถอนการติดตั้ง) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref ต้องอยู่ใต้ไดเรกทอรี backups) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` เก็บ N ล่าสุดของ package |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` audit log, ใหม่สุดก่อน |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` การสำรองระดับทั้งระบบ (detached) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (ต้องรีบูต; `confirm` เป็นตัวกั้น) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | เมานต์แอปที่ติดตั้งให้เป็นแอประบบ (โมดูลย่อยแบบ systemless; มีผลทันทีผ่าน NoMount มิฉะนั้นเมื่อบูตครั้งถัดไป) |
| `companion-status` / `companion-install` | `{}` | สถานะ / การติดตั้งตามความต้องการของตัวเสริม Google Drive |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | การจัดการปลายทาง |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | การจัดการ rclone remote (สร้างรายการใน `rclone.conf` ที่ปลายทาง `type:"rclone"` ชี้ไป) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | งานที่ตั้งเวลาไว้ |
| `scheduler-tick` | `{}` | รันงานที่ถึงกำหนด + ใช้การเก็บรักษา (retention) + ตัวสังเกตการสำรองอัตโนมัติ (heartbeat ตอนบูตเรียกสิ่งนี้) |

### อาร์กิวเมนต์ของ `backup`

```json
{
  "package": "com.example.app",
  "user": 0,
  "mode": "full",                 // full | snapshot | mirror
  "compression": "zstd:10",       // none | lz4 | zstd[:N] | gzip
  "items": ["apk","data","data_de","obb","external","media"],
  "encrypt_data": false,
  "encrypt_apk": false,
  "dest": "local",                // local | <destination id>
  "verify": true,                 // re-hash each archive vs the manifest (default on for Full)
  "dry_run": false,               // true = report a size plan, write nothing
  "ssaid": false                  // OPT-IN, see below
}
```

`restore`/`import` รับ `{ref}` (ไดเรกทอรี backup / scan ref) `restore` ยังรับ:
`"items"` (ชุดย่อยของประเภท item ในการสำรองที่จะกู้คืน; ละไว้เพื่อกู้คืนทั้งหมด), `"test": true`
(แตกไฟล์ไปยังไดเรกทอรีชั่วคราวและตรวจสอบ โดยไม่แตะแอปที่ใช้งานจริง), `"mode"` สำหรับ snapshot/mirror,
`"password"` สำหรับ backup ที่เข้ารหัส, `"ssaid"` (opt-in) และตัวเลือกแหล่งติดตั้ง
`"spoof_installer"` (ค่าเริ่มต้นจาก config, ตั้ง installer เป็น Play Store ตอนติดตั้ง) และ
`"deep_spoof": true` (ขั้นสูงแบบ opt-in; ยังปลอมแปลง initiating package และ package source ด้วย
การแก้ไขฐานข้อมูล package มีผลหลังรีบูต) ส่วน `import` รับ `"from": "neo" | "databackup"` และสำหรับ
Neo backup ที่เข้ารหัสไว้ จะรับ `"password"`

### อาร์กิวเมนต์ของ `remote-add`

ปลายทางคลาวด์คือปลายทาง `type:"rclone"` ที่ระบุชื่อ `rclone` remote จงสร้าง remote นั้นก่อน
ด้วย `remote-add` ช่องรหัสผ่านจะถูกเก็บแบบบดบัง (obscured) ไม่เคยเก็บแบบข้อความเปล่า ค่า `backend`
ที่รองรับและ `params` ของมัน:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive มีสองเส้นทาง: `drive` remote นี้ (ไม่ต้องใช้โปรเจกต์ Google Cloud ใช้ OAuth ของ
rclone เอง - รัน `rclone authorize "drive"` ครั้งเดียวบนคอมพิวเตอร์เครื่องใดก็ได้แล้วส่ง token มา)
หรือแอปคู่หู (companion) แบบ opt-in (OAuth client id ของคุณเอง) ทั้งสองทางลงเอยเป็นปลายทางธรรมดา

### นโยบายเครือข่าย

ฟิลด์ config `network_policy` ควบคุมว่าการโอนย้ายไปคลาวด์จะใช้การเชื่อมต่อแบบใดได้:
`any` (ค่าเริ่มต้น), `wifi`, หรือ `mobile` ตั้งค่าด้วย `config-set` เมื่อเป็น `wifi` หรือ
`mobile` การโอนย้ายไปคลาวด์ทุกครั้ง (การอัปโหลด Full `rclone`/Drive, การ sync แบบ Mirror, การ
backup/restore snapshot `restic` ระยะไกล, การ restore แบบ Mirror) จะตรวจทรานสปอร์ตที่ใช้งานอยู่ก่อน
และยกเลิกด้วย `ERR_NET_POLICY` หากไม่ตรงกัน - ทั้งสำหรับงานที่ทำเองและงานที่ตั้งเวลา ปลายทางในเครื่อง
จะไม่ถูกจำกัดเลย

## ราวกันภัยที่ agent ของคุณต้องเคารพ

- **`ssaid` เป็น opt-in อย่างเคร่งครัด (ค่าเริ่มต้นปิด)** มันสำรอง/กู้คืน ANDROID_ID ของอุปกรณ์
  โดยการเขียนทับไฟล์ระบบ การ restore จะมีผลหลังรีบูตเท่านั้น และไฟล์เดิมจะถูกบันทึกไว้ก่อนเสมอ
  เพื่อการย้อนกลับ ส่ง `"ssaid": true` เฉพาะเมื่อผู้ใช้ร้องขอโดยตรงและตั้งใจเท่านั้น -
  ไม่เคยทำโดยปริยาย
- **การกระทำที่เปลี่ยนแปลงข้อมูล (restore, delete, import) เป็นการทำลายข้อมูล** และถูกบันทึกลงใน
  audit trail ในเครื่อง (`logs/audit.jsonl`) การ restore เป็นไปอย่างซื่อตรง (ล้างแล้วจึงแตกไฟล์)
  จึงย้อนแอปกลับไปสู่สถานะที่ตรงเป๊ะของ backup นั้น จงยืนยันเจตนาก่อนเรียกใช้มัน
- **ห้ามลดทอน** การคงรักษา (SELinux/uid/gid/modes/xattr) หรือกฎของ APK (APK จะถูกบีบอัดเสมอ
  ไม่เคยเข้ารหัสเว้นแต่ตั้ง `encrypt_apk`)
- จงถือเอาเอาต์พุต JSON เป็นแหล่งความจริง ตรวจ `ok`/`code`, poll `progress`,
  และแสดงรหัส `ERR_*` ออกมาแทนที่จะเดา

ดู [ARCHITECTURE.md](../ARCHITECTURE.md) และ
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) สำหรับรายละเอียดภายใน

---

*เอกสารนี้สร้างขึ้นด้วย Claude (Anthropic) และดูแลโดย VD171 ยินดีรับการแก้ไขและปรับปรุง - ดู [CONTRIBUTING.md](../CONTRIBUTING.md)*

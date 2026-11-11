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
- การทำงานที่ใช้เวลานาน (`backup`, `restore`, `import`, `backup-batch`, `restore-batch`, `config-export`, `config-import`) จะคืนค่า `{"ok":true,"opid":"..."}`
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
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` จำนวน (ขนาดเป็น bytes): แอปที่มี backup, จำนวน backup instance ทั้งหมด, path backup แบบเดี่ยว, งานที่ตั้งเวลา, ขนาด backup รวม และพื้นที่ว่าง/ทั้งหมดของระบบไฟล์ backup ไม่ detached, คืนค่าทันที; ใช้โดยภาพรวมหน้าแรกของ WebUI |
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
| `list-users` | `{}` | `{ok,users:[{id,name}]}` ผู้ใช้ Android ของอุปกรณ์ (หลายผู้ใช้). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` ไดเรกทอรีย่อยของพาธ (ตัวเลือกโฟลเดอร์). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` การสำรองโฟลเดอร์/ไฟล์แบบเดี่ยว. |
| `provenance` | `{}` | รายการตรวจสอบไบนารีที่มากับแอป (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` รายละเอียดครบของ backup หนึ่งชุด (เวอร์ชัน, แหล่งติดตั้ง, สถานะ, วันที่, mode, ขนาด, items, จำนวนสิทธิ์, อุปกรณ์) |
| `backup-icon` | `{ref}` | `{ok,icon}` base64 PNG จาก manifest (ใช้ได้แม้แอปถูกถอนการติดตั้ง) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref ต้องอยู่ใต้ไดเรกทอรี backups) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` เก็บ N ล่าสุดของ package |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` audit log, ใหม่สุดก่อน |
| `log-export` | `{user?}` | `{ok:true,path}` (path สัมบูรณ์ของไฟล์ `.txt` ที่เขียนไว้ใต้ไดเรกทอรี backup) หรือ `{ok:false,code:"ERR_LOG_EXPORT"}` เขียน activity log (`audit.jsonl`) พร้อมส่วนหัว build/อุปกรณ์สั้น ๆ ลงในไฟล์ข้อความเดียวที่ผู้ใช้มองเห็นได้ เพื่อให้แนบไปกับรายงานบั๊กได้ ไม่ detached, คืนค่าทันที |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` การสำรองระดับทั้งระบบ (detached) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (ต้องรีบูต; `confirm` เป็นตัวกั้น) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` สำรองพาธสัมบูรณ์ใด ๆ เป็น `tar.zst`+`manifest.json` ใต้ `.paths/` (detached) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` กู้คืนการสำรองพาธไปยังตำแหน่งเดิมของมัน (`confirm` เป็นตัวกั้น; detached) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | เมานต์แอปที่ติดตั้งให้เป็นแอประบบ (โมดูลย่อยแบบ systemless; มีผลทันทีผ่าน NoMount มิฉะนั้นเมื่อบูตครั้งถัดไป) |
| `companion-status` / `companion-install` | `{}` | สถานะ / การติดตั้งตามความต้องการของตัวเสริม Google Drive |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | การจัดการปลายทาง |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | การจัดการ rclone remote (สร้างรายการใน `rclone.conf` ที่ปลายทาง `type:"rclone"` ชี้ไป); `backend` เป็น rclone backend ใดก็ได้ ไม่มี whitelist |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (เอนจินได้เปิดเบราว์เซอร์ของโทรศัพท์ไปยัง URL ขอความยินยอมนั้นแล้วผ่าน Android VIEW intent) หรือ `{ok:false,code:"ERR_AUTHORIZE"}` รัน `rclone authorize <backend>` บน callback server ในเครื่อง (`127.0.0.1:53682`) เพื่อทำ OAuth บนอุปกรณ์ |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` ขณะกำลังรอ, `{ok:true,done:true,token}` เมื่อผู้ใช้ให้ความยินยอมแล้ว (`token` ที่จะส่งให้ `remote-add`), หรือ `{ok:false,code:"ERR_AUTHORIZE"}` |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; หยุดการอนุญาตที่ค้างอยู่ |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (ไบนารี `rclone`/`restic` มีอยู่หรือไม่, รุ่น `lite` นี้ดึงมาได้หรือไม่, ขนาดดาวน์โหลดเป็นไบต์) |
| `cloud-fetch` | `{}` | `{ok,opid}` (detached) ดาวน์โหลด+ตรวจสอบ+ติดตั้งส่วนเสริม `rclone`/`restic` บนรุ่น `lite` |
| `schedule-set` / `schedule-list` / `schedule-delete` | ดูด้านล่าง | งานที่ตั้งเวลาไว้ (การ backup หรือการกู้คืน; กำหนดเป้าหมายเป็นแอปเดียว ชุดของแอป หรือแอปทั้งหมด) |
| `scheduler-tick` | `{}` | รันงานที่ถึงกำหนด + ใช้การเก็บรักษา (retention) + ตัวสังเกตการสำรองอัตโนมัติ (heartbeat ตอนบูตเรียกสิ่งนี้) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (ไม่ detached; คืนค่าทันที; `ERR_UPDATE_CHECK` เมื่อล้มเหลว, ดูด้านล่าง) |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) สำรองข้อมูลหลายแอปในหนึ่งปฏิบัติการแบบแยก ความคืบหน้ามี `n`/`of` ความล้มเหลวรายแอปไม่หยุดชุด |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) กู้คืนหลายข้อมูลสำรองในหนึ่งปฏิบัติการแบบแยก ความคืบหน้ามี `n`/`of` ความล้มเหลวรายแอปไม่หยุดชุด |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` วอลุ่มที่จัดเก็บสำหรับตัวเลือกโฟลเดอร์: ภายในและการ์ด SD/USB แบบถอดได้ |
| `config-export` | `{password}` | `{ok,opid}` (detached) ส่งออกการตั้งค่า งาน ปลายทาง ข้อมูลรับรอง และคีย์ไปยังไฟล์เข้ารหัสด้วยวลีรหัสผ่านไฟล์เดียวใต้โฟลเดอร์สำรอง |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) ผสานไฟล์การตั้งค่าที่ส่งออกกลับเข้าอุปกรณ์นี้ (ไม่เขียนทับแบบมืดบอด) |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` แสดงรายการไฟล์การตั้งค่าที่เข้ารหัสที่พร้อมนำเข้า |
| `wipe-credentials` | `{}` | `{ok,wiped}` ลบรหัสผ่านระยะไกลที่บันทึกไว้และคีย์เข้ารหัสของอุปกรณ์ ปลายทาง งาน และข้อมูลสำรองยังคงอยู่ |
| `log-prune` | `{}` | `{ok}` ตัดบันทึกปฏิบัติการที่เสร็จนานแล้ว จำกัดร่องรอยการตรวจสอบ และลบไอคอนที่ล้าสมัย (บริการบูตเรียกสิ่งนี้) |

### ฟิลด์ของ `progress`

การ poll `progress` จะคืน `progress-<opid>.json` แบบสดของการดำเนินการนั้น ฟิลด์เหล่านี้
**มีอยู่เสมอ**:

| ฟิลด์ | ชนิด | ความหมาย |
|-------|------|---------|
| `opid` | string | id ของการดำเนินการ |
| `percent` | int | ความคืบหน้า 0-100 |
| `phase` | string | ป้ายเฟสปัจจุบัน |
| `item` | string | ชนิด item ที่กำลังประมวลผลอยู่ |
| `done` | bool | เป็น true เมื่อเขียนครั้งสุดท้าย (finish / dry-run / restore-test) |

การดำเนินการที่กำลังรันยังอาจมีฟิลด์สดแบบ **ทางเลือก (optional)** เหล่านี้ด้วย ฟิลด์เหล่านี้จะหายไป
หรือว่างเมื่อไม่ทราบค่า และ **ถูกละไว้เมื่อเขียนครั้งสุดท้าย** (finish / dry-run / restore-test):

| ฟิลด์ | ชนิด | ความหมาย |
|-------|------|---------|
| `rate` | string | ความเร็วการถ่ายโอน เช่น `"4.2 MiB/s"` (ว่าง = ไม่ทราบ) |
| `eta` | string | เวลาที่เหลือโดยประมาณ เช่น `"1m12s"` (ว่าง = ไม่ทราบ) |
| `n` | int | ดัชนี item ปัจจุบัน (0 = ไม่ทราบ) |
| `of` | int | จำนวน item ทั้งหมด (0 = ไม่ทราบ) |
| `cur` | string | ชื่อ item ปัจจุบัน (ว่าง = ไม่มี) |

การถ่ายโอนแบบคลาวด์จะเติม `rate`/`eta` (percent มาจาก rclone) ส่วน backup แบบ Full ในเครื่องจะเติม
`n`/`of`/`cur` ป้ายเฟสมีเฟสการผนึก checksum คือ **`verified`** และสำหรับการถ่ายโอนแบบคลาวด์คือ
**`transfer`** และ **`mirror <item>`**

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
  "ssaid": false,                 // OPT-IN, see below
  "manual": false                 // true = single interactive backup, keeps these exact items;
                                  // omit/false lets config.app_items (a per-app item map) override
                                  // the set on bulk, auto and scheduled runs
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

### อาร์กิวเมนต์ของ `schedule-set`

งานที่ตั้งเวลาจะเลือก **หนึ่ง** เป้าหมายและ **การกระทำ** หนึ่งอย่าง:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (ค่าเริ่มต้น) | "restore"
  "package": "com.example.app",   // แอปเดียว   - หรือ -
  "packages": ["com.a","com.b"],  // ชุดของแอป   - หรือ -
  "all": true,                    // แอปทั้งหมด ลบด้วยรายการแอปที่ยกเว้น
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // เกต: รันเฉพาะเมื่ออยู่บน Wi-Fi
  "require_charging": false,      // เกต: รันเฉพาะขณะกำลังชาร์จ
  "min_battery": 0,               // เกต: รันเฉพาะเมื่อแบตเตอรี่ % นี้ขึ้นไป (0-100)
  "days": [1,2,3,4,5]             // เกต: รันเฉพาะวันเหล่านี้ (0=อาทิตย์)
}
```

ระบุ `package`, `packages` หรือ `all` อย่างใดอย่างหนึ่ง **เพียงหนึ่งเดียว** สำหรับเป้าหมาย งาน `backup`
จะคง `mode`/`dest`/`keep`/`items` ตามปกติไว้ ส่วนงาน `restore` (`action: "restore"`) จะกู้คืน backup
**ล่าสุด** ของแต่ละแอปเป้าหมาย (หรือ `ref` ที่ระบุชัดเจน) และ **เขียนทับข้อมูลปัจจุบันของแอปทุกครั้งที่รัน** -
สิ่งนี้เป็นไปโดยเจตนาและเป็นแบบ opt-in ดังนั้นจงตั้งค่ามันเฉพาะเมื่อผู้ใช้ร้องขอโดยตรงเท่านั้น

### การเกต (gating) ของตัวตั้งเวลา

งานที่ตั้งเวลาอาจมี **เงื่อนไขเกตแบบทางเลือก (gate conditions)** ได้ เมื่อเกตของงานที่ถึงกำหนดไม่เป็นไปตามเงื่อนไข
งานนั้นจะ **ถูกข้ามและลองใหม่ใน tick ถัดไป โดยไม่เลื่อนกำหนดการของมัน** (`last_run` ของมันจะไม่ถูกประทับ
ดังนั้นมันจะเริ่มทำงานทันทีที่เงื่อนไขเป็นจริง):

| ฟิลด์ | ชนิด | เกต |
|-------|------|------|
| `require_wifi` | bool | รันเฉพาะขณะอยู่บน Wi-Fi |
| `require_charging` | bool | รันเฉพาะขณะกำลังชาร์จ |
| `min_battery` | int (0-100) | รันเฉพาะเมื่อแบตเตอรี่อยู่ที่ระดับนี้ขึ้นไป |
| `days` | array of int (0-6, 0=อาทิตย์) | รันเฉพาะวันเหล่านี้ |

นอกเหนือจากนี้ จะมีการตรวจ **ความปลอดภัยด้านความร้อน (thermal safety)** ขั้นต่ำเสมอ: การดำเนินการที่ตั้งเวลา
จะถูกข้ามขณะที่อุปกรณ์ร้อนจัดจนอันตราย การข้ามด้วยเกตทุกครั้งจะถูกเขียนลง audit trail เป็น
`op:"scheduler-gated"` พร้อม `reason` อย่างใดอย่างหนึ่งใน `wifi` / `charging` / `battery` / `days` /
`thermal`

### อาร์กิวเมนต์ของ `remote-add`

ปลายทางคลาวด์คือปลายทาง `type:"rclone"` ที่ระบุชื่อ `rclone` remote จงสร้าง remote นั้นก่อน
ด้วย `remote-add` ค่า `backend` เป็น **rclone backend ใดก็ได้**: ไม่มี whitelist `remote-add`
รับชื่อ backend ใดก็ได้ (`dropbox`, `onedrive`, `box`, `pcloud`, `mega`, `b2`, `s3`, `sftp`,
`smb`, `webdav`, `ftp`, `drive` และอีก ~70 ตัวที่ rclone รองรับ) และ `params` จะถูกส่งต่อตรงไป
ยังคอนฟิก `rclone` เป็นคู่ `key=value` ช่องรหัสผ่านจะถูกเก็บแบบบดบัง (obscured) ไม่เคยเก็บแบบ
ข้อความเปล่า backend ที่พบบ่อยและ `params` ของมัน:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**OAuth บนอุปกรณ์ (ไม่ต้องใช้พีซี)** backend ที่ต้องการการลงชื่อเข้าใช้ผ่านเบราว์เซอร์ (Google Drive,
Dropbox, OneDrive, Box, pCloud) ไม่จำเป็นต้องใช้เดสก์ท็อปหรือการวาง token ด้วยมือ เรียก
`remote-authorize` ด้วย `{backend}`: เอนจินจะรัน `rclone authorize <backend>` กับ callback server
ในเครื่อง (`127.0.0.1:53682`) และเปิดเบราว์เซอร์ของโทรศัพท์เองไปยังหน้าขอความยินยอมของผู้ให้บริการ
ผ่าน Android VIEW intent โดยคืนค่า `{ok:true,url}` (หรือ `{ok:false,code:"ERR_AUTHORIZE"}`) แล้ว
poll `remote-authorize-poll` (`{}`): มันจะคืน `{ok:true,done:false,url}` ขณะกำลังรอ และ
`{ok:true,done:true,token}` เมื่อผู้ใช้อนุมัติ, ส่ง `token` นั้นให้ `remote-add` ส่วน
`remote-authorize-cancel` (`{}`) จะหยุดการอนุญาตที่ค้างอยู่ (`{ok:true,cancelled:true}`)
การวางผลลัพธ์ของ `rclone authorize "<backend>"` จากคอมพิวเตอร์เครื่องใดก็ได้ด้วยมือยังคงรองรับเป็นทางเลือกสำรอง

Google Drive มีสองเส้นทาง: `drive` remote นี้ (ไม่ต้องใช้โปรเจกต์ Google Cloud ใช้ OAuth ของ
rclone เอง, อนุญาตบนอุปกรณ์ด้วย `remote-authorize` หรือรัน `rclone authorize "drive"` ครั้งเดียว
บนคอมพิวเตอร์เครื่องใดก็ได้แล้วส่ง token มา) หรือแอปคู่หู (companion) แบบ opt-in (OAuth client id
ของคุณเอง) ทั้งสองทางลงเอยเป็นปลายทางธรรมดา

### นโยบายเครือข่าย

ฟิลด์ config `network_policy` ควบคุมว่าการโอนย้ายไปคลาวด์จะใช้การเชื่อมต่อแบบใดได้:
`any` (ค่าเริ่มต้น), `wifi`, หรือ `mobile` ตั้งค่าด้วย `config-set` เมื่อเป็น `wifi` หรือ
`mobile` การโอนย้ายไปคลาวด์ทุกครั้ง (การอัปโหลด Full `rclone`/Drive, การ sync แบบ Mirror, การ
backup/restore snapshot `restic` ระยะไกล, การ restore แบบ Mirror) จะตรวจทรานสปอร์ตที่ใช้งานอยู่ก่อน
และยกเลิกด้วย `ERR_NET_POLICY` หากไม่ตรงกัน, ทั้งสำหรับงานที่ทำเองและงานที่ตั้งเวลา ปลายทางในเครื่อง
จะไม่ถูกจำกัดเลย

### ความถูกต้องและโควตาของคลาวด์

- **การผนึก checksum (คลาวด์)** หลังจากการคัดลอกขึ้นคลาวด์สำเร็จ เอนจินจะรันการตรวจ checksum ระยะไกล
  (`rclone check`) หากไม่ตรงกันจะทำให้การดำเนินการล้มเหลวด้วย `ERR_VERIFY` ส่วนแบ็กเอนด์ที่ไม่มีแฮช
  ร่วมกับฝั่งในเครื่องจะถูกข้าม (ไม่ถือว่าล้มเหลว)
- **การตรวจโควตา (คลาวด์, โหมด Full)** ก่อนการอัปโหลดโหมด Full ไปยัง `rclone` remote เอนจินจะสอบถาม
  พื้นที่ว่างของ remote (`rclone about --json`) และปฏิเสธด้วย `ERR_QUOTA` หาก backup จะใส่ไม่พอ
  remote ที่ไม่รายงานข้อมูลโควตาจะถูกข้าม โหมด Mirror เป็นการซิงก์แบบเดลตาจึงได้รับการยกเว้น

### ไบนารีคลาวด์ (รุ่น `lite`)

รุ่น `full` รวมไบนารีทั้งหมดไว้ในตัวและไม่ต้องใช้เครือข่ายเลย ส่วนรุ่น `lite` ละไว้สองตัวที่ใหญ่ที่สุดคือ
`rclone` และ `restic` และดึงมาแบบตามต้องการในครั้งแรกที่คุณรันการกระทำแบบคลาวด์หรือ snapshot
`cloud-status` รายงานว่ามีอยู่แล้วหรือไม่, รุ่นนี้ดึงมาได้หรือไม่, และขนาดดาวน์โหลดเป็นไบต์ `cloud-fetch`
ทำงานแบบ **detached** (ให้ poll `progress` ด้วย `opid` ของมัน): มันดาวน์โหลดส่วนเสริม
`rclone`+`restic` ตามสถาปัตยกรรม, ตรวจสอบกับ SHA-256 ที่ฝังไว้ในโมดูล, และติดตั้งลงในแคชรันไทม์
เฟสความคืบหน้าคือ `downloading`, `verifying` และ `installing`; รหัสสุดท้ายคือ `ERR_NONE` เมื่อสำเร็จ
หรือ `ERR_FETCH` (ดาวน์โหลดล้มเหลว) / `ERR_FETCH_VERIFY` (เช็กซัมไม่ตรง ถูกทิ้ง) เมื่อล้มเหลว
บนรุ่น `full` ไม่จำเป็นต้องใช้ การทำ `backup`/`restore` ไปยังปลายทางคลาวด์หรือ snapshot บนรุ่น `lite`
ก่อนที่ไบนารีจะมีอยู่ จะล้มเหลวด้วย `ERR_CLOUD_FETCHABLE`; ไคลเอนต์ควรเสนอให้รัน `cloud-fetch`
แล้วลองใหม่

### หมวดหมู่การสำรองพิเศษ

`special-categories` รายงานว่าอุปกรณ์มีหมวดหมู่ระดับทั้งระบบใดบ้าง; `special-backup` จับหมวดที่คุณส่งใน
`categories` และ `special-restore` นำกลับมาใช้ใหม่ หมวดหมู่มีดังนี้:

| หมวดหมู่ | มันคืออะไร | ความหมายของการกู้คืน |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | แทนที่ผ่าน provider (ล้าง + แตกไฟล์) |
| `contacts` | รายชื่อติดต่อและบันทึกการโทร | แทนที่ผ่าน provider (ล้าง + แตกไฟล์) |
| `wifi` | เครือข่าย Wi-Fi ที่บันทึกไว้ | แทนที่ผ่าน provider (ล้าง + แตกไฟล์) |
| `bluetooth` | การจับคู่ Bluetooth | แทนที่ผ่าน provider (ล้าง + แตกไฟล์) |
| `calendar` | provider ปฏิทิน (`com.android.providers.calendar`, แอป + ข้อมูล); ยังส่งออกแบบพกพาไปยัง `calendar.json` ด้วย | แทนที่ผ่าน provider (ล้าง + แตกไฟล์) |
| `wallpaper` | วอลเปเปอร์หน้าจอหลักและหน้าจอล็อก พร้อม `wallpaper_info.xml` เก็บแบบดิบ (ไบนารี) | แทนที่ไฟล์ |
| `dns` | โหมดและตัวระบุ DNS ส่วนตัว อ่านจากการตั้งค่า | `settings put` แบบ idempotent |
| `system_settings` | ดัมป์การตั้งค่า system/global/secure แบบเต็ม | **opt-in**, `settings put` แบบ idempotent, เขียนทับการตั้งค่าของอุปกรณ์ |

**`system_settings` เป็น opt-in อย่างเคร่งครัดและทำลายข้อมูลเมื่อกู้คืน** เช่นเดียวกับ `ssaid` มันเขียนทับ
การตั้งค่าระดับทั้งอุปกรณ์เมื่อถูกกู้คืน จึงถูกกั้นไว้หลังความยินยอมที่ชัดแจ้งของผู้ใช้และบันทึกลงใน audit trail
อย่าเลือกมันโดยค่าเริ่มต้นเด็ดขาด; เฉพาะเมื่อผู้ใช้ร้องขอโดยตรงและตั้งใจเท่านั้น

### การสำรองพาธแบบ standalone

`path-backup` / `path-restore` สำรองและกู้คืน **พาธสัมบูรณ์ใด ๆ**: โฟลเดอร์หรือไฟล์เดี่ยว, บนที่จัดเก็บ
ที่แชร์หรือใต้ `/data` นอกโมเดลต่อแอป archive ถูกเขียนเป็น `tar.zst` บวก `manifest.json` ในรูปแบบของ
VDBackup เอง (ผนึกด้วย SHA-256 พร้อมชุด RECOVERY เมื่อเข้ารหัส) ใต้ `.paths/` ในไดเรกทอรี backups

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- พาธต้นทางต้องเป็น **สัมบูรณ์** และอยู่ใต้รากที่อนุญาตอย่างใดอย่างหนึ่ง: `/storage/emulated`,
  `/data/media`, `/sdcard`, `/data` พาธที่ไม่มีอยู่จะล้มเหลวด้วย `ERR_NO_PATH`; พาธที่อยู่นอกรากที่อนุญาต
  หรือที่มี `..` จะล้มเหลวด้วย `ERR_BAD_PATH`
- `path-restore` เขียนกลับไปยังตำแหน่งเดิม จึงเป็นการทำลายข้อมูลและต้องการ `"confirm": true` -
  ตัวกั้นที่มีแรงเสียดทานสูง เช่นเดียวกับ `special-restore` `ref` ที่ไม่ใช่การสำรองพาธที่ถูกต้องจะล้มเหลวด้วย
  `ERR_BAD_REF`
- ทั้งคู่รันแบบ **detached**; poll `progress` ด้วย `opid` ที่คืนมา

### `update-check`

`update-check` รายงานว่ามีการเผยแพร่เวอร์ชันใหม่กว่าของโมดูลหรือไม่ เพื่อให้ agent (หรือ WebUI)
แสดงได้ มันเป็น **read verb ที่คืนค่าทันที**: มัน**ไม่ใช่** detached จึงไม่มี `opid` ให้ poll
มันถูกเรียกเฉพาะจากการกระทำที่ชัดเจนของผู้ใช้ และดึง manifest การอัปเดตที่เผยแพร่ของโมดูล
(URL `updateJson` จาก `module.prop`) ด้วย `curl` ที่มาพร้อมกันผ่านคำขอ HTTP ฝั่ง root, สิ่งนี้
ทำงานนอก WebView จึงไม่อยู่ภายใต้ CSP ของ WebUI, แล้วเปรียบเทียบ `versionCode` ที่เผยแพร่กับที่
ติดตั้งอยู่ มัน**ไม่รับอาร์กิวเมนต์ใด ๆ**

เมื่อสำเร็จจะคืนค่า:

| ฟิลด์ | ชนิด | ความหมาย |
|-------|------|----------|
| `ok` | bool | `true` |
| `current_version` | string | versionName ที่ติดตั้ง |
| `current_code` | int | versionCode ที่ติดตั้ง |
| `latest_version` | string | versionName ที่เผยแพร่ |
| `latest_code` | int | versionCode ที่เผยแพร่ |
| `update_available` | bool | `true` เมื่อ `latest_code` มากกว่า `current_code` |
| `zipUrl` | string | URL ของ zip ที่เผยแพร่ |
| `changelog` | string | URL ของ changelog ที่เผยแพร่ |
| `notes` | string | บันทึกการเผยแพร่ |

หากไม่มี URL `updateJson` คำขอเครือข่ายล้มเหลว หรือ parse manifest ไม่ได้ มันจะคืนค่า
`{"ok":false,"code":"ERR_UPDATE_CHECK"}`

`update-check` เพียง **รายงาน** ความพร้อมใช้งานและบันทึกการเผยแพร่เท่านั้น ส่วนการอัปเดตจริงทำโดย
ตัวจัดการ root ของคุณ (KernelSU / APatch / Magisk) ผ่าน `updateJson` ของโมดูล ไม่ใช่โดย verb นี้

## ราวกันภัยที่ agent ของคุณต้องเคารพ

- **`ssaid` เป็น opt-in อย่างเคร่งครัด (ค่าเริ่มต้นปิด)** มันสำรอง/กู้คืน ANDROID_ID ของอุปกรณ์
  โดยการเขียนทับไฟล์ระบบ การ restore จะมีผลหลังรีบูตเท่านั้น และไฟล์เดิมจะถูกบันทึกไว้ก่อนเสมอ
  เพื่อการย้อนกลับ ส่ง `"ssaid": true` เฉพาะเมื่อผู้ใช้ร้องขอโดยตรงและตั้งใจเท่านั้น -
  ไม่เคยทำโดยปริยาย
- **การกระทำที่เปลี่ยนแปลงข้อมูล (restore, delete, import) เป็นการทำลายข้อมูล** และถูกบันทึกลงใน
  audit trail ในเครื่อง (`logs/audit.jsonl`) การ restore เป็นไปอย่างซื่อตรง (ล้างแล้วจึงแตกไฟล์)
  จึงย้อนแอปกลับไปสู่สถานะที่ตรงเป๊ะของ backup นั้น จงยืนยันเจตนาก่อนเรียกใช้มัน
- **`system_settings` เป็น opt-in และทำลายข้อมูล เหมือน `ssaid` ทุกประการ** การกู้คืนมันจะเขียนทับ
  การตั้งค่าระดับทั้งอุปกรณ์ จงส่งมันเฉพาะเมื่อผู้ใช้ร้องขอโดยตรง; มันถูกกั้นด้วยความยินยอมที่ชัดแจ้งและถูกบันทึกใน
  audit trail
- **การกู้คืนเป็นแบบ idempotent** การกู้คืน provider แบบดิบ (messages/contacts/wifi/bluetooth/
  calendar) จะ **แทนที่** แทนที่จะผสาน, ข้อมูล provider ถูกล้างและ archive ถูกแตกทับลงไป, ดังนั้น
  การกู้คืน backup เดิมซ้ำจึงไม่สามารถสร้างแถวซ้ำได้ ส่วน `dns` และ `system_settings` ถูกนำกลับมาใช้ด้วย
  `settings put` แบบ idempotent
- **การแตก archive มีการป้องกัน path traversal** การ restore รันเป็น root ดังนั้นทุก archive (restore,
  import, special-restore, path-restore) ถูกตรวจก่อนการเขียนใด ๆ: archive ที่สมาชิกใช้พาธสัมบูรณ์หรือมี
  `..` จะถูกปฏิเสธตั้งแต่ต้นด้วย `ERR_UNSAFE_ARCHIVE` ก่อนที่จะมีการเขียนทำลายข้อมูลแม้แต่ครั้งเดียว
  (GNU tar ยังรันด้วย `--no-absolute-names`) archive ที่ถูกดัดแปลงไม่มีวันหลุดออกจากไดเรกทอรีเป้าหมายได้
- **ห้ามลดทอน** การคงรักษา (SELinux/uid/gid/modes/xattr) หรือกฎของ APK (APK จะถูกบีบอัดเสมอ
  ไม่เคยเข้ารหัสเว้นแต่ตั้ง `encrypt_apk`)
- จงถือเอาเอาต์พุต JSON เป็นแหล่งความจริง ตรวจ `ok`/`code`, poll `progress`,
  และแสดงรหัส `ERR_*` ออกมาแทนที่จะเดา

ดู [ARCHITECTURE.md](ARCHITECTURE.md) และ
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) สำหรับรายละเอียดภายใน

---

*เอกสารนี้สร้างขึ้นด้วย Claude (Anthropic) และดูแลโดย VD171 ยินดีรับการแก้ไขและปรับปรุง, ดู [CONTRIBUTING.md](CONTRIBUTING.md)*

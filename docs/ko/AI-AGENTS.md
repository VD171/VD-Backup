> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · 한국어 · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# AI 에이전트에서 VDBackup 구동하기

VDBackup은 AI 어시스턴트나 에이전트가 사람이 WebUI로 하는 것과 똑같이, 모듈의 **모든**
콘텐츠와 동작을 헤드리스로 관리할 수 있도록 만들어졌습니다. WebUI는 작은 JSON API의 한
클라이언트일 뿐이며, 당신의 에이전트는 또 다른 클라이언트입니다. API를 사용하고, WebUI를
스크래핑하지 마세요.

## 계약

모든 것은 기기에서 root로 실행되는 하나의 진입점을 통합니다:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- 인자는 단일 JSON 객체이며, **base64로 인코딩**되어 하나의 argv 토큰으로 전달됩니다.
- 명령은 stdout에 **하나의 JSON 객체**를 출력합니다: `{"ok":true,...}` 또는
  `{"ok":false,"code":"ERR_...","message":"..."}`. 이를 파싱하고, 절대 텍스트를 스크래핑하지 마세요.
- 긴 작업(`backup`, `restore`, `import`)은 즉시 `{"ok":true,"opid":"..."}`를 반환하고
  **분리된(detached)** 상태로 실행됩니다(호출자/WebUI가 사라져도 살아남습니다). 그 진행
  상황을 폴링하세요. 호출이 반환되었다고 해서 끝난 것이 아닙니다.
- `progress`와 `cancel`은 JSON 객체가 아니라 **원시 opid 문자열의 base64**를 받습니다.

셸에서 쓸 작은 헬퍼:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

워크스테이션에서 구동하려면, 기기로 향하는 평소의 root 채널(root로 실행되는 adb shell이나
SSH-to-root 설정)을 통해 그 명령을 실행하세요. 모듈은 바이너리를 번들로 제공하므로, 한번
설치되면 로컬 백업/복원에는 **인터넷이 필요 없습니다**. 클라우드 대상(`rclone`/`restic`/ssh)만
네트워크와 통신합니다.

## 동사(Verb)

| Verb | Args (JSON) | Returns |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` 개수(크기는 바이트 단위): 백업이 있는 앱, 전체 백업 인스턴스, 독립 path 백업, 예약 작업, 전체 백업 크기, 그리고 백업 파일 시스템의 여유/전체. 비 detached이며 즉시 반환; WebUI 홈 개요에서 사용. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | config 객체 (또는 `{key,value}`) | `{ok}` |
| `keygen` | `{}` | 암호화용 `age` 키쌍을 생성 |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, shell 폴백) |
| `label` | `{package,user?}` | `{ok,label}` (실제 현지화된 앱 이름, 컨텍스트 무관) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; package+`vc`별 캐시) |
| `backup` | 아래 참고 | `{ok,opid}` (detached) |
| `restore` | 아래 참고 | `{ok,opid}` (detached) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (detached) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | 실시간 `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (재연결 후 다시 붙기) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | 앱 목록 / 일괄 base64 아이콘 |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` 기기의 Android 사용자(멀티 유저). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` 경로의 하위 디렉터리(폴더 선택기). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` 독립 폴더/파일 백업. |
| `provenance` | `{}` | 번들 바이너리 감사 매니페스트 (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` 한 백업의 전체 세부 정보 (버전, 설치 출처, 상태, 날짜, 모드, 크기, 항목, 권한 개수, 기기) |
| `backup-icon` | `{ref}` | `{ok,icon}` 매니페스트에서 가져온 base64 PNG (앱이 제거된 경우에도 동작) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref는 backups 디렉터리 아래여야 함) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` 패키지의 최신 N개 유지 |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` 감사 로그, 최신순 |
| `log-export` | `{user?}` | `{ok:true,path}` (백업 디렉터리 아래에 기록된 `.txt`의 절대 경로) 또는 `{ok:false,code:"ERR_LOG_EXPORT"}`. 활동 로그(`audit.jsonl`)와 짧은 빌드/기기 헤더를 사용자가 볼 수 있는 단일 텍스트 파일로 기록하여 버그 리포트에 첨부할 수 있게 합니다. 비 detached이며 즉시 반환. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` 시스템 전역 백업 (detached) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (재부팅 필요; `confirm`이 이를 막음) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` 임의의 절대 경로를 `.paths/` 아래에 `tar.zst`+`manifest.json`로 백업 (detached) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` 경로 백업을 원래 위치로 복원 (`confirm`이 이를 막음; detached) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | 설치된 앱을 시스템 앱으로 마운트 (시스템리스 서브모듈; NoMount로 라이브, 아니면 다음 부팅 시) |
| `companion-status` / `companion-install` | `{}` | Google Drive 컴패니언 상태 / 온디맨드 설치 |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | 대상 관리 |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone 원격 관리 (`type:"rclone"` 대상이 가리키는 `rclone.conf` 항목을 생성); `backend`는 임의의 rclone backend일 수 있으며 화이트리스트가 없음 |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (엔진이 Android VIEW 인텐트를 통해 해당 동의 URL을 이미 휴대폰 브라우저에서 열었음) 또는 `{ok:false,code:"ERR_AUTHORIZE"}`. 기기 내 OAuth를 위해 로컬 콜백 서버(`127.0.0.1:53682`)에서 `rclone authorize <backend>`를 실행. |
| `remote-authorize-poll` | `{}` | 대기 중에는 `{ok:true,done:false,url}`, 사용자가 동의하면 `{ok:true,done:true,token}`(`remote-add`에 전달할 `token`), 또는 `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; 대기 중인 인가를 중지. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (`rclone`/`restic` 바이너리가 있는지, 이 `lite` 에디션이 그것들을 가져올 수 있는지, 다운로드 크기(바이트)) |
| `cloud-fetch` | `{}` | `{ok,opid}` (detached) `lite` 에디션에서 `rclone`/`restic` 애드온을 다운로드+검증+설치 |
| `schedule-set` / `schedule-list` / `schedule-delete` | 아래 참고 | 예약 작업 (백업 또는 복원; 단일 앱, 집합, 또는 모든 앱 대상) |
| `scheduler-tick` | `{}` | 실행 예정인 작업을 수행하고 보존 정책을 적용하며 자동 백업 관찰자를 실행 (부팅 하트비트가 호출) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (detached 아님; 즉시 반환; 실패 시 `ERR_UPDATE_CHECK` - 아래 참고) |

### `progress` 필드

`progress`를 폴링하면 해당 작업의 실시간 `progress-<opid>.json`이 반환됩니다. 다음 필드는
**항상 존재**합니다:

| 필드 | 타입 | 의미 |
|-------|------|---------|
| `opid` | string | 작업 id |
| `percent` | int | 0-100 진행률 |
| `phase` | string | 현재 단계 라벨 |
| `item` | string | 현재 처리 중인 item 타입 |
| `done` | bool | 종단 기록(finish / dry-run / restore-test)에서 true |

실행 중인 작업은 다음의 **선택적(optional)** 실시간 필드도 가질 수 있습니다. 알 수 없을 때는
없거나 비어 있으며, **종단 기록(finish / dry-run / restore-test)에서는 생략**됩니다:

| 필드 | 타입 | 의미 |
|-------|------|---------|
| `rate` | string | 전송 속도, 예: `"4.2 MiB/s"` (빈 값 = 알 수 없음) |
| `eta` | string | 예상 남은 시간, 예: `"1m12s"` (빈 값 = 알 수 없음) |
| `n` | int | 현재 item 인덱스 (0 = 알 수 없음) |
| `of` | int | 전체 item 개수 (0 = 알 수 없음) |
| `cur` | string | 현재 item 이름 (빈 값 = 없음) |

클라우드 전송은 `rate`/`eta`를 채웁니다(percent는 rclone에서 옴). 로컬 Full 백업은
`n`/`of`/`cur`를 채웁니다. 단계 라벨에는 체크섬 봉인 단계 **`verified`**, 그리고 클라우드 전송의
경우 **`transfer`** 및 **`mirror <item>`**가 포함됩니다.

### `backup` 인자

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

`restore`/`import`은 `{ref}`(백업 디렉터리 / 스캔 ref)를 받습니다. `restore`는 추가로 다음도
받습니다: `"items"`(복원할 백업 항목 유형의 부분집합; 전부면 생략), `"test": true`(임시
디렉터리로 추출해 검증하며, 실제 앱은 건드리지 않음), snapshot/mirror를 위한 `"mode"`, 암호화된
백업을 위한 `"password"`, `"ssaid"`(옵트인), 그리고 설치 출처 옵션인 `"spoof_installer"`(기본값은
config에서, 설치 시점에 installer를 Play Store로 설정)와 `"deep_spoof": true`(고급 옵트인; 패키지
데이터베이스를 편집해 초기 패키지와 패키지 출처까지 위조하며, 재부팅 후에 적용). `import`은
`"from": "neo" | "databackup"`을 받고, 암호화된 Neo 백업의 경우 `"password"`를 받습니다.

### `schedule-set` 인자

예약 작업은 **하나의** 대상과 **동작**을 고릅니다:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (기본값) | "restore"
  "package": "com.example.app",   // 단일 앱   - 또는 -
  "packages": ["com.a","com.b"],  // 앱 집합   - 또는 -
  "all": true,                    // 모든 앱, 제외 앱 목록 제외
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // 게이트: Wi-Fi일 때만 실행
  "require_charging": false,      // 게이트: 충전 중일 때만 실행
  "min_battery": 0,               // 게이트: 이 배터리 % 이상일 때만 실행 (0-100)
  "days": [1,2,3,4,5]             // 게이트: 이 요일에만 실행 (0=일요일)
}
```

대상으로 `package`, `packages`, `all` 중 정확히 **하나**를 지정하세요. `backup` 작업은 평소의
`mode`/`dest`/`keep`/`items`를 유지합니다. `restore` 작업(`action: "restore"`)은 각 대상 앱의
**가장 최근** 백업(또는 명시적 `ref`)을 복원하며 **매 실행마다 앱의 현재 데이터를 덮어씁니다** -
이는 의도적이고 옵트인이므로, 사용자의 직접 요청이 있을 때만 설정하세요.

### 스케줄러 게이팅

스케줄된 작업은 **선택적 게이트 조건(gate conditions)**을 가질 수 있습니다. 실행 예정인 작업의
게이트가 충족되지 않으면, 그 작업은 **건너뛰어지고 스케줄을 진행하지 않은 채 다음 tick에서
재시도**됩니다(그 `last_run`이 기록되지 않으므로, 조건이 충족되는 즉시 발화합니다):

| 필드 | 타입 | 게이트 |
|-------|------|------|
| `require_wifi` | bool | Wi-Fi일 때만 실행 |
| `require_charging` | bool | 충전 중일 때만 실행 |
| `min_battery` | int (0-100) | 이 배터리 수준 이상일 때만 실행 |
| `days` | array of int (0-6, 0=일요일) | 이 요일에만 실행 |

이에 더해 최소한의 **열 안전(thermal safety)** 검사가 항상 적용됩니다: 기기가 위험할 정도로
뜨거운 동안에는 스케줄된 작업이 건너뛰어집니다. 모든 게이트에 의한 건너뜀은
`wifi` / `charging` / `battery` / `days` / `thermal` 중 하나의 `reason`과 함께
`op:"scheduler-gated"`로 audit trail에 기록됩니다.

### `remote-add` 인자

클라우드 대상은 `rclone` 원격을 지정하는 `type:"rclone"` 대상입니다. 먼저 `remote-add`로 그
원격을 생성하세요. `backend`는 **임의의 rclone backend**일 수 있으며 화이트리스트가 없습니다.
`remote-add`는 임의의 backend 이름(`dropbox`, `onedrive`, `box`, `pcloud`, `mega`, `b2`, `s3`,
`sftp`, `smb`, `webdav`, `ftp`, `drive` 및 rclone이 지원하는 그 밖의 약 70가지)을 받아들이며,
`params`는 `key=value` 쌍으로 `rclone` 설정에 그대로 전달됩니다. 비밀번호 필드는 평문이 아니라
난독화되어 저장됩니다. 일반적인 backend와 그 `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**기기 내 OAuth(PC 불필요).** 브라우저 로그인이 필요한 backend(Google Drive, Dropbox, OneDrive,
Box, pCloud)는 데스크톱이나 수동으로 붙여넣는 token이 필요 없습니다. `remote-authorize`를
`{backend}`로 호출하세요: 엔진이 로컬 콜백 서버(`127.0.0.1:53682`)에 대해 `rclone authorize
<backend>`를 실행하고 Android VIEW 인텐트를 통해 제공자의 동의 페이지를 휴대폰 자체 브라우저에서
열며 `{ok:true,url}`(또는 `{ok:false,code:"ERR_AUTHORIZE"}`)을 반환합니다. `remote-authorize-poll`
(`{}`)을 폴링하면 대기 중에는 `{ok:true,done:false,url}`을, 사용자가 승인하면
`{ok:true,done:true,token}`을 반환합니다 - 그 `token`을 `remote-add`에 전달하세요.
`remote-authorize-cancel`(`{}`)은 대기 중인 인가를 중지합니다(`{ok:true,cancelled:true}`). 아무
컴퓨터에서나 `rclone authorize "<backend>"`의 출력을 수동으로 붙여넣는 방법도 폴백으로 계속
지원됩니다.

Google Drive에는 두 가지 경로가 있습니다: 이 `drive` 원격(Google Cloud 프로젝트가 필요 없고
rclone 자체 OAuth를 사용 - `remote-authorize`로 기기에서 인가하거나, 아무 컴퓨터에서
`rclone authorize "drive"`를 한 번 실행하고 토큰을 전달)이나, 옵트인 방식의 컴패니언 앱(당신
소유의 OAuth client id). 둘 다 결국 평범한 대상으로 귀결됩니다.

### 네트워크 정책

config 필드 `network_policy`는 클라우드 전송이 어떤 연결을 사용할 수 있는지 제어합니다:
`any`(기본), `wifi`, `mobile`. `config-set`으로 설정합니다. `wifi`나 `mobile`일 때, 모든
클라우드 전송(Full `rclone`/Drive 업로드, Mirror 동기화, 원격 `restic` 스냅샷 백업/복원,
Mirror 복원)은 먼저 활성 전송 수단을 확인하고, 일치하지 않으면 `ERR_NET_POLICY`로 중단합니다
- 수동 작업과 예약 작업 모두에 해당합니다. 로컬 대상은 절대 제한되지 않습니다.

### 클라우드 무결성과 쿼터

- **체크섬 봉인(클라우드)** 클라우드 복사가 성공한 후, 엔진은 원격 체크섬 검사(`rclone check`)를
  실행합니다. 불일치는 그 작업을 `ERR_VERIFY`로 실패시킵니다. 로컬 측과 공통 해시가 없는 백엔드는
  건너뜁니다(실패가 아닙니다).
- **쿼터 검사(클라우드, Full 모드)** `rclone` 원격으로의 Full 모드 업로드 전에, 엔진은 원격의
  여유 공간을 조회하고(`rclone about --json`), 백업이 들어가지 않으면 `ERR_QUOTA`로 거부합니다.
  쿼터 정보를 보고하지 않는 원격은 건너뜁니다. Mirror 모드는 델타 동기화이므로 예외입니다.

### 클라우드 바이너리 (`lite` 에디션)

`full` 에디션은 모든 바이너리를 번들하며 네트워크가 전혀 필요 없습니다. `lite` 에디션은 가장 큰 두
개, `rclone`과 `restic`을 생략하고, 클라우드 또는 snapshot 작업을 처음 실행할 때 온디맨드로
가져옵니다. `cloud-status`는 그것들이 이미 있는지, 이 에디션이 가져올 수 있는지, 그리고 다운로드
크기(바이트)를 보고합니다. `cloud-fetch`는 **detached**로 실행됩니다(그 `opid`로 `progress`를
폴링하세요). 아키텍처별 `rclone`+`restic` 애드온을 다운로드하고, 모듈에 구워진 SHA-256과 대조해
검증한 뒤, 런타임 캐시에 설치합니다. 진행 단계는 `downloading`, `verifying`, `installing`이며,
최종 코드는 성공 시 `ERR_NONE`, 실패 시 `ERR_FETCH`(다운로드 실패) / `ERR_FETCH_VERIFY`(체크섬
불일치, 폐기)입니다. `full` 에디션에서는 불필요합니다. `lite` 에디션에서 바이너리가 있기 전에
클라우드 또는 snapshot 대상으로 `backup`/`restore`를 하면 `ERR_CLOUD_FETCHABLE`로 실패합니다.
클라이언트는 `cloud-fetch` 실행을 제안한 뒤 다시 시도해야 합니다.

### 특수 백업 범주

`special-categories`는 기기에 어떤 시스템 전역 범주가 있는지 보고하고, `special-backup`은
`categories`로 전달한 것을 캡처하며, `special-restore`는 그것들을 다시 적용합니다. 범주는
다음과 같습니다:

| 범주 | 무엇인지 | 복원 동작 |
|------|-----------|-----------|
| `messages` | SMS/MMS | provider 교체 (지우기 + 추출) |
| `contacts` | 연락처와 통화 기록 | provider 교체 (지우기 + 추출) |
| `wifi` | 저장된 Wi-Fi 네트워크 | provider 교체 (지우기 + 추출) |
| `bluetooth` | Bluetooth 페어링 | provider 교체 (지우기 + 추출) |
| `calendar` | 캘린더 provider (`com.android.providers.calendar`, 앱 + 데이터); `calendar.json`로 이식 가능하게 내보내기도 함 | provider 교체 (지우기 + 추출) |
| `wallpaper` | 홈 및 잠금 화면 배경화면과 `wallpaper_info.xml`, 원본(바이너리)으로 저장 | 파일 교체 |
| `dns` | settings에서 읽은 비공개 DNS 모드와 지정자 | 멱등적 `settings put` |
| `system_settings` | 전체 system/global/secure 설정 덤프 | **옵트인**, 멱등적 `settings put`, 기기 설정을 덮어씀 |

**`system_settings`는 엄격히 옵트인이며 복원 시 파괴적입니다.** `ssaid`처럼, 복원될 때
기기 전역 설정을 덮어쓰므로, 명시적인 사용자 동의 뒤에 막혀 있고 감사 추적에 기록됩니다.
절대 기본으로 선택하지 마세요. 직접적이고 신중한 사용자 요청이 있을 때만 선택하세요.

### 독립형 경로 백업

`path-backup` / `path-restore`는 per-app 모델 밖에서, 공유 저장소나 `/data` 아래의 **임의의
절대 경로** - 폴더나 단일 파일 - 를 백업하고 복원합니다. 아카이브는 backups 디렉터리의
`.paths/` 아래에 VDBackup 고유 형식의 `tar.zst`와 `manifest.json`로 기록됩니다(SHA-256으로
봉인되며, 암호화된 경우 RECOVERY 키트 포함).

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- 원본 경로는 **절대 경로**여야 하며 허용된 루트 중 하나 아래에 있어야 합니다:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. 존재하지 않는 경로는 `ERR_NO_PATH`로
  실패하고, 허용된 루트 밖의 경로나 `..`를 포함하는 경로는 `ERR_BAD_PATH`로 실패합니다.
- `path-restore`는 원래 위치로 다시 기록하므로 파괴적이며 `"confirm": true`가 필요합니다 -
  `special-restore`처럼 강한 마찰 장치입니다. 유효한 경로 백업이 아닌 `ref`는 `ERR_BAD_REF`로
  실패합니다.
- 둘 다 **detached**로 실행됩니다. 반환된 `opid`로 `progress`를 폴링하세요.

### `update-check`

`update-check`는 모듈의 더 새로운 버전이 게시되었는지 보고하여, 에이전트(또는 WebUI)가 이를
표시할 수 있게 합니다. 이것은 **즉시 반환하는 읽기 verb**이며, **detached가 아니므로** 폴링할
`opid`가 없습니다. 오직 사용자의 명시적 동작으로만 트리거되며, 번들된 `curl`로 root 측 HTTP
요청을 통해 모듈의 게시된 업데이트 매니페스트(`module.prop`의 `updateJson` URL)를 가져오고 - 이는
WebView 밖에서 실행되므로 WebUI의 CSP에 영향받지 않습니다 - 게시된 `versionCode`를 설치된 것과
비교합니다. **인자를 받지 않습니다**.

성공 시 다음을 반환합니다:

| 필드 | 타입 | 의미 |
|------|------|------|
| `ok` | bool | `true` |
| `current_version` | string | 설치된 versionName |
| `current_code` | int | 설치된 versionCode |
| `latest_version` | string | 게시된 versionName |
| `latest_code` | int | 게시된 versionCode |
| `update_available` | bool | `latest_code`가 `current_code`보다 클 때 `true` |
| `zipUrl` | string | 게시된 zip의 URL |
| `changelog` | string | 게시된 changelog의 URL |
| `notes` | string | 릴리스 노트 |

`updateJson` URL이 없거나, 네트워크 요청이 실패하거나, 매니페스트를 파싱할 수 없으면
`{"ok":false,"code":"ERR_UPDATE_CHECK"}`를 반환합니다.

`update-check`는 가용성과 릴리스 노트를 **보고만** 합니다. 업데이트 자체는 모듈의 `updateJson`을
통해 사용자의 root 매니저(KernelSU / APatch / Magisk)가 수행하며, 이 verb가 수행하지 않습니다.

## 에이전트가 반드시 지켜야 할 안전 장치

- **`ssaid`는 엄격히 옵트인입니다(기본 off).** 시스템 파일을 다시 써서 기기
  ANDROID_ID를 백업/복원하며, 복원은 재부팅 후에만 적용되고, 롤백을 위해 이전 파일이 항상
  먼저 저장됩니다. `"ssaid": true`는 직접적이고 신중한 사용자 요청이 있을 때만 보내세요 -
  기본으로 보내지 마세요.
- **변경 동작(restore, delete, import)은 파괴적이며** 로컬 감사 추적
  (`logs/audit.jsonl`)에 기록됩니다. 복원은 충실합니다(wipe-then-extract), 즉 앱을 백업의
  정확한 상태로 되돌립니다. 호출하기 전에 의도를 확인하세요.
- **`system_settings`는 `ssaid`와 꼭 마찬가지로 옵트인이며 파괴적입니다.** 복원하면 기기
  전역 설정을 덮어쓰므로, 직접적인 사용자 요청이 있을 때만 보내세요. 명시적 동의 뒤에 막혀
  있고 감사 추적에 기록됩니다.
- **복원은 멱등적입니다.** 원시 provider 복원(messages/contacts/wifi/bluetooth/calendar)은
  병합이 아니라 **교체**합니다 - provider 데이터가 지워지고 그 위에 아카이브가 추출됩니다 -
  그래서 같은 백업을 다시 복원해도 행이 중복될 수 없습니다. `dns`와 `system_settings`는
  멱등적 `settings put`으로 다시 적용됩니다.
- **아카이브 추출은 경로 순회(path traversal)로부터 보호됩니다.** 복원은 root로 실행되므로,
  모든 아카이브(restore, import, special-restore, path-restore)는 어떤 기록보다 먼저
  검사됩니다: 멤버가 절대 경로를 쓰거나 `..`를 포함하는 아카이브는 단 한 번의 파괴적 기록이
  일어나기 전에 `ERR_UNSAFE_ARCHIVE`로 미리 거부됩니다(GNU tar도 `--no-absolute-names`로
  실행됩니다). 변조된 아카이브는 결코 대상 디렉터리를 벗어날 수 없습니다.
- 보존(SELinux/uid/gid/modes/xattr)이나 APK 규칙(APK는 항상 압축되며, `encrypt_apk`가
  설정되지 않는 한 절대 암호화되지 않음)을 **절대 약화시키지 마세요**.
- JSON 출력을 진실의 원천으로 다루세요. `ok`/`code`를 확인하고, `progress`를 폴링하며,
  추측하는 대신 `ERR_*` 코드를 드러내세요.

내부 구조는 [ARCHITECTURE.md](ARCHITECTURE.md)와
[FILE-STRUCTURE.md](FILE-STRUCTURE.md)를 참고하세요.

---

*이 문서는 Claude (Anthropic)로 생성되었으며 VD171이 관리합니다. 수정과 개선을 환영합니다 - [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.*

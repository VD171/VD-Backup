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
| `backup-info` | `{ref}` | `{ok,...}` 한 백업의 전체 세부 정보 (버전, 설치 출처, 상태, 날짜, 모드, 크기, 항목, 권한 개수, 기기) |
| `backup-icon` | `{ref}` | `{ok,icon}` 매니페스트에서 가져온 base64 PNG (앱이 제거된 경우에도 동작) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref는 backups 디렉터리 아래여야 함) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` 패키지의 최신 N개 유지 |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` 감사 로그, 최신순 |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` 시스템 전역 백업 (detached) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (재부팅 필요; `confirm`이 이를 막음) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | 설치된 앱을 시스템 앱으로 마운트 (시스템리스 서브모듈; NoMount로 라이브, 아니면 다음 부팅 시) |
| `companion-status` / `companion-install` | `{}` | Google Drive 컴패니언 상태 / 온디맨드 설치 |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | 대상 관리 |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | rclone 원격 관리 (`type:"rclone"` 대상이 가리키는 `rclone.conf` 항목을 생성) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | 예약 작업 |
| `scheduler-tick` | `{}` | 실행 예정인 작업을 수행하고 보존 정책을 적용하며 자동 백업 관찰자를 실행 (부팅 하트비트가 호출) |

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

### `remote-add` 인자

클라우드 대상은 `rclone` 원격을 지정하는 `type:"rclone"` 대상입니다. 먼저 `remote-add`로 그
원격을 생성하세요. 비밀번호 필드는 평문이 아니라 난독화되어 저장됩니다. 지원되는 `backend`
값과 그 `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive에는 두 가지 경로가 있습니다: 이 `drive` 원격(Google Cloud 프로젝트가 필요 없고
rclone 자체 OAuth를 사용 - 아무 컴퓨터에서 `rclone authorize "drive"`를 한 번 실행하고 토큰을
전달)이나, 옵트인 방식의 컴패니언 앱(당신 소유의 OAuth client id). 둘 다 결국 평범한
대상으로 귀결됩니다.

### 네트워크 정책

config 필드 `network_policy`는 클라우드 전송이 어떤 연결을 사용할 수 있는지 제어합니다:
`any`(기본), `wifi`, `mobile`. `config-set`으로 설정합니다. `wifi`나 `mobile`일 때, 모든
클라우드 전송(Full `rclone`/Drive 업로드, Mirror 동기화, 원격 `restic` 스냅샷 백업/복원,
Mirror 복원)은 먼저 활성 전송 수단을 확인하고, 일치하지 않으면 `ERR_NET_POLICY`로 중단합니다
- 수동 작업과 예약 작업 모두에 해당합니다. 로컬 대상은 절대 제한되지 않습니다.

## 에이전트가 반드시 지켜야 할 안전 장치

- **`ssaid`는 엄격히 옵트인입니다(기본 off).** 시스템 파일을 다시 써서 기기
  ANDROID_ID를 백업/복원하며, 복원은 재부팅 후에만 적용되고, 롤백을 위해 이전 파일이 항상
  먼저 저장됩니다. `"ssaid": true`는 직접적이고 신중한 사용자 요청이 있을 때만 보내세요 -
  기본으로 보내지 마세요.
- **변경 동작(restore, delete, import)은 파괴적이며** 로컬 감사 추적
  (`logs/audit.jsonl`)에 기록됩니다. 복원은 충실합니다(wipe-then-extract), 즉 앱을 백업의
  정확한 상태로 되돌립니다. 호출하기 전에 의도를 확인하세요.
- 보존(SELinux/uid/gid/modes/xattr)이나 APK 규칙(APK는 항상 압축되며, `encrypt_apk`가
  설정되지 않는 한 절대 암호화되지 않음)을 **절대 약화시키지 마세요**.
- JSON 출력을 진실의 원천으로 다루세요. `ok`/`code`를 확인하고, `progress`를 폴링하며,
  추측하는 대신 `ERR_*` 코드를 드러내세요.

내부 구조는 [ARCHITECTURE.md](ARCHITECTURE.md)와
[FILE-STRUCTURE.md](FILE-STRUCTURE.md)를 참고하세요.

---

*이 문서는 Claude (Anthropic)로 생성되었으며 VD171이 관리합니다. 수정과 개선을 환영합니다 - [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.*

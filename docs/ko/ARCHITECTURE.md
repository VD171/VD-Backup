> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · 한국어 · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# 아키텍처

VDBackup은 root WebUI 모듈입니다. 세 개의 계층으로 구성됩니다: **WebUI**(보이는 부분),
**셸 백엔드**(root로 실제 작업을 수행하는 부분), 그리고 **번들된 바이너리**
(아카이버와 전송 도구). 모든 것이 이미 root로 실행되므로, 핵심 기능에는
권한 요청 프롬프트도 없고 동반 앱도 없습니다.

```
   ┌──────────────────────────────────────────────────────────┐
   │  WebUI  (module/webroot, vanilla JS)                      │
   │    index.html · scripts.js · i18n.js · styles.css         │
   │    lang/en.js + 21 languages · config.json (CSP, no net)  │
   └───────────────┬──────────────────────────────────────────┘
                   │  ksu.exec("sh scripts/helper.sh <verb> <b64json>")
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  scripts/helper.sh  (dispatcher, returns JSON)            │
   │    list-apps · config · dests · backup/restore/import ... │
   │    long ops -> setsid nohup scripts/worker.sh  (detached) │
   └───────────────┬───────────────────────────────┬──────────┘
                   │                               │ progress-<opid>.json (poll)
                   ▼                               ▼
   ┌────────────────────────────────────┐   ┌──────────────────────────┐
   │  scripts/worker.sh (root, detached)│   │  framework helper (opt.) │
   │   force-stop · tar|zstd|age        │   │  app_process + dex       │
   │   pm install · chown/chcon         │   │  perms/appops/ssaid/...  │
   │   transfer · notify                │   │  (dex primary, shell fb) │
   └───────────────┬────────────────────┘   └──────────────────────────┘
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  bin/<abi>/  tar · zstd · lz4 · rclone · rsync · ssh · restic │
   └──────────────────────────────────────────────────────────┘
                   ▼
   Destinations: local · SFTP/SCP · SMB · WebDAV · FTP · S3 · 70+ (rclone)
                 rsync · restic repos · Google Drive (opt-in companion)
```

## 핵심 사항

- **이미 root.** 모듈 프로세스가 root이므로 엔진은 순수 셸입니다. 작업의 약 85%는
  순수 셸입니다 (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **분리 실행.** 백업/복원은 `setsid nohup`을 통해 독립적인 root 프로세스로
  실행됩니다. WebUI를 닫아도 중단되지 않으며, UI는
  `logs/progress-<opid>.json`을 읽어 다시 연결됩니다.
- **프레임워크 헬퍼 (~15%).** 세분화된 권한, AppOps, SSAID, StorageStats,
  아이콘, 권한 있는 Wi-Fi에는 Android 프레임워크가 필요합니다. `app_process`를 통해
  실행되는 작은 `dex`(설치된 앱 없음)가 이를 처리하며, 셸 폴백이 있습니다.
- **이식성.** 표준 형식만 사용합니다; 백업은 이 모듈 없이도 PC에서 열 수 있습니다.
- **상태**는 `/data/adb/vdbackup/`에 저장됩니다 (구성, 작업, 대상, 암호화된
  자격 증명, 로그, 스테이징). **백업**은 사용자에게 보이고 자격 증명으로
  암호화된 저장소인 `/sdcard/VDBackup/`(`/data/media/<user>/VDBackup`, 사용자별)에
  기록되며, `/data/adb`(장치 암호화되어 있고 첫 잠금 해제 전에 읽을 수 있음)에는
  저장하지 않습니다.

## 호환성 보장

백업은 영원히 복원 가능한 상태로 유지되어야 합니다. 이것은 최선의 노력이 아니라 반드시 지켜야 하는 규칙입니다.

**범위.** 이 보장은 **v1.01 이후**(첫 공식 공개 릴리스)에 기록된 백업과 공식적으로 공개되어
릴리스된 버전에만 적용됩니다. v1.00은 테스트 전용 빌드로 명시적으로 범위 밖이며, 사전 릴리스와
개발 빌드는 포함되지 않습니다. 첫 공개 릴리스부터 아래의 약속은 절대적입니다:

- **표준 형식만.** 모든 아카이브는 `zstd`, `gzip` 또는 `lz4`로 압축된 일반 `tar`이며,
  선택적으로 `age`로 감쌉니다. 독점 컨테이너가 없으므로, 백업은 이 모듈이 없어도
  일반적인 도구로 어떤 PC에서든 열 수 있습니다 (`etc/RECOVERY.md` 참조). 폐기할 수 없는
  형식입니다.
- **추가 전용 메타데이터.** `manifest.json`은 `format_version`을 담고 있습니다. 스키마는
  오직 커지기만 합니다: 필드는 *추가*될 수는 있지만 제거, 이름 변경, 용도 변경은 절대
  되지 않습니다. 복원은 모든 필드를 방어적으로 읽고(누락된 선택적 필드는 기본값으로
  대체됨), 고정된 manifest 형태를 가정하지 않고 파일 이름과 확장자에 따라 APK를 설치하고
  아카이브를 추출합니다.
- **상위 호환 복원.** 복원은 백업이 오래되었다는 이유로 거부하지 않으며, 더 오래된
  VDBackup은 알지 못하는 항목 유형을 실패 대신 조용히 건너뜁니다. 따라서 더 새로운
  VDBackup은 더 오래된 모든 백업을 복원하며, 표준 형식 아카이브는 어떤 경우에도 수동으로
  복원 가능한 상태를 유지합니다.

간단히 말해: VDBackup이 지금까지 기록한 모든 것은, 미래의 모든 VDBackup(그리고 일반
PC)이 여전히 복원할 수 있습니다. 이전 백업을 손상시키는 방식으로 형식을 변경하는 것은
허용되지 않습니다; 새로운 기능은 `format_version`과 새롭게 추가되는 필드 뒤에 추가됩니다.

전체 기술 설계(아카이브 형식, 메타데이터 스키마, 파이프라인, 암호화, 대상, 임포터)에
대해서는 관리자들이 상세한 설계 노트를 유지하고 있습니다; 이 파일은 기여자를 위한
개요입니다.

<!-- doc-footer -->

---

> _이 문서는 Claude (Anthropic)로 생성되었으며 VD171이 유지 관리합니다. 수정 및 개선을 환영합니다. [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요._

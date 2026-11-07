> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · 한국어 · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# VDBackup에 기여하기

도움을 주셔서 감사합니다! VDBackup은 기여하기 쉽도록 만들어졌습니다. 이 가이드는
무엇이 어디에 있는지와 우리가 따르는 몇 가지 관례를 알려줍니다.

## 프로젝트 한눈에 보기

VDBackup은 **KernelSU/APatch/Magisk WebUI 모듈**입니다: shell 스크립트 + vanilla-JS
WebUI + ABI별 정적 바이너리. 핵심 기능에는 앱이 필요하지 않습니다.
[ARCHITECTURE.md](ARCHITECTURE.md)와 [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md)를 참조하세요.

이것은 **Swift Backup, Neo-Backup, Android-DataBackup의** 개방적이고 root 네이티브한
**후속작**입니다 - AGPLv3 아래에서 그들의 기능을 통합하고, 기존 Neo-Backup과
Android-DataBackup 백업을 가져올 수 있어 사람들이 마이그레이션할 수 있습니다.

## AI 기여자 환영

여기서 AI 어시스턴트와 에이전트는 부차적인 존재가 아니라 일급 기여자입니다.

- 이 프로젝트는 기계가 읽을 수 있도록 만들어졌습니다: 모든 `helper.sh` verb는 하나의
  JSON 객체를 출력하고, 엔진은 순수 POSIX shell이며, 파일 레이아웃은
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md)에 문서화되어 있습니다.
- 에이전트는 그 JSON API를 통해 모듈의 **모든** 콘텐츠와 동작을 headless로 관리할 수
  있습니다 - 전체 제어 표면, verb, 안전 장치는
  [docs/AI-AGENTS.md](AI-AGENTS.md)에 있습니다.
- AI가 지원한 패치는 다른 패치와 동일한 기준으로 검토되고 수락됩니다 - 누가(또는
  무엇이) 작성했는지가 아니라 정확성, 명확성, 아래의 관례에 따라서입니다.
- 에이전트에서 VDBackup을 구동한다면 `helper.sh`의 JSON 출력을 계약으로 사용하세요.
  WebUI를 스크래핑하지 마세요.
- 모두에게 동일한 기준: 실제 기능은 절대 약화되지 않고, 비밀과 장치 데이터는
  저장소에 절대 들어가지 않으며(엄격한 [.gitignore](.gitignore) 참조), 변경을 일으키는
  동작은 확인과 감사가 유지됩니다.

## 개발 환경 설정

- 테스트하려면 root가 적용된 장치/에뮬레이터(KernelSU, APatch 또는 Magisk)가 필요합니다.
- 플래시 가능한 zip 빌드: `cd module && zip -r9 ../VD-Backup-dev.zip .` 그런 다음 플래시하세요.
- WebUI는 `module/webroot/`입니다 (root 관리자에서 엽니다). 백엔드는
  `module/helper.sh` (dispatcher)와 `module/worker.sh` (detached 엔진)입니다.
- 네이티브 바이너리는 `module/bin/<abi>/`에 있으며 CI
  (`.github/scripts/build_bin.sh`)로 생성됩니다. 일반적으로 손으로 다시 빌드하지 않습니다.

## 관례

- **모든 소스 파일** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`)은 프로젝트
  배너 헤더로 시작합니다 (기존 파일에서 복사하세요). 예외 없음.
- **코드와 주석은 영어로.** 주석은 최소한으로 유지하고 필요한 곳에만 둡니다.
- **em-dash나 en-dash 금지**; 항상 평범한 하이픈 `-`를 사용하세요.
- WebUI는 **vanilla JS**입니다 (하나의 `scripts.js`); 프레임워크 없음. root와는
  오직 `helper(verb, args)` 래퍼를 통해서만 통신하고, 보간된 모든 값을 이스케이프하세요.
- 실제 기능(예: SELinux/uid/gid/modes 보존)을 **절대 약화시키지 마세요**.
- 변경을 일으키는 동작(복원, 삭제)은 확인을 요청하고 감사 로그를 기록해야 합니다.

## 국제화 (i18n)

- UI 문자열은 `module/webroot/lang/`에 있습니다. 영어가 표준 폴백입니다
  (`en.js` + `en.json`); 나머지 20개 언어는 `<code>.json`입니다.
- 문자열을 추가하거나 변경하려면: `en.js` **와** `en.json`을 편집한 다음 모든
  `<code>.json`을 업데이트하세요. 눈에 보이는 레이블을 건드리는 것은 **모든** 언어 파일과
  **모든** `README.<code>.md`를 업데이트하는 것을 의미합니다.
- 번역은 순수 JSON입니다 - 아주 좋은 첫 기여입니다. 언어 목록은
  `module/webroot/i18n.js`에서 확인하세요.

## 커밋 & PR

- PR은 집중적으로 유지하세요. 무엇을 왜 하는지 설명하세요.
- 커밋에 서명하세요 (DCO): `git commit -s` (`Signed-off-by:`를 추가함).
- CI는 녹색을 유지해야 합니다. 리뷰에서 친절하세요 - [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)를 참조하세요.

## 좋은 첫 이슈

`good first issue`와 `help wanted` 레이블을 찾아보세요. 번역, 문서, 새로운
`rclone` destination 프리셋, WebUI 다듬기 모두 훌륭한 출발점입니다.

*이 문서는 Claude (Anthropic)로 생성되었으며 VD171이 관리합니다. 수정과 개선을 환영합니다 - [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.*

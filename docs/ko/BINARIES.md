> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · 한국어 · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# 번들 바이너리: 출처와 감사

VDBackup에서 프라이버시와 보안은 선택 사항이 아닙니다. 백업 도구는 가장 개인적인 데이터에
대해 root로 실행되므로, 그 안에 정확히 무엇이 포함되어 있는지 확인할 수 있어야 합니다. 이
페이지는 모듈이 담고 있는 모든 사전 빌드된 바이너리와 라이브러리, 각각의 출처, 그리고 불투명한
무언가가 몰래 들어가지 않았음을 검증하는 방법을 문서화합니다.

## 원칙

- **불투명한 것은 없다.** 포함된 모든 바이너리와 라이브러리는 고정된 버전의 이름 있는 공개
   업스트림까지 추적할 수 있으며, SHA-256이 기록되어 있습니다. 확인할 수 있는 항목 없이 번들되는
  블롭은 없습니다.
- **업스트림에서 가져오며, 기기에서는 절대 가져오지 않는다.** 네이티브 도구는 공식 Termux 패키지
  저장소 (`packages.termux.dev/apt`에 있는 서명된 `.deb` 파일)에서 가져오며, 어떤 휴대폰에 설치된
  Termux에서 복사하지 않습니다. 빌드는 명확하게 실패하며, 임시방편으로 처리하지 않습니다.
- **재현 가능.** 빌드를 다시 실행하면 동일한 파일을 얻고, 고정된 소스를 다시 가져오면 SHA-256
  값이 일치합니다.
- **감사 기록은 모듈과 함께 제공된다.** 이는 웹사이트에만 있는 것이 아니라, 설치된 모듈 내부,
  즉 기기 안에 함께 있으므로 오프라인에서도 감사할 수 있습니다.

## 무엇이, 어디에서 제공되는가

| 산출물 | 출처 | 빌드 방식 |
|---|---|---|
| `bin/<abi>/` 네이티브 도구 (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) 및 그 `lib/` 의존 클로저 | 공식 **Termux** apt 저장소 (`packages.termux.dev/apt`), 공식 `.deb` 패키지 | `.github/scripts/build_bin.sh`가 `.deb` 파일과 그 전이적 의존성을 다운로드하여 추출하고, 바이너리와 각각이 필요로 하는 공유 라이브러리만 복사합니다 |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (ABX 변환기 폴백) | **rhythmcache/android-xml-converter** GitHub 릴리스 (`ABX_RELEASE`, 정적 ELF) | `build_bin.sh`가 고정된 릴리스에서 다운로드합니다 |
| `companion.apk` (선택적 Google Drive 컴패니언) | **이 저장소**, `companion/` (Gradle/Kotlin) | CI가 소스에서 빌드하고 프로젝트 키로 서명합니다. 사전 빌드된 블롭이 아닙니다 |
| `vdbackup_helper.dex` (프레임워크 헬퍼) | **이 저장소**, `dex/src/` (Java) | CI가 `javac` + `d8`로 소스에서 컴파일합니다 |

사전 빌드된 서드파티 바이너리는 처음 두 행뿐입니다. 나머지 둘은 이 저장소에 있는 소스에서
빌드되며, 읽고 다시 빌드할 수 있습니다.

> **Full 대 lite 에디션.** lite 에디션은 크기를 작게 유지하기 위해 `rclone` 과 `restic`(가장 큰 두
> 바이너리)만 생략하고, 클라우드 대상이나 스냅샷 모드를 처음 사용할 때 이를 필요 시 내려받습니다
> (SHA-256으로 검증). `rsync` 와 `ssh`/`scp`/`sftp` 는 여전히 포함되며, 위에 나열된 그 밖의
> 모든 바이너리도 포함됩니다. Full 에디션은 `rclone`(클라우드 제공업체)과 `restic`(스냅샷)을
> 내장하므로 아무것도 다운로드하지 않습니다.

## 기기 내 매니페스트: `PROVENANCE.json`

`build_bin.sh`는 ABI마다 하나의 `bin/<abi>/PROVENANCE.json`을 작성합니다. 설치 시 모듈은 기기의
ABI만 남기므로, 그 파일은 기기의 `/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`에
남습니다. 다음을 기록합니다:

- `sources`: 모든 업스트림 `.deb` (패키지, 버전, 전체 URL, `.deb`의 SHA-256) 및 ABX 릴리스
   (URL, 아카이브의 SHA-256).
- `files`: `bin/<abi>/` 아래에 실제로 제공된 모든 파일 (경로, 크기, SHA-256).

WebUI (**About** 탭에서 링크됨) 또는 에이전트 API를 통해 읽을 수 있습니다:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## 검증 방법 (단계별)

1. **제공된 파일을 확인한다.** 기기의 `bin/<abi>/` 아래 각 파일을 해시하여 `PROVENANCE.json`의
   `files[].sha256`과 비교합니다:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **파일을 업스트림과 대조한다.** 각 `sources[]` 항목에 대해 해당 URL에서 고정된 `.deb`를
   다운로드하고, 그 SHA-256이 `deb_sha256`과 일치하는지 확인한 뒤 추출하여, 포함된
   바이너리/라이브러리가 제공된 것과 동일한 값으로 해시되는지 확인합니다. Termux 저장소의 `.deb`
   파일 자체는 Termux의 서명된 apt 저장소에서 제공됩니다.
3. **처음부터 다시 빌드한다.** `.github/scripts/build_bin.sh`를 직접 실행하고 (필요한 것은
   `curl`, `ar`, `tar`, `xz`, `zstd`, `readelf`뿐), 그 출력을 제공된 것과 비교합니다.
4. **컴패니언과 dex.** `companion/`와 `dex/`를 소스에서 다시 빌드합니다. 컴패니언의 서명은
   프로젝트 키 (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`)입니다.

## 신고

제공된 파일이 기록된 출처와 일치하지 않으면 보안 문제로 간주하고 신고하십시오
([SECURITY.md](SECURITY.md) 참조). 이것이 바로 이 매니페스트가 드러내기 위해 존재하는 종류의
불일치입니다.

*이 문서는 Claude (Anthropic)로 생성되었으며 VD171이 관리합니다. 수정과 개선을 환영합니다 - [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.*

<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
-->

# VD Backup

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VD Backup" width="320">
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases/latest"><img src="https://img.shields.io/github/v/release/VD171/VD-Backup?label=release&color=0969da" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0--or--later-1a7f37" alt="License"></a>
  <a href="https://github.com/VD171/VD-Backup/releases"><img src="https://img.shields.io/github/downloads/VD171/VD-Backup/total?label=downloads&color=8250df" alt="Downloads"></a>
  <a href="https://github.com/VD171/VD-Backup/stargazers"><img src="https://img.shields.io/github/stars/VD171/VD-Backup?color=d29922" alt="Stars"></a>
</p>

<p align="center">
  <b>root 권한으로 앱과 데이터를 완전하게 백업하고 복원, 모든 작업을 WebUI에서 수행.</b><br>
  KernelSU / APatch / Magisk 모듈. "su 허용" 프롬프트 없음, <code>sucompat</code> 전환도 불필요.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Releases</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki">Wiki</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/USER-GUIDE">User guide</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/AI-AGENTS">AI agents</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/ARCHITECTURE">Architecture</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki/BINARIES">Bundled binaries</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">XDA thread</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

| Home | Apps | Schedule |
|:---:|:---:|:---:|
| ![Home](docs/screenshots/en/home-dark.png) | ![Apps](docs/screenshots/en/apps-dark.png) | ![Schedule](docs/screenshots/en/schedule-dark.png) |
| **Destinations** | **Settings** | **Activity log** |
| ![Destinations](docs/screenshots/en/destinations-dark.png) | ![Settings](docs/screenshots/en/settings-dark.png) | ![Activity log](docs/screenshots/en/activitylog-dark.png) |

---

## 개요

VDBackup은 앱과 그 데이터를 백업하고 복원하는 root **WebUI 모듈**로, **핵심 기능에는 동반 앱이
필요 없습니다**: 모듈 자체가 이미 root이므로 "허용"할 대상이 없기 때문입니다. 인기 있는 백업
앱이 하는 모든 일을 깔끔한 WebUI 하나로 모으는 것을 목표로 합니다.

이는 개방적이고 root 네이티브한 **Swift Backup, Neo-Backup, Android-DataBackup의 후계자**를
지향합니다. 이들 기능의 합집합을 AGPLv3 아래 제공하며, 기존 Neo-Backup 및 Android-DataBackup
백업을 가져와 이전할 수도 있습니다.

## 기능

- **앱:** APK (base + splits), 앱 데이터 (`/data/data`), 기기 보호 데이터
  (`/data/user_de`), 외부 데이터 (`Android/data`), OBB, 미디어.
- **시스템/특수 데이터:** 권한, AppOps, (옵트인) SSAID 등 root가 허용하는 범위에서.
- **백업 모드:** **Full** (이식 가능한 `tar.zst`), **Snapshot** (`restic`를 통한 증분 +
  버전 관리), **Mirror** (`rclone`/`rsync`를 통한 1:1 동기화).
- **충실한 보존:** SELinux 컨텍스트, uid/gid, 모드, xattr, 케이퍼빌리티.
- **압축:** none / lz4 / zstd / gzip (gzip = "호환 모드", 어디서나 열림).
- **암호화:** 선택적이며 이식 가능 (`age` + 암호구, 또는 AES-256 zip), 기기 하드웨어에
  묶이지 않으므로 백업을 다른 기기에서 복원하거나 PC에서 열 수 있습니다.
- **대상:** 로컬, SFTP, SCP, SMB, WebDAV, FTP, S3 및 70가지 이상 (`rclone`), 그리고 `rsync`
  와 `restic` 저장소. 작은 옵트인 동반 앱을 통한 Google Drive도 선택적으로 사용 가능.
- **무결성:** 모든 아카이브는 매니페스트와 대조하여 검증됩니다. dry-run과 복원 테스트로 아무것도
  건드리지 않고 백업을 확인할 수 있습니다.
- **선택적 복원 및 일괄 복원:** 백업 항목의 어떤 부분집합이든 복원하거나, 여러 백업을 다중 선택해
  한 번에 모두 복원합니다. 백업을 삭제하고 모든 파괴적 동작의 활동/감사 로그를 보관합니다.
- **특수 백업:** 메시지(SMS/MMS), 연락처와 통화 기록, Wi-Fi와 Bluetooth. PC에서 열 수 있는
  선택적 이식형 JSON 내보내기와 함께.
- **스케줄링 + 자동화:** 단일 앱, 집합, 또는 모든 앱을 대상으로 하는 반복 **백업 또는 복원** 작업과
  keep-N 정리, 옵트인 방식의 설치/업데이트 시 자동 백업 및 제외 앱 목록.
- **설치 출처:** 복원된 앱은 기본적으로 Play Store를 설치 출처로 보고합니다(전환 가능). 고급
  옵트인은 초기 패키지와 출처까지 위조합니다.
- **시스템 앱 마운트:** 실제 `/system` 파티션을 건드리지 않고 설치된 앱을 시스템 앱으로
  마운트합니다(시스템리스 오버레이 서브모듈, NoMount 인식).
- **백그라운드:** 백업/복원은 분리되어 실행되며 WebUI를 닫아도 계속되고, 시작/완료 알림을 보냅니다.
- **마이그레이션 (가져오기):** 기존 Neo-Backup 및 Android-DataBackup 백업을, 암호로 암호화된
  것을 포함하여 가져옵니다.

## 설치

1. [릴리스](https://github.com/VD171/VD-Backup/releases)에서 최신 `VD-Backup-vX.Y.zip`을
   다운로드합니다.
2. KernelSU / APatch / Magisk 관리자에서 플래시합니다, 즉시 사용 가능하며 재부팅이 필요 없습니다.
3. 모듈의 **WebUI**를 열어 설정하고 백업을 실행합니다. 이것으로 끝입니다.

**에디션.** 릴리스마다 zip 6개. `universal-full`, 모든 아키텍처와 모든 바이너리를 내장(클라우드
공급자용 `rclone`, 스냅샷용 `restic` 포함), 완전 오프라인으로 아무것도 다운로드하지 않음, 모든 기기,
가장 큼. `universal-lite`, 모든 아키텍처에서 가장 큰 바이너리 두 개(`rclone`, `restic`)를 뺀 것,
가장 작음. 로컬, SSH/SFTP, `rsync` 백업은 다운로드 없이 그대로 가능하며, 클라우드 대상(`rclone`)이나
스냅샷 모드(`restic`)를 처음 사용할 때 해당 아키텍처용 작은 애드온을 한 번(SHA-256으로 검증) 내려받아
캐시하도록 제안하므로 그 기능도 동작함. `<abi>-full`(`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`) -
단일 아키텍처에 모든 바이너리 내장, `universal-full`보다 작음. 아키텍처를 안다면 -> `<abi>-full`;
가장 작게 쓰면서 클라우드나 스냅샷 첫 사용 시 한 번의 다운로드가 괜찮다면 -> `universal-lite`; 다운로드
없이 모든 것을 내장하길 원한다면(오프라인 / 복구) -> full 에디션. [릴리스](https://github.com/VD171/VD-Backup/releases)를 참고하세요.

처음이신가요? [사용자 가이드](docs/USER-GUIDE.md)가 설치부터 복원까지 안내합니다.

## 이식성

여러분의 백업은 **이 모듈에 묶이지 않습니다**. 모든 것이 표준 형식
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`)을 사용하며, Windows, macOS, Linux에서 흔한
도구나 파일 관리자로 열 수 있습니다. 암호화된 각 백업에는 PC에서 복호화하고 추출하는 정확한
명령이 담긴 **RECOVERY** 노트가 함께 제공됩니다.

## 빌드

모듈은 shell + WebUI에 더해 `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`용으로 빌드된 ABI별
정적 바이너리 (`tar`, `zstd`, `lz4`, `rclone`, `rsync`, ssh, `restic`)로 구성됩니다.
[CONTRIBUTING.md](CONTRIBUTING.md)와 CI 워크플로를 참고하세요.

## AI 친화적

VDBackup은 사람뿐 아니라 AI 어시스턴트와 에이전트에게도 친근하도록 만들어졌습니다. 엔진은
JSON으로 말하고 (`helper.sh`의 모든 verb는 하나의 JSON 객체를 반환합니다), 코드, 문서, 파일
구조는 기계 판독을 염두에 두고 배치되었으며, AI 지원 기여도 다른 기여와 똑같이 검토되고
수용됩니다. 에이전트는 WebUI가 사용하는 것과 동일한 API를 통해 모듈의 **모든** 작업을 헤드리스로
관리할 수 있습니다, 전체 제어 표면은 **[docs/AI-AGENTS.md](docs/AI-AGENTS.md)**를, 기여는
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome)를 참고하세요.

## 함께 보기

같은 작성자의 자매 프로젝트:

- **[VDInfos](https://github.com/VD171/VD-Infos)**: 기기 메서드 디버거. 각 항목을 그것을 읽을 수 있는 모든 메서드로 읽어 나란히 비교합니다.
- **[VDGoogle](https://github.com/VD171/VD-Google)**: 여러분의 Google 서비스 (RCS, Wallet, Play Integrity 증명)를 인터넷 없이 기기에서 읽습니다.
- **[COPG-VD](https://github.com/VD171/COPG-VD)**: 새 핑거프린트를 일관되고 정합성 있는 프로필로 바꾸는 기기 스푸퍼.

## 연락처

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
* **GitHub:** @VD171 https://github.com/VD171

## 라이선스

[GNU AGPL-3.0-or-later](LICENSE). 네트워크 카피레프트: 수정한 버전을 서비스로 실행하더라도 그
소스를 제공해야 합니다.

## 상표

VD Backup은 독립적인 비공식 프로젝트입니다. Google LLC 또는 다른 어떤 공급업체와도 제휴, 보증, 후원 관계가 없습니다. "Google Drive", "Android" 및 관련 이름과 로고는 각 소유자의 상표입니다. VD Backup은 여러분의 기기에서 실행되며 설정한 대상으로만 업로드합니다.

## 태그

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`

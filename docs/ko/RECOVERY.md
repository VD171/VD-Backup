> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · 한국어 · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, PC에서 백업 복구하기 (Windows / macOS / Linux)

VDBackup 백업은 **표준 형식**을 사용하므로, 이 모듈 없이 어디서나 열 수 있습니다.
백업 폴더에는 `manifest.json`, APK (`*.apk.zst`), 데이터 아카이브
(`<item>.tar.zst`, `.tar.gz` 또는 `.tar.lz4`)가 들어 있으며, 선택적으로 끝에 `.age`가
붙어 암호화됩니다.

## 필요할 수 있는 도구

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (`.age` 파일에만 필요): https://github.com/FiloSottile/age/releases
- `tar`는 macOS, Linux, 최신 Windows 10/11에 내장되어 있습니다.
- `gzip`은 어디에나 내장되어 있습니다; `.tar.gz`에는 추가로 필요한 것이 없습니다.

## 1. 복호화 (파일이 `.age`로 끝나는 경우에만)

Keyfile (권장):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Passphrase:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

각 `*.age` 파일(APK와 데이터 아카이브)에 대해 동일하게 하세요.

## 2. 압축 해제 + 추출

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd가 lz4를 읽음):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APK는 그저 zstd로 압축된 APK (ZIP) 파일입니다:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## 참고

- 추출된 파일은 상대 경로를 유지합니다; SELinux 컨텍스트, uid/gid, modes는
  tar 안에 있습니다 (그리고 Android에서 복원할 때만 제대로 재적용됩니다).
- `manifest.json`은 각 파일이 정확히 무엇인지, 앱 버전, 원래 소유자/컨텍스트를
  설명합니다. 그것이 진실의 원천입니다.
- 여기 있는 어떤 것도 특정 장치에 묶여 있지 않습니다: 동일한 passphrase/keyfile이
  어떤 기계에서든 작동합니다.

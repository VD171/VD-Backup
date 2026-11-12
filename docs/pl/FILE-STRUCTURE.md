> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · [हिन्दी](../hi/FILE-STRUCTURE.md) · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · Polski · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# Struktura plików

Skomentowana mapa repozytorium, abyś wiedział, od czego zacząć.

```
VD-Backup/
├── module/                         # the flashable module (this IS the zip root)
│   ├── module.prop                 # id, name, version (v1.0, v1.01...), versionCode, author
│   ├── customize.sh                # install: guards, seed config, set permissions
│   ├── service.sh                  # boot hook: waits for boot, starts the scheduler
│   ├── uninstall.sh                # keeps user data, removes only transient state
│   ├── sepolicy.rule               # SELinux rules (none needed yet)
│   ├── update.json                 # in-app updater manifest
│   ├── scripts/                    # shell backend (dispatcher + detached engine)
│   │   ├── helper.sh               # WebUI command dispatcher (verb -> JSON)
│   │   └── worker.sh               # detached backup/restore engine (survives UI close)
│   ├── META-INF/.../update-binary  # standard installer stub (Magisk/KernelSU/APatch)
│   ├── bin/<abi>/                  # per-ABI static binaries (tar, zstd, rclone, ...)
│   │   ├── arm64-v8a/  armeabi-v7a/  x86/  x86_64/
│   ├── etc/                        # notify.sh, authorize-landing.html (OAuth), RECOVERY.md, vdbackup_helper.dex, companion.apk
│   └── webroot/                    # the WebUI
│       ├── index.html              # layout (tabs: Apps, Backups, Destinations, Settings)
│       ├── scripts.js              # app logic + root bridge (execCommand/helper)
│       ├── i18n.js                 # translation engine (I18N.t / apply / init / set)
│       ├── styles.css              # dark theme
│       ├── config.json             # WebUI manifest (title, icon, strict CSP, no network)
│       ├── assets/                 # logo-icon.svg, logo-wordmark.svg
│       └── lang/                   # en.js (fallback) + en.json + 20 more <code>.json
├── README.md + README.<code>.md    # English + the 21 standard languages
├── CHANGELOG.md                    # English only
├── CONTRIBUTING.md                 # how to contribute
├── CODE_OF_CONDUCT.md              # contributor code of conduct
├── SECURITY.md                     # security policy + how to report
├── LICENSE                         # GNU AGPL-3.0-or-later
├── docs/                           # all public docs (expanded below)
├── tools/screenshots/              # dev harness: renders the WebUI -> docs/screenshots (not shipped)
└── .github/
    ├── workflows/ci.yml            # build/sanity on every push & PR
    ├── workflows/VD-Backup.yml     # manual release (workflow_dispatch)
    ├── scripts/version.sh          # version bump (v1.0 -> v1.01 ...) + update.json
    ├── scripts/build_bin.sh        # build the per-ABI static binaries
    ├── ISSUE_TEMPLATE/             # bug / feature templates
    └── PULL_REQUEST_TEMPLATE.md
```

## Od czego zacząć

- **WebUI/UX lub tłumaczenia:** `module/webroot/` (oraz `lang/`).
- **Logika backupu/restore:** `module/scripts/helper.sh` i `module/scripts/worker.sh`.
- **Pakowanie/CI:** `.github/`.

## Dokumentacja (docs/)

```
docs/                               # all public documentation
├── USER-GUIDE.md                   # end-user guide
├── ARCHITECTURE.md                 # how VDBackup works internally
├── FILE-STRUCTURE.md               # this file
├── BINARIES.md                     # bundled binaries: origin, version, sha256
├── AI-AGENTS.md                    # notes for AI agents working on the repo
├── <code>/                         # 20 translations (ar cs de es fa fr hi in it ja ko nl pl pt ru sv th tr vi zh)
│   ├── USER-GUIDE.md  ARCHITECTURE.md  FILE-STRUCTURE.md  BINARIES.md  AI-AGENTS.md
│   ├── CHANGELOG.md  SECURITY.md  CODE_OF_CONDUCT.md  CONTRIBUTING.md
│   └── RECOVERY.md  bug_report.md  feature_request.md  PULL_REQUEST_TEMPLATE.md
└── screenshots/<code>/             # generated WebUI screenshots, per language
```

<!-- doc-footer -->

---

> _Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane; zobacz [CONTRIBUTING.md](CONTRIBUTING.md)._

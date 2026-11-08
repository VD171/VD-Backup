> **Languages:** [English](../FILE-STRUCTURE.md) · [العربية](../ar/FILE-STRUCTURE.md) · [Čeština](../cs/FILE-STRUCTURE.md) · [Deutsch](../de/FILE-STRUCTURE.md) · [Español](../es/FILE-STRUCTURE.md) · [فارسی](../fa/FILE-STRUCTURE.md) · [Français](../fr/FILE-STRUCTURE.md) · हिन्दी · [Bahasa Indonesia](../in/FILE-STRUCTURE.md) · [Italiano](../it/FILE-STRUCTURE.md) · [日本語](../ja/FILE-STRUCTURE.md) · [한국어](../ko/FILE-STRUCTURE.md) · [Nederlands](../nl/FILE-STRUCTURE.md) · [Polski](../pl/FILE-STRUCTURE.md) · [Português](../pt/FILE-STRUCTURE.md) · [Русский](../ru/FILE-STRUCTURE.md) · [Svenska](../sv/FILE-STRUCTURE.md) · [ไทย](../th/FILE-STRUCTURE.md) · [Türkçe](../tr/FILE-STRUCTURE.md) · [Tiếng Việt](../vi/FILE-STRUCTURE.md) · [中文](../zh/FILE-STRUCTURE.md)

---

# File structure

repository का एक commented map, ताकि आप जानें कि कहाँ से शुरू करना है।

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
├── CODE_OF_CONDUCT.md  SECURITY.md
├── LICENSE                         # GNU AGPL-3.0-or-later
├── docs/                           # public docs (this file)
├── tools/screenshots/              # dev harness: renders the WebUI -> docs/screenshots (not shipped)
└── .github/
    ├── workflows/ci.yml            # build/sanity on every push & PR
    ├── workflows/VD-Backup.yml     # manual release (workflow_dispatch)
    ├── scripts/version.sh          # version bump (v1.0 -> v1.01 ...) + update.json
    ├── scripts/build_bin.sh        # build the per-ABI static binaries
    ├── ISSUE_TEMPLATE/             # bug / feature templates
    └── PULL_REQUEST_TEMPLATE.md
```

## कहाँ से शुरू करें

- **WebUI/UX या translations:** `module/webroot/` (और `lang/`)।
- **Backup/restore logic:** `module/scripts/helper.sh` और `module/scripts/worker.sh`।
- **Packaging/CI:** `.github/`।

---

*यह documentation Claude (Anthropic) के साथ generated की गई थी और VD171 द्वारा maintained है। सुधार और बेहतरी का स्वागत है - देखें [CONTRIBUTING.md](CONTRIBUTING.md)।*

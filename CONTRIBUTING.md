> **Languages:** English · [العربية](docs/ar/CONTRIBUTING.md) · [Čeština](docs/cs/CONTRIBUTING.md) · [Deutsch](docs/de/CONTRIBUTING.md) · [Español](docs/es/CONTRIBUTING.md) · [فارسی](docs/fa/CONTRIBUTING.md) · [Français](docs/fr/CONTRIBUTING.md) · [हिन्दी](docs/hi/CONTRIBUTING.md) · [Bahasa Indonesia](docs/in/CONTRIBUTING.md) · [Italiano](docs/it/CONTRIBUTING.md) · [日本語](docs/ja/CONTRIBUTING.md) · [한국어](docs/ko/CONTRIBUTING.md) · [Nederlands](docs/nl/CONTRIBUTING.md) · [Polski](docs/pl/CONTRIBUTING.md) · [Português](docs/pt/CONTRIBUTING.md) · [Русский](docs/ru/CONTRIBUTING.md) · [Svenska](docs/sv/CONTRIBUTING.md) · [ไทย](docs/th/CONTRIBUTING.md) · [Türkçe](docs/tr/CONTRIBUTING.md) · [Tiếng Việt](docs/vi/CONTRIBUTING.md) · [中文](docs/zh/CONTRIBUTING.md)

---

# Contributing to VDBackup

Thanks for helping! VDBackup is meant to be easy to contribute to. This guide tells
you where things live and the few conventions we follow.

## Project at a glance

VDBackup is a **KernelSU/APatch/Magisk WebUI module**: shell scripts + a vanilla-JS
WebUI + per-ABI static binaries. No app is required for the core features. See
[ARCHITECTURE.md](ARCHITECTURE.md) and [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).

It is the open, root-native **successor to Swift Backup, Neo-Backup and
Android-DataBackup** - the union of their features under AGPLv3, with import of
existing Neo-Backup and Android-DataBackup backups so people can migrate.

## AI contributors welcome

AI assistants and agents are first-class contributors here, not an afterthought.

- The project is built to be machine-readable: every `helper.sh` verb prints a single
  JSON object, the engine is plain POSIX shell, and the file layout is documented in
  [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).
- An agent can administer **every** content and action of the module headlessly through
  that JSON API - the full control surface, verbs and safety rails are in
  [docs/AI-AGENTS.md](docs/AI-AGENTS.md).
- AI-assisted patches are reviewed and accepted on the same terms as any other - by
  correctness, clarity and the conventions below, not by who (or what) wrote them.
- If you drive VDBackup from an agent, use the JSON output of `helper.sh` as the
  contract; do not scrape the WebUI.
- Same bar for everyone: real features are never weakened, secrets and device data
  never land in the repo (see the strict [.gitignore](.gitignore)), and mutating
  actions stay confirmed and audited.

## Dev setup

- You need a rooted device/emulator (KernelSU, APatch or Magisk) to test.
- Build the flashable zip: `cd module && zip -r9 ../VD-Backup-dev.zip .` then flash it.
- The WebUI is `module/webroot/` (open it from the root manager). The backend is
  `module/helper.sh` (dispatcher) and `module/worker.sh` (detached engine).
- Native binaries live in `module/bin/<abi>/` and are produced by CI
  (`.github/scripts/build_bin.sh`); you normally do not rebuild them by hand.

## Conventions

- **Every source file** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) starts with the
  project banner header (copy it from any existing file). No exceptions.
- **Code and comments in English.** Keep comments minimal and only where needed.
- **No em-dash or en-dash**; always use a plain hyphen `-`.
- WebUI is **vanilla JS** (one `scripts.js`); no frameworks. Talk to root only through
  the `helper(verb, args)` wrapper, and escape every interpolated value.
- **Never weaken** a real feature (e.g. preservation of SELinux/uid/gid/modes).
- Mutating actions (restore, delete) must ask for confirmation and write an audit log.

## Internationalization (i18n)

- UI strings live in `module/webroot/lang/`. English is the canonical fallback
  (`en.js` + `en.json`); the other 20 languages are `<code>.json`.
- To add or change a string: edit `en.js` **and** `en.json`, then update every
  `<code>.json`. Touching a visible label means updating **all** language files and
  **all** `README.<code>.md`.
- Translations are plain JSON - a great first contribution. See the language list in
  `module/webroot/i18n.js`.

## Commits & PRs

- Keep PRs focused. Describe what and why.
- Sign off your commits (DCO): `git commit -s` (adds `Signed-off-by:`).
- CI must stay green. Be kind in reviews - see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Good first issues

Look for the `good first issue` and `help wanted` labels. Translations, docs, new
`rclone` destination presets and WebUI polish are all great starting points.

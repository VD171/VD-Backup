<!--
 ======================================================================
  VD BACKUP  ::  root backup & restore, no grant prompt
  Full app/data backup & restore as root - KernelSU/APatch/Magisk WebUI.

  Copyright (C) 2026  VD171
  SPDX-License-Identifier: AGPL-3.0-or-later

  Free software under the GNU AGPL v3 or later. NETWORK COPYLEFT: run a
  modified version, even as a service, and you MUST offer its source.

  Site           : https://vd171.ru
  Site           : https://vd.priv8.ru
  Source         : https://github.com/VD171/VD-Backup
  GitHub         : @VD171 https://github.com/VD171
  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
  XDA-Thread     : https://xdaforums.com/t/VD-Backup.4807267/
  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
  Telegram       : @Priv8_VD https://t.me/Priv8_VD
  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
  E-mail         : vd.priv8@pm.me
 ======================================================================
-->

# Screenshot harness

Regenerates the documentation screenshots in `docs/screenshots/<lang>/` from the
**real** WebUI in `module/webroot/`. It renders the live `index.html` in a headless
Chrome, under a mocked `ksu.exec` bridge that answers every `helper.sh` verb with
fictional, privacy-safe fixtures, and captures the six documented screens in each of
the 21 languages (dark theme, 412x915 at 3x device-pixel-ratio).

## Run

```sh
python3 tools/screenshots/shoot.py            # all 21 languages (126 PNGs)
python3 tools/screenshots/shoot.py pt en ar   # only the given language codes
```

Requirements: `python3-playwright` (the Python package) and a system Google Chrome or
Chromium. No network is used; a throwaway loopback HTTP server serves the webroot so
the UI's `fetch` of `lang/<code>.json` works.

## Why it lives in the repo

The harness used to live in a scratch directory and was lost twice. Keeping it versioned
here makes the screenshots reproducible and keeps the harness in step with the UI:

- the version badge, the app list, every label and the right-to-left mirroring come from
  the live webroot plus `lang/*.json`, so a UI or string change is reflected on the next
  run with no edit to the harness;
- the shown version is read from `module/module.prop`, so a release bump needs no change
  here either;
- the mock data is declared once in `build_fixtures()` in `shoot.py`; when the UI starts
  calling a new `helper.sh` verb, add it there.

`tools/` is outside `module/`, so it is never copied into the flashed module zip - it
ships only to the dev remote, never to end users.

## Rules (match the project)

- **Mock only, never a real device.** The fixtures are invented (sample FOSS apps,
  invented counts). Real screenshots would leak the owner's installed apps and backups.
- **Faithful.** Fixtures use the engine's real verb names and op names (e.g. the activity
  log uses `scheduler-run`, `delete-backup`, `prune` - the strings the engine actually
  writes), so a screenshot never shows a state the app cannot produce.
- **All 21 languages, per language**, including `dir=rtl` for `ar` and `fa`.

## The six screens

| File (`<lang>/*.png`) | Tab | Notes |
|---|---|---|
| `home-dark` | Apps | bento stats + storage bar at the top |
| `apps-dark` | Apps | the app list (scrolled past the overview) |
| `schedule-dark` | Schedule | jobs with gate badges + the add-job form |
| `destinations-dark` | Destinations | destinations + remotes + add forms |
| `settings-dark` | Settings | theme, interface scale, language, accent, backup defaults |
| `activitylog-dark` | Activity log | the audit log screen |

*This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome - see [CONTRIBUTING.md](../../CONTRIBUTING.md).*

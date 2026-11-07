<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VDBackup" width="320">
</p>

<p align="center">
  <b>Úplné zálohování a obnova aplikací a dat jako root - plně ovládané přes WebUI.</b><br>
  Modul KernelSU / APatch / Magisk. Žádná výzva "udělit su", žádné přepínání <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Vydání</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki">Wiki</a> ·
  <a href="docs/USER-GUIDE.md">Uživatelská příručka</a> ·
  <a href="docs/AI-AGENTS.md">AI agenti</a> ·
  <a href="CHANGELOG.md">Seznam změn</a> ·
  <a href="CONTRIBUTING.md">Přispívání</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">Vlákno na XDA</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

---

## Co to je

VDBackup je root-**modul WebUI**, který zálohuje a obnovuje vaše aplikace a jejich data
**bez doprovodné aplikace pro základní funkce** - protože modul už běží jako root, není co
"povolovat". Jeho cílem je pokrýt vše, co dělají oblíbené zálohovací aplikace, na jednom
místě a s přehledným WebUI.

Je zamýšlen jako otevřený, nativně-rootový **nástupce Swift Backup, Neo-Backup a
Android-DataBackup**: sjednocení toho, co dělají, pod licencí AGPLv3, a dokonce umí
importovat existující zálohy Neo-Backup a Android-DataBackup, abyste mohli přejít.

## Funkce

- **Aplikace:** APK (základ + splity), data aplikací (`/data/data`), data chráněná
  zařízením (`/data/user_de`), externí data (`Android/data`), OBB, média.
- **Systémová/zvláštní data:** oprávnění, AppOps a (volitelně) SSAID, kde to root umožňuje.
- **Režimy zálohování:** **Full** (přenosný `tar.zst`), **Snapshot** (přírůstkový +
  verzovaný, přes `restic`) a **Mirror** (synchronizace 1:1, přes `rclone`/`rsync`).
- **Věrné zachování:** kontexty SELinux, uid/gid, režimy, xattr a capabilities.
- **Komprese:** žádná / lz4 / zstd / gzip (gzip = "režim kompatibility", otevře se kdekoli).
- **Šifrování:** volitelné a přenosné (`age` + heslo nebo AES-256 zip) - nikdy nevázané
  na hardware zařízení, takže se záloha obnoví na jiném zařízení nebo otevře na počítači.
- **Cíle:** místní, SFTP, SCP, SMB, WebDAV, FTP, S3 a dalších 70+ (`rclone`),
  plus repozitáře `rsync` a `restic`. Volitelně Google Drive přes drobného volitelného společníka.
- **Integrita:** každý archiv je ověřen proti manifestu; zkušební běh (dry-run) a test
  obnovy umožňují zkontrolovat zálohu, aniž byste cokoli změnili.
- **Selektivní a dávková obnova:** obnovte libovolnou podmnožinu položek zálohy nebo vyberte
  více záloh a obnovte je všechny najednou; mažte zálohy a veďte protokol aktivity/auditu
  každé destruktivní akce.
- **Speciální zálohy:** zprávy (SMS/MMS), kontakty a seznam hovorů, Wi-Fi a Bluetooth,
  s volitelným přenosným exportem do JSON, který otevřete na PC.
- **Plánování + automatizace:** opakující se úlohy **zálohy nebo obnovy** cílící na jednu
  aplikaci, sadu nebo všechny aplikace, s prořezáváním keep-N, plus volitelná automatická
  záloha při instalaci/aktualizaci a seznam vyloučených aplikací.
- **Zdroj instalace:** obnovené aplikace ve výchozím nastavení hlásí jako zdroj instalace
  Play Store (přepínatelné); pokročilá volitelná možnost také zfalšuje iniciující balíček a zdroj.
- **Připojení jako systémová aplikace:** připojte nainstalovanou aplikaci jako systémovou, aniž
  byste se dotkli skutečného oddílu `/system` (bezsystémový overlay podmodul, s ohledem na NoMount).
- **Na pozadí:** zálohování/obnova běží odpojeně a přežijí zavření WebUI, s oznámeními
  o začátku/dokončení.
- **Migrace:** importuje existující zálohy Neo-Backup a Android-DataBackup, včetně těch
  zašifrovaných heslem.

## Snímky obrazovky

| Domů | Aplikace | Plán |
|:---:|:---:|:---:|
| ![Domů](docs/screenshots/cs/home-dark.png) | ![Aplikace](docs/screenshots/cs/apps-dark.png) | ![Plán](docs/screenshots/cs/schedule-dark.png) |
| **Cíle** | **Nastavení** | **Protokol aktivity** |
| ![Cíle](docs/screenshots/cs/destinations-dark.png) | ![Nastavení](docs/screenshots/cs/settings-dark.png) | ![Protokol aktivity](docs/screenshots/cs/activitylog-dark.png) |

## Instalace

1. Stáhněte nejnovější `VD-Backup-vX.Y.zip` z [Vydání](https://github.com/VD171/VD-Backup/releases).
2. Nainstalujte jej ve správci KernelSU / APatch / Magisk - použitelný okamžitě, restart není potřeba.
3. Otevřete **WebUI** modulu, abyste nakonfigurovali a spouštěli zálohy. A je to.

**Edice.** Každé vydání se dodává jako šest zipů. `universal-full` - každá architektura a každá binárka zabudovaná (včetně `rclone` pro cloudové poskytovatele a `restic` pro snímky), plně offline, nikdy se nic nestahuje, jakékoli zařízení, největší. `universal-lite` - každá architektura bez dvou největších binárek (`rclone`, `restic`), nejmenší; stále zvládá lokální zálohy, SSH/SFTP a `rsync` bez jakéhokoli stahování a při prvním použití cloudového cíle (`rclone`) nebo režimu snímků (`restic`) nabídne jednorázové stažení onoho malého doplňku pro danou architekturu (ověřeného přes SHA-256) a uloží jej do mezipaměti, takže poté fungují i tyto funkce. `<abi>-full` (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`) - jediná architektura se všemi binárkami zabudovanými, menší než `universal-full`. Znáte svou architekturu -> zvolte `<abi>-full`; chcete nejmenší a nevadí vám jednorázové stažení pro cloud nebo snímky -> `universal-lite`; chcete vše zabudované bez jakéhokoli stahování (offline / obnova) -> edici full. Viz [Vydání](https://github.com/VD171/VD-Backup/releases).

Jste tu noví? [Uživatelská příručka](docs/USER-GUIDE.md) vás provede od instalace až po obnovu.

## Přenositelnost

Vaše zálohy **nejsou uzamčené v tomto modulu**. Vše používá standardní formáty
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`), které se otevřou ve Windows, macOS i
Linuxu běžnými nástroji nebo správci souborů. Každá šifrovaná záloha je dodávána s
poznámkou **RECOVERY** obsahující přesné příkazy pro dešifrování a rozbalení na počítači.

## Sestavení

Modul tvoří shell + WebUI plus statické binárky pro každou ABI (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`) sestavené pro `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64`. Viz [CONTRIBUTING.md](CONTRIBUTING.md) a pracovní postupy CI.

## Dokumentace

- **[Wiki](https://github.com/VD171/VD-Backup/wiki)** - dokumentace k procházení online.
- **[Uživatelská příručka](docs/USER-GUIDE.md)** - od začátku do konce, od instalace po obnovu.
- **[AI agenti](docs/AI-AGENTS.md)** - řiďte každou akci bezhlavě přes JSON API.
- **[Architektura](docs/ARCHITECTURE.md)** a **[Struktura souborů](docs/FILE-STRUCTURE.md)** - jak to funguje.
- **[Přibalené binárky](docs/BINARIES.md)** - původ a SHA-256 každé předkompilované binárky, pro úplný audit.
- **[Obnovení](module/etc/RECOVERY.md)** - otevřete a dešifrujte zálohu na počítači, bez modulu.
- **[Přispívání](CONTRIBUTING.md)** a **[Bezpečnost](SECURITY.md)**.
- **[Seznam změn](CHANGELOG.md)** a **[Kodex chování](CODE_OF_CONDUCT.md)**.

## Přívětivý k AI

VDBackup je postaven tak, aby byl vstřícný k asistentům a agentům AI, nejen k lidem.
Engine mluví JSON (každé sloveso `helper.sh` vrací jediný objekt JSON), kód, dokumentace
a struktura souborů jsou uspořádány pro strojové čtení a příspěvky s pomocí AI se posuzují
a přijímají jako kterékoli jiné. Agent může spravovat **každou** akci modulu bezhlavě přes
stejné API, které používá WebUI - úplnou řídicí plochu najdete v
**[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** a chcete-li přispět, v
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome).

## Kontakty

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

## Viz také

Sesterské projekty téhož autora:

- **[VDInfos](https://github.com/VD171/VD-Infos)** - debugger metod zařízení: čte každou položku všemi metodami, které ji dokážou přečíst, a porovnává je vedle sebe.
- **[VDGoogle](https://github.com/VD171/VD-Google)** - vaše služby Google (RCS, Wallet, atestace Play Integrity) čtené na vašem zařízení bez internetu.
- **[COPG-VD](https://github.com/VD171/COPG-VD)** - nástroj pro podvržení zařízení, který promění čerstvý fingerprint v soudržný, konzistentní profil.

## Licence

[GNU AGPL-3.0-or-later](LICENSE). Síťový copyleft: pokud provozujete upravenou verzi,
i jako službu, musíte nabídnout její zdrojový kód.

---

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`

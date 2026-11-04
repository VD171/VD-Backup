> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · Čeština · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Přispívání do VDBackup

Děkujeme za pomoc! VDBackup je navržen tak, aby se do něj snadno přispívalo. Tento návod
vám řekne, kde co leží, a popisuje těch pár konvencí, které dodržujeme.

## Projekt ve zkratce

VDBackup je **KernelSU/APatch/Magisk WebUI modul**: shellové skripty + vanilla-JS
WebUI + statické binárky pro každé ABI. Pro hlavní funkce není potřeba žádná aplikace. Viz
[ARCHITECTURE.md](ARCHITECTURE.md) a [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).

Je to otevřený, root-native **nástupce Swift Backup, Neo-Backup a
Android-DataBackup** - sjednocení jejich funkcí pod licencí AGPLv3, s importem
existujících záloh Neo-Backup a Android-DataBackup, aby lidé mohli migrovat.

## AI přispěvatelé jsou vítáni

AI asistenti a agenti jsou zde plnohodnotnými přispěvateli, nikoli dodatečnou myšlenkou.

- Projekt je postaven tak, aby byl strojově čitelný: každé sloveso `helper.sh` vypíše jediný
  JSON objekt, engine je obyčejný POSIX shell a rozložení souborů je zdokumentováno v
  [docs/FILE-STRUCTURE.md](docs/FILE-STRUCTURE.md).
- Agent může spravovat **každý** obsah a akci modulu bezhlavě (headless) přes
  tohle JSON API - kompletní řídicí plocha, slovesa a bezpečnostní mantinely jsou v
  [docs/AI-AGENTS.md](docs/AI-AGENTS.md).
- Záplaty vytvořené s pomocí AI jsou posuzovány a přijímány za stejných podmínek jako jakékoli jiné - podle
  správnosti, srozumitelnosti a níže uvedených konvencí, nikoli podle toho, kdo (nebo co) je napsal.
- Pokud řídíte VDBackup z agenta, používejte jako smlouvu JSON výstup `helper.sh`;
  nescrapujte WebUI.
- Stejná laťka pro všechny: skutečné funkce se nikdy neoslabují, tajemství a data zařízení
  se nikdy nedostanou do repozitáře (viz striktní [.gitignore](.gitignore)) a měnící
  akce zůstávají potvrzované a auditované.

## Vývojové prostředí

- K testování potřebujete rootnuté zařízení/emulátor (KernelSU, APatch nebo Magisk).
- Sestavte flashovatelný zip: `cd module && zip -r9 ../VD-Backup-dev.zip .` a poté ho flashněte.
- WebUI je `module/webroot/` (otevřete ho ze správce rootu). Backend je
  `module/helper.sh` (dispatcher) a `module/worker.sh` (odpojený engine).
- Nativní binárky žijí v `module/bin/<abi>/` a vytváří je CI
  (`.github/scripts/build_bin.sh`); běžně je ručně nepřekompilováváte.

## Konvence

- **Každý zdrojový soubor** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) začíná
  banner hlavičkou projektu (zkopírujte ji z libovolného existujícího souboru). Bez výjimek.
- **Kód a komentáře v angličtině.** Udržujte komentáře minimální a jen tam, kde jsou potřeba.
- **Žádná em-dash ani en-dash**; vždy používejte obyčejný spojovník `-`.
- WebUI je **vanilla JS** (jeden `scripts.js`); žádné frameworky. S rootem komunikujte jen přes
  wrapper `helper(verb, args)` a escapujte každou interpolovanou hodnotu.
- **Nikdy neoslabujte** skutečnou funkci (např. zachování SELinux/uid/gid/režimů).
- Měnící akce (obnova, mazání) musí vyžádat potvrzení a zapsat auditní log.

## Internacionalizace (i18n)

- Řetězce UI žijí v `module/webroot/lang/`. Angličtina je kanonický fallback
  (`en.js` + `en.json`); ostatních 20 jazyků jsou `<code>.json`.
- Pro přidání nebo změnu řetězce: upravte `en.js` **a** `en.json`, poté aktualizujte každý
  `<code>.json`. Dotknout se viditelného popisku znamená aktualizovat **všechny** jazykové soubory a
  **všechny** `README.<code>.md`.
- Překlady jsou obyčejný JSON - skvělý první příspěvek. Viz seznam jazyků v
  `module/webroot/i18n.js`.

## Commity a PR

- Udržujte PR zaměřené. Popište co a proč.
- Podepište své commity (DCO): `git commit -s` (přidá `Signed-off-by:`).
- CI musí zůstat zelená. Buďte v recenzích laskaví - viz [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Dobré první issues

Hledejte štítky `good first issue` a `help wanted`. Překlady, dokumentace, nové
předvolby destinací `rclone` a vylepšování WebUI jsou skvělé výchozí body.

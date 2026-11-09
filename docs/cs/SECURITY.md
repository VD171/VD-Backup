> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · Čeština · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Bezpečnostní zásady

VDBackup běží jako root a pracuje s vašimi daty a (volitelně) s vašimi přihlašovacími údaji a
šifrovacími heslovými frázemi. Bezpečnost bereme vážně.

## Nahlášení zranitelnosti

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Přiložte jasný popis a pokud možno kroky k reprodukci. Odpovíme co nejdříve
a připíšeme vám zásluhy, pokud si to budete přát.

## Poznámky k rozsahu

- Přihlašovací údaje a heslové fráze jsou uloženy šifrovaně v klidovém stavu a nikdy se nezapisují
  v otevřeném textu. Zálohy nikdy nejsou vázány na hardwarové klíče zařízení (takže zůstávají
  přenositelné), což také znamená, že právě heslová fráze chrání šifrovanou zálohu -
  zvolte silnou.
- Volitelná doprovodná aplikace Google Drive by měla být vždy skryta pomocí [HMA-OSS](https://github.com/frknkrc44/HMA-OSS), aby
  neodhalila root ani odemčený bootloader.
- Obnovení běží jako root, takže každý archiv je zkontrolován, než se cokoli zapíše:
  záloha, jejíž obsah ukazuje mimo svůj cíl (absolutní cesta nebo komponenta `..`), je
  odmítnuta a žádný soubor není rozbalen, dokud není prověřen celý archiv.
- Každý předkompilovaný binární soubor a knihovna jsou dohledatelné k připnutému veřejnému upstreamu
  se zaznamenaným SHA-256 a manifest je dodáván v zařízení, takže přibalený obsah lze auditovat a
  reprodukovat. Viz [BINARIES.md](BINARIES.md).

*Tato dokumentace byla vygenerována pomocí Claude (Anthropic) a je spravována VD171. Opravy a vylepšení jsou vítány - viz [CONTRIBUTING.md](CONTRIBUTING.md).*

> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · Italiano · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Українська](../uk/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Politica di sicurezza

VDBackup gira come root e gestisce i tuoi dati e (opzionalmente) le tue credenziali e
le passphrase di cifratura. Prendiamo la sicurezza sul serio.

## Segnalare una vulnerabilità

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

Includi una descrizione chiara e, se possibile, i passaggi per riprodurre il problema. Risponderemo il
prima possibile e ti daremo credito se lo desideri.

## Note sull'ambito

- Le credenziali e le passphrase sono memorizzate cifrate a riposo e non vengono mai scritte in
  chiaro. I backup non sono mai legati a chiavi hardware vincolate al dispositivo (così da restare
  portabili), il che significa anche che la passphrase è ciò che protegge un backup cifrato -
  scegline una robusta.
- Queste credenziali risiedono su archiviazione cifrata per credenziale (`/data/misc_ce`), bloccata fino al primo sblocco dopo il riavvio, quindi mai leggibili prima di quello sblocco, a differenza di `/data/adb`. Un aggiornamento del modulo vi sposta le copie vecchie in modo permanente (verificando ciascuna prima di rimuovere l'originale), e persistono tra le reinstallazioni.
- Una destinazione di backup locale deve restare cifrata a riposo: sono consentiti solo archiviazione utente interna e rimovibile, mai `/data/adb`, `/data/system` o altri percorsi leggibili prima del primo sblocco, né un attraversamento `..`. I supporti rimovibili SD/USB non sono cifrati a riposo, quindi vieni avvisato (non bloccato) di attivare la cifratura del backup per essi.
- L'app companion opzionale per Google Drive dovrebbe sempre essere nascosta con [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) così da non
  rivelare il root o un bootloader sbloccato.
- Il ripristino viene eseguito come root, quindi ogni archivio viene controllato prima di
  scrivere qualsiasi cosa: un backup il cui contenuto punti al di fuori della sua destinazione
  (un percorso assoluto o un componente `..`) viene rifiutato, e nessun file viene estratto
  finché l'intero archivio non è stato approvato.
- Ogni binario e libreria precompilati sono tracciabili fino a un upstream pubblico fissato, con un
  SHA-256 registrato, e il manifest è incluso sul dispositivo, così che il payload incluso possa
  essere verificato e riprodotto. Vedi [BINARIES.md](BINARIES.md).

<!-- doc-footer -->

---

> _Questa documentazione è stata generata con Claude (Anthropic) ed è gestita da VD171. Correzioni e miglioramenti sono benvenuti; vedi [CONTRIBUTING.md](CONTRIBUTING.md)._

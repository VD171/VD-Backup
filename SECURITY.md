# Security Policy

VDBackup runs as root and handles your data and (optionally) your credentials and
encryption passphrases. We take security seriously.

## Reporting a vulnerability

Please report security issues **privately** - do not open a public issue for them.
Reach out through any of these:

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues (non-security reports only)
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Include a clear description and, if possible, steps to reproduce. We will respond as
soon as we can and credit you if you wish.

## Scope notes

- Credentials and passphrases are stored encrypted at rest and are never written in
  clear text. Backups are never tied to device-bound hardware keys (so they stay
  portable), which also means the passphrase is what protects an encrypted backup -
  choose a strong one.
- The optional Google Drive companion app should always be hidden with HMA-OSS so it
  does not reveal root or an unlocked bootloader.

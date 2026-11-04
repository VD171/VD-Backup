> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · Español · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Política de seguridad

VDBackup corre como root y maneja tus datos y (opcionalmente) tus credenciales y
frases de cifrado. Nos tomamos la seguridad en serio.

## Reportar una vulnerabilidad

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues (solo reportes que no sean de seguridad)
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Incluye una descripción clara y, si es posible, los pasos para reproducir. Responderemos tan
pronto como podamos y te daremos crédito si lo deseas.

## Notas de alcance

- Las credenciales y las frases de cifrado se almacenan cifradas en reposo y nunca se escriben en
  texto claro. Los backups nunca se atan a claves de hardware ligadas al dispositivo (así que se mantienen
  portables), lo que también significa que la frase de cifrado es lo que protege un backup cifrado -
  elige una fuerte.
- La aplicación complementaria opcional de Google Drive siempre debe ocultarse con HMA-OSS para que no
  revele root ni un bootloader desbloqueado.

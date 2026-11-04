> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · Русский · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Политика безопасности

VDBackup работает от имени root и обрабатывает ваши данные и (опционально) ваши учётные данные и
парольные фразы шифрования. Мы относимся к безопасности серьёзно.

## Сообщение об уязвимости

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues (только несвязанные с безопасностью сообщения)
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Приложите ясное описание и, если возможно, шаги для воспроизведения. Мы ответим как
можно скорее и укажем ваше авторство, если вы того пожелаете.

## Замечания по области действия

- Учётные данные и парольные фразы хранятся зашифрованными в состоянии покоя и никогда не записываются в
  открытом виде. Резервные копии никогда не привязываются к аппаратным ключам устройства (чтобы они оставались
  переносимыми), что также означает, что именно парольная фраза защищает зашифрованную резервную копию -
  выбирайте надёжную.
- Опциональное приложение-компаньон Google Drive всегда следует скрывать с помощью HMA-OSS, чтобы оно
  не раскрывало root или разблокированный загрузчик.

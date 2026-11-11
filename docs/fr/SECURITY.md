> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · Français · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Politique de sécurité

VDBackup s'exécute en root et manipule vos données et (en option) vos identifiants et
phrases de passe de chiffrement. Nous prenons la sécurité au sérieux.

## Signaler une vulnérabilité

- **Site :** https://vd171.ru
- **Site :** https://vd.priv8.ru
- **Issues :** https://github.com/VD171/VD-Backup/issues
- **GitHub :** [@VD171](https://github.com/VD171)
- **XDA-Developers :** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **Fil XDA :** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram :** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram :** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord :** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail :** vd.priv8@pm.me

Incluez une description claire et, si possible, les étapes pour reproduire. Nous répondrons dès
que possible et vous créditerons si vous le souhaitez.

## Notes sur la portée

- Les identifiants et phrases de passe sont stockés chiffrés au repos et ne sont jamais écrits en
  clair. Les backups ne sont jamais liés à des clés matérielles propres à l'appareil (afin de rester
  portables), ce qui signifie aussi que la phrase de passe est ce qui protège un backup chiffré -
  choisissez-en une solide.
- Ces identifiants résident sur un stockage chiffré par identifiant (`/data/misc_ce`), verrouillé jusqu'au premier déverrouillage après un redémarrage, donc jamais lisibles avant ce déverrouillage, contrairement à `/data/adb`. Une mise à jour du module y déplace les anciennes copies de façon permanente (en vérifiant chacune avant de supprimer l'original), et elles persistent à travers les réinstallations.
- Une destination de sauvegarde locale doit elle-même rester chiffrée au repos : seuls le stockage utilisateur interne et amovible sont autorisés, jamais `/data/adb`, `/data/system` ou d'autres chemins lisibles avant le premier déverrouillage, ni un parcours `..`. Le support amovible SD/USB n'est pas chiffré au repos, vous êtes donc averti (sans blocage) d'activer le chiffrement de la sauvegarde pour lui.
- L'application compagnon Google Drive optionnelle devrait toujours être masquée avec [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) afin qu'elle ne
  révèle ni le root ni un bootloader déverrouillé.
- La restauration s'exécute en tant que root, donc chaque archive est vérifiée avant toute
  écriture : un backup dont le contenu pointe en dehors de sa cible (un chemin absolu ou un
  composant `..`) est refusé, et aucun fichier n'est extrait tant que l'archive entière n'est
  pas validée.
- Chaque binaire et bibliothèque précompilés sont traçables jusqu'à une source amont publique figée,
  avec un SHA-256 enregistré, et le manifeste est embarqué sur l'appareil, de sorte que la charge
  fournie peut être auditée et reproduite. Voir [BINARIES.md](BINARIES.md).

*Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues, voir [CONTRIBUTING.md](CONTRIBUTING.md).*

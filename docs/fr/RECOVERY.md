> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · Français · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../id/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, récupérer un backup sur un PC (Windows / macOS / Linux)

Vos backups VDBackup utilisent des **formats standard**, donc vous pouvez les ouvrir n'importe où,
sans ce module. Un dossier de backup contient un `manifest.json`, les APK
(`*.apk.zst`) et les archives de données (`<item>.tar.zst`, `.tar.gz` ou `.tar.lz4`),
éventuellement chiffrées avec un `.age` en suffixe.

**Si les données sont chiffrées**, les métadonnées le sont aussi, donc rien n'en fuit vers
quiconque n'a que les fichiers. Le dossier contient alors aussi `manifest.full.age` (le manifeste
complet) et deux petits fichiers `stub.*.age`. Dans ce cas, `manifest.json` n'est qu'un marqueur
minuscule et non sensible ; les vrais détails sont dans `manifest.full.age`. Tout ce qui est portable
(les archives de données et `manifest.full.age`) se déchiffre avec seulement votre **phrase de passe** -
voir l'étape 1. Les fichiers `stub.dev.age` / `stub.pass.age` ne sont que le cache de listage de la
vue de la liste du module sur l'appareil ; vous pouvez les ignorer sur un PC.

## Outils dont vous pourriez avoir besoin

- **zstd** : https://github.com/facebook/zstd/releases  (macOS : `brew install zstd`, Linux : `apt install zstd`)
- **age** (seulement pour les fichiers `.age`) : https://github.com/FiloSottile/age/releases
- `tar` est intégré à macOS, Linux et Windows 10/11 modernes.
- `gzip` est intégré partout, pour `.tar.gz` vous n'avez besoin de rien de plus.

## 1. Déchiffrer (seulement si le fichier se termine par `.age`)

Phrase de passe (la méthode portable - fonctionne sur n'importe quel PC avec seulement votre phrase de passe) :

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Faites de même pour chaque fichier `*.age` (APK et archives de données). Si le backup est chiffré,
déchiffrez `manifest.full.age` de la même façon pour lire le manifeste complet :

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

## 2. Décompresser + extraire

`.tar.zst` :

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz` :

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd lit le lz4) :

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

Les APK ne sont que des fichiers APK (ZIP) compressés en zstd :

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Notes

- Les fichiers extraits conservent leurs chemins relatifs, le contexte SELinux, uid/gid et modes
  sont à l'intérieur du tar (et ne sont réappliqués correctement que lorsque vous restaurez sur Android).
- `manifest.json` décrit exactement ce qu'est chaque fichier, la version de l'application et
  l'owner/contexte d'origine. C'est la source de vérité. Pour un backup chiffré, le manifeste complet
  est `manifest.full.age` (déchiffrez-le comme à l'étape 1) ; le `manifest.json` en clair n'est qu'un
  petit marqueur et ne porte aucune donnée sensible.
- Rien ici n'est lié à un appareil spécifique : la même phrase de passe fonctionne sur n'importe quelle
  machine.

<!-- doc-footer -->

---

> _Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues, voir [CONTRIBUTING.md](CONTRIBUTING.md)._

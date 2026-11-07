> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · Français · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# Binaires inclus : provenance et audit

La confidentialité et la sécurité ne sont pas optionnelles dans VDBackup. Un outil de
sauvegarde s'exécute en root sur vos données les plus personnelles, vous devez donc pouvoir
voir exactement ce qui est inclus à l'intérieur. Cette page documente chaque binaire et
bibliothèque préconstruits que le module transporte, d'où provient chacun, et comment
vérifier que rien d'opaque n'a été glissé dedans.

## Principes

- **Rien d'opaque.** Chaque binaire et bibliothèque livrés sont traçables jusqu'à un upstream
  public et nommé à une version épinglée, avec une SHA-256 enregistrée. Aucun blob n'est inclus
  sans une entrée que vous pouvez contrôler.
- **Récupéré depuis l'upstream, jamais depuis un appareil.** Les outils natifs proviennent du
  dépôt de paquets officiel Termux (les fichiers `.deb` signés sur `packages.termux.dev/apt`),
  jamais copiés depuis un Termux installé sur un téléphone. Le build échoue bruyamment, il
  n'improvise jamais.
- **Reproductible.** Relancez le build et vous obtenez les mêmes fichiers ; récupérez à nouveau
  les sources épinglées et les valeurs SHA-256 correspondent.
- **La piste d'audit est livrée avec le module.** Elle n'est pas seulement sur le site web - elle
  voyage à l'intérieur du module installé, sur votre appareil, pour que vous puissiez auditer
  hors ligne.

## Ce qui est inclus, et d'où

| Artefact | Source | Comment c'est construit |
|---|---|---|
| `bin/<abi>/` outils natifs (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + leur closure `lib/` | Dépôt apt **Termux** officiel (`packages.termux.dev/apt`), paquets `.deb` officiels | `.github/scripts/build_bin.sh` télécharge les fichiers `.deb` + leurs dépendances transitives, les extrait, et copie les binaires ainsi que seulement les bibliothèques partagées dont chacun a besoin |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (repli du convertisseur ABX) | Release GitHub de **rhythmcache/android-xml-converter** (`ABX_RELEASE`, ELF statique) | téléchargé depuis la release épinglée par `build_bin.sh` |
| `companion.apk` (compagnon Google Drive optionnel) | **Ce dépôt**, `companion/` (Gradle/Kotlin) | construit depuis les sources par la CI et signé avec la clé du projet (`VD_Key`) ; pas un blob préconstruit |
| `vdbhelper.dex` (assistant framework) | **Ce dépôt**, `dex/src/` (Java) | compilé depuis les sources par la CI avec `javac` + `d8` |

Seules les deux premières lignes sont des binaires tiers préconstruits ; les deux dernières sont
construites depuis des sources qui vivent dans ce dépôt et peuvent être lues et reconstruites.

> **Éditions Full vs lite.** Les éditions lite n'omettent que `rclone` et `restic` (les deux plus gros binaires) pour rester petites et les récupèrent à la demande (vérifiés par SHA-256) la première fois que vous utilisez une destination cloud ou le mode instantané ; `rsync` et `ssh`/`scp`/`sftp` sont toujours présents, et tous les autres binaires listés ci-dessus sont également présents. Les éditions Full fournissent `rclone` (fournisseurs cloud) et `restic` (instantanés) intégrés, de sorte que rien n'est jamais téléchargé.

## Le manifeste sur l'appareil : `PROVENANCE.json`

`build_bin.sh` écrit un `bin/<abi>/PROVENANCE.json` par ABI. À l'installation, le module ne garde
que l'ABI de votre appareil, donc ce fichier reste sur l'appareil à
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`. Il enregistre :

- `sources` : chaque `.deb` d'upstream (paquet, version, URL complète, SHA-256 du `.deb`) et la
  release ABX (URL, SHA-256 de l'archive).
- `files` : chaque fichier réellement livré sous `bin/<abi>/` (chemin, taille, SHA-256).

Vous pouvez le lire dans la WebUI (l'onglet **À propos** y renvoie) ou via l'API agent :

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Comment vérifier (étape par étape)

1. **Contrôlez les fichiers livrés.** Hachez chaque fichier sous `bin/<abi>/` sur votre appareil et
   comparez à `files[].sha256` dans `PROVENANCE.json` :
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Contrôlez les fichiers face à l'upstream.** Pour chaque entrée `sources[]`, téléchargez le
   `.deb` épinglé depuis son URL, confirmez que sa SHA-256 correspond à `deb_sha256`, extrayez-le,
   et confirmez que les binaires/bibliothèques qu'il contient produisent les mêmes valeurs que
   celles livrées. Les fichiers `.deb` du dépôt Termux sont eux-mêmes servis depuis le dépôt apt
   signé de Termux.
3. **Reconstruisez depuis zéro.** Lancez vous-même `.github/scripts/build_bin.sh` (ne nécessite que
   `curl`, `ar`, `tar`, `xz`, `zstd`, `readelf`) et comparez la sortie à ce qui a été livré.
4. **Compagnon et dex.** Reconstruisez `companion/` et `dex/` depuis les sources ; la signature du
   compagnon est la clé du projet `VD_Key` (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Signalement

Si un fichier livré ne correspond pas à sa source enregistrée, traitez cela comme un problème de
sécurité et signalez-le (voir [SECURITY.md](SECURITY.md)). C'est exactement le genre d'écart que
ce manifeste existe pour rendre visible.

*Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues - voir [CONTRIBUTING.md](CONTRIBUTING.md).*

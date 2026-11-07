> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · Español · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · [Português](../pt/BINARIES.md) · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# Binarios incluidos: procedencia y auditoría

La privacidad y la seguridad no son opcionales en VDBackup. Una herramienta de copia de
seguridad se ejecuta como root sobre tus datos más personales, así que debes poder ver
exactamente qué se incluye dentro. Esta página documenta cada binario y biblioteca
precompilados que lleva el módulo, de dónde proviene cada uno y cómo verificar que no se coló
nada opaco.

## Principios

- **Nada opaco.** Cada binario y biblioteca incluidos son rastreables hasta un upstream público
  y con nombre en una versión fijada, con una SHA-256 registrada. Ningún blob se incluye sin una
  entrada que puedas comprobar.
- **Obtenido del upstream, nunca de un dispositivo.** Las herramientas nativas provienen del
  repositorio de paquetes oficial de Termux (los archivos `.deb` firmados en
  `packages.termux.dev/apt`), nunca copiadas de un Termux instalado en algún teléfono. La
  compilación falla ruidosamente, nunca improvisa.
- **Reproducible.** Vuelve a ejecutar la compilación y obtienes los mismos archivos; vuelve a
  obtener las fuentes fijadas y los valores SHA-256 coinciden.
- **El rastro de auditoría se incluye con el módulo.** No está solo en el sitio web - viaja
  dentro del módulo instalado, en tu dispositivo, para que puedas auditar sin conexión.

## Qué se incluye, y de dónde

| Artefacto | Fuente | Cómo se compila |
|---|---|---|
| `bin/<abi>/` herramientas nativas (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + su closure `lib/` | Repo apt oficial de **Termux** (`packages.termux.dev/apt`), paquetes `.deb` oficiales | `.github/scripts/build_bin.sh` descarga los archivos `.deb` + sus dependencias transitivas, los extrae y copia los binarios más solo las bibliotecas compartidas que cada uno necesita |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (alternativa del convertidor ABX) | Release de GitHub de **rhythmcache/android-xml-converter** (`ABX_RELEASE`, ELF estático) | descargado desde la release fijada por `build_bin.sh` |
| `companion.apk` (compañero opcional de Google Drive) | **Este repositorio**, `companion/` (Gradle/Kotlin) | compilado desde el código fuente por la CI y firmado con la clave del proyecto (`VD_Key`); no es un blob precompilado |
| `vdbhelper.dex` (ayudante de framework) | **Este repositorio**, `dex/src/` (Java) | compilado desde el código fuente por la CI con `javac` + `d8` |

Solo las dos primeras filas son binarios de terceros precompilados; las dos últimas se compilan
desde código fuente que vive en este repositorio y puede leerse y recompilarse.

> **Ediciones Full vs lite.** Las ediciones lite omiten solo `rclone` y `restic` (los dos binarios más grandes) para mantenerse pequeñas y los descargan bajo demanda (verificados por SHA-256) la primera vez que usas un destino en la nube o el modo de instantáneas; `rsync` y `ssh`/`scp`/`sftp` siguen presentes, y cualquier otro binario listado arriba también está presente. Las ediciones Full traen `rclone` (proveedores de nube) y `restic` (instantáneas) integrados, así que nunca se descarga nada.

## El manifiesto en el dispositivo: `PROVENANCE.json`

`build_bin.sh` escribe un `bin/<abi>/PROVENANCE.json` por ABI. Al instalar, el módulo conserva
solo la ABI de tu dispositivo, de modo que ese archivo permanece en el dispositivo en
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`. Registra:

- `sources`: cada `.deb` de upstream (paquete, versión, URL completa, SHA-256 del `.deb`) y la
  release ABX (URL, SHA-256 del archivo).
- `files`: cada archivo realmente incluido bajo `bin/<abi>/` (ruta, tamaño, SHA-256).

Puedes leerlo en la WebUI (la pestaña **Acerca de** enlaza a él) o mediante la API de agente:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Cómo verificar (paso a paso)

1. **Comprueba los archivos incluidos.** Calcula el hash de cada archivo bajo `bin/<abi>/` en tu
   dispositivo y compáralo con `files[].sha256` en `PROVENANCE.json`:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Comprueba los archivos frente al upstream.** Para cada entrada `sources[]`, descarga el `.deb`
   fijado desde su URL, confirma que su SHA-256 coincide con `deb_sha256`, extráelo y confirma que
   los binarios/bibliotecas que contiene producen los mismos valores incluidos. Los archivos `.deb`
   del repo de Termux se sirven, a su vez, desde el repositorio apt firmado de Termux.
3. **Recompila desde cero.** Ejecuta tú mismo `.github/scripts/build_bin.sh` (solo necesita `curl`,
   `ar`, `tar`, `xz`, `zstd`, `readelf`) y compara la salida con lo que se incluyó.
4. **Compañero y dex.** Recompila `companion/` y `dex/` desde el código fuente; la firma del
   compañero es la clave del proyecto `VD_Key` (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Informar

Si algún archivo incluido no coincide con su fuente registrada, trátalo como un problema de
seguridad e infórmalo (consulta [SECURITY.md](SECURITY.md)). Esta es exactamente la clase de
discrepancia que este manifiesto existe para hacer visible.

*Esta documentación fue generada con Claude (Anthropic) y es mantenida por VD171. Correcciones y mejoras son bienvenidas - ve [CONTRIBUTING.md](CONTRIBUTING.md).*

<!--
  VD BACKUP - full app & data backup and restore as root, from a WebUI.
  Copyright (C) 2026  VD171 - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<p align="center">
  <img src="module/webroot/assets/logo-wordmark.png" alt="VDBackup" width="320">
</p>

<p align="center">
  <b>Copia de seguridad y restauración completas de apps y datos como root - gestionadas por completo desde una WebUI.</b><br>
  Módulo KernelSU / APatch / Magisk. Sin aviso de "conceder su", sin alternar <code>sucompat</code>.
</p>

<p align="center">
  <a href="https://github.com/VD171/VD-Backup/releases">Versiones</a> ·
  <a href="https://github.com/VD171/VD-Backup/wiki">Wiki</a> ·
  <a href="docs/USER-GUIDE.md">Guía de usuario</a> ·
  <a href="docs/AI-AGENTS.md">Agentes de IA</a> ·
  <a href="CONTRIBUTING.md">Cómo contribuir</a> ·
  <a href="https://xdaforums.com/t/VD-Backup.4807267/">Hilo en XDA</a>
</p>

> **Languages:** [English](README.md) · [العربية](README.ar.md) · [Čeština](README.cs.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [فارسی](README.fa.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.in.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Русский](README.ru.md) · [Svenska](README.sv.md) · [ไทย](README.th.md) · [Türkçe](README.tr.md) · [Tiếng Việt](README.vi.md) · [中文](README.zh.md)

---

## Qué es

VDBackup es un **módulo WebUI** root que hace copias de seguridad y restaura tus apps y sus
datos **sin una app complementaria para las funciones principales** - porque el módulo ya
es root, no hay nada que "permitir". Pretende cubrir todo lo que hacen las apps de copia de
seguridad populares, en un único lugar, con una WebUI limpia.

Está pensado como el **sucesor** abierto y root-nativo de **Swift Backup, Neo-Backup y
Android-DataBackup**: la unión de lo que hacen, bajo AGPLv3, e incluso puede
importar copias de seguridad existentes de Neo-Backup y Android-DataBackup para que puedas migrar.

## Funciones

- **Apps:** APK (base + splits), datos de la app (`/data/data`), datos protegidos por el dispositivo
  (`/data/user_de`), datos externos (`Android/data`), OBB, multimedia.
- **Datos de sistema/especiales:** permisos, AppOps y (opcional) SSAID, donde el root lo permite.
- **Modos de copia:** **Full** (`tar.zst` portátil), **Snapshot** (incremental +
  versionado, vía `restic`) y **Mirror** (sincronización 1:1, vía `rclone`/`rsync`).
- **Preservación fiel:** contextos SELinux, uid/gid, modes, xattr y capabilities.
- **Compresión:** ninguna / lz4 / zstd / gzip (gzip = "modo de compatibilidad", se abre en cualquier lugar).
- **Cifrado:** opcional y portátil (`age` + contraseña, o zip AES-256) - nunca
  atado al hardware del dispositivo, así que una copia se restaura en otro dispositivo o se abre en un PC.
- **Destinos:** local, SFTP, SCP, SMB, WebDAV, FTP, S3 y más de 70 (`rclone`),
  además de repositorios `rsync` y `restic`. Google Drive opcional mediante un pequeño complemento opt-in.
- **Integridad:** cada archivo se verifica contra el manifiesto; dry-run y
  restore-test te dejan comprobar una copia sin tocar nada.
- **Restauración selectiva:** restaura cualquier subconjunto de los elementos de una copia; elimina copias y
  mantén un registro de actividad/auditoría de cada acción destructiva.
- **Copias especiales:** mensajes (SMS/MMS), contactos y registro de llamadas, Wi-Fi y Bluetooth,
  con una exportación JSON portátil opcional que puedes abrir en un PC.
- **Programación + automatización:** trabajos recurrentes con poda keep-N, además de copia
  automática opt-in al instalar/actualizar y una lista de apps excluidas.
- **Origen de instalación:** las apps restauradas indican Play Store como su origen de instalación de
  forma predeterminada (conmutable); una opción avanzada opt-in también falsifica el paquete iniciador y el origen.
- **Montaje como app de sistema:** monta una app instalada como app de sistema sin tocar la
  partición `/system` real (submódulo de superposición sin montaje, compatible con NoMount).
- **En segundo plano:** backup/restore se ejecutan desacoplados y sobreviven al cierre de la WebUI, con
  notificaciones de inicio/fin.
- **Migrar hacia aquí:** importa copias de seguridad existentes de Neo-Backup y Android-DataBackup,
  incluidas las protegidas con contraseña.

## Instalación

1. Descarga el `VD-Backup-vX.Y.zip` más reciente desde [Versiones](https://github.com/VD171/VD-Backup/releases).
2. Instálalo en el gestor KernelSU / APatch / Magisk - utilizable al instante, sin necesidad de reiniciar.
3. Abre la **WebUI** del módulo para configurar y ejecutar las copias. Eso es todo.

**Ediciones.** Cada release viene como seis zips. `universal-full` - todas las arquitecturas y todos los binarios (incl. `rclone` para proveedores de nube y `restic` para instantáneas), cualquier dispositivo, el más grande. `universal-lite` - todas las arquitecturas sin los dos binarios más grandes (`rclone`, `restic`), el más pequeño, y sigue haciendo copias locales, SSH/SFTP y `rsync`. `<abi>-full` (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`) - una sola arquitectura con todos los binarios, más pequeño que `universal-full`. ¿Conoces tu arquitectura? -> elige `<abi>-full`; ¿quieres el más pequeño o sin los gigantes de la nube? -> `universal-lite`; todo en cualquier dispositivo -> `universal-full`. Ve [Versiones](https://github.com/VD171/VD-Backup/releases).

¿Recién llegas? La [Guía de usuario](docs/USER-GUIDE.md) te lleva desde la instalación hasta la restauración.

## Portabilidad

Tus copias de seguridad **no quedan atrapadas en este módulo**. Todo usa formatos estándar
(`tar`, `gzip`, `zstd`, `age`, `zip`, `restic`) que se abren en Windows, macOS y
Linux con herramientas comunes o gestores de archivos. Cada copia cifrada incluye una
nota **RECOVERY** con los comandos exactos para descifrar y extraer en un PC.

## Build

El módulo es shell + WebUI más binarios estáticos por ABI (`tar`, `zstd`, `lz4`,
`rclone`, `rsync`, ssh, `restic`) compilados para `armeabi-v7a`, `arm64-v8a`, `x86`,
`x86_64`. Mira [CONTRIBUTING.md](CONTRIBUTING.md) y los workflows de CI.

## Documentación

- **[Wiki](https://github.com/VD171/VD-Backup/wiki)** - la documentación, navegable en línea.
- **[Guía de usuario](docs/USER-GUIDE.md)** - de principio a fin, desde la instalación hasta la restauración.
- **[Agentes de IA](docs/AI-AGENTS.md)** - gestiona cada acción sin interfaz mediante la API JSON.
- **[Arquitectura](ARCHITECTURE.md)** y **[Estructura de archivos](docs/FILE-STRUCTURE.md)** - cómo funciona.
- **[Binarios incluidos](docs/BINARIES.md)** - procedencia y SHA-256 de cada binario precompilado, para una auditoría completa.
- **[Recuperación](module/RECOVERY.md)** - abre y descifra una copia de seguridad en un PC, sin el módulo.
- **[Cómo contribuir](CONTRIBUTING.md)** y **[Seguridad](SECURITY.md)**.
- **[Registro de cambios](CHANGELOG.md)** y **[Código de Conducta](CODE_OF_CONDUCT.md)**.

## Amigable con la IA

VDBackup está hecho para ser acogedor con asistentes y agentes de IA, no solo con personas.
El engine habla JSON (cada verbo de `helper.sh` devuelve un único objeto JSON), el
código, la documentación y la estructura de archivos están dispuestos para la lectura por máquina, y
las contribuciones asistidas por IA se revisan y aceptan como cualquier otra. Un agente puede administrar
**cada** acción del módulo sin interfaz a través de la misma API que usa la WebUI -
mira **[docs/AI-AGENTS.md](docs/AI-AGENTS.md)** para la superficie de control completa, y
[CONTRIBUTING.md](CONTRIBUTING.md#ai-contributors-welcome) para contribuir.

## Contactos

* https://vd171.ru
* https://vd.priv8.ru
* **Telegram:** @VD_Priv8 https://t.me/VD_Priv8
* **Channel:** @Priv8_VD https://t.me/Priv8_VD
* **Discord:** @VD.Priv8 https://discord.com/users/1296831918989639721
* **E-mail:** vd.priv8@pm.me
* **XDA-Developers:** @VD171 https://xdaforums.com/m/vd171.4699873/
* **GitHub:** @VD171 https://github.com/VD171

## Véase también

Proyectos hermanos del mismo autor:

- **[VDInfos](https://github.com/VD171/VD-Infos)** - un depurador de métodos del dispositivo: lee cada elemento por todos los métodos que pueden leerlo y los compara lado a lado.
- **[VDGoogle](https://github.com/VD171/VD-Google)** - tus servicios de Google (RCS, Wallet, atestaciones de Play Integrity), leídos en tu dispositivo sin internet.
- **[COPG-VD](https://github.com/VD171/COPG-VD)** - un spoofer de dispositivo que convierte un fingerprint nuevo en un perfil coherente y consistente.

## Licencia

[GNU AGPL-3.0-or-later](LICENSE). Copyleft de red: si ejecutas una versión modificada,
incluso como servicio, debes ofrecer su código fuente.

---

`android` `backup` `restore` `app-data` `migration` `neo-backup` `databackup` `kernelsu` `apatch` `magisk` `webui` `root` `tar` `zstd` `restic` `rclone` `age` `encryption` `ssaid` `appops` `on-device` `agpl` `ai-friendly` `vdbackup`

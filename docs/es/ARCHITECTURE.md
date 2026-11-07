> **Languages:** [English](../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · Español · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Português](../pt/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Arquitectura

VDBackup es un módulo WebUI root. Tiene tres capas: la **WebUI** (lo que ves),
el **backend shell** (lo que hace el trabajo, como root) y los **binarios embebidos**
(los archivadores y transportes). Todo corre ya-root, así que no hay
prompt de permiso ni app complementaria para las funciones centrales.

```
   ┌──────────────────────────────────────────────────────────┐
   │  WebUI  (module/webroot, vanilla JS)                      │
   │    index.html · scripts.js · i18n.js · styles.css         │
   │    lang/en.js + 21 languages · config.json (CSP, no net)  │
   └───────────────┬──────────────────────────────────────────┘
                   │  ksu.exec("sh scripts/helper.sh <verb> <b64json>")
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  scripts/helper.sh  (dispatcher, returns JSON)            │
   │    list-apps · config · dests · backup/restore/import ... │
   │    long ops -> setsid nohup scripts/worker.sh  (detached) │
   └───────────────┬───────────────────────────────┬──────────┘
                   │                               │ progress-<opid>.json (poll)
                   ▼                               ▼
   ┌────────────────────────────────────┐   ┌──────────────────────────┐
   │  scripts/worker.sh (root, detached)│   │  framework helper (opt.) │
   │   force-stop · tar|zstd|age        │   │  app_process + dex       │
   │   pm install · chown/chcon         │   │  perms/appops/ssaid/...  │
   │   transfer · notify                │   │  (dex primary, shell fb) │
   └───────────────┬────────────────────┘   └──────────────────────────┘
                   ▼
   ┌──────────────────────────────────────────────────────────┐
   │  bin/<abi>/  tar · zstd · lz4 · rclone · rsync · ssh · restic │
   └──────────────────────────────────────────────────────────┘
                   ▼
   Destinations: local · SFTP/SCP · SMB · WebDAV · FTP · S3 · 70+ (rclone)
                 rsync · restic repos · Google Drive (opt-in companion)
```

## Puntos clave

- **Ya root.** El proceso del módulo es root, así que el motor es shell puro. ~85% del
  trabajo es shell puro (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Ejecución desacoplada.** Backup/restauración corren vía `setsid nohup`, como proceso root
  independiente. Cerrar la WebUI no los interrumpe; la UI se reconecta leyendo
  `logs/progress-<opid>.json`.
- **Helper de framework (~15%).** Permisos granulares, AppOps, SSAID, StorageStats,
  iconos y Wi-Fi privilegiado necesitan el framework de Android. Una pequeña ejecución `dex` vía
  `app_process` (sin app instalada) se ocupa de esto, con fallback en shell.
- **Portabilidad.** Solo formatos estándar; los backups se abren en un PC sin este módulo.
- **El estado** vive en `/data/adb/vdbackup/` (config, jobs, destinos, credenciales
  cifradas, logs, staging). **Los backups** se escriben en almacenamiento visible al usuario y con
  credenciales cifradas en `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, por usuario),
  no en `/data/adb` (que está cifrado por el dispositivo y es legible antes del primer desbloqueo).

## Garantía de compatibilidad

Un backup debe seguir siendo restaurable para siempre. Esto es una regla dura, no un esfuerzo de mejor caso.

**Alcance.** La garantía cubre los backups escritos por **v1.01 en adelante** (la primera versión
publicada oficialmente) y solo por versiones publicadas oficialmente y liberadas. v1.00 fue una
compilación solo de prueba y está explícitamente fuera de alcance; las compilaciones prelanzamiento y de
desarrollo no están cubiertas. Desde la primera versión pública en adelante, la promesa de abajo es absoluta:

- **Solo formatos estándar.** Cada archive es un `tar` simple comprimido con `zstd`,
  `gzip` o `lz4`, opcionalmente envuelto con `age`. No hay contenedor propietario, así que
  un backup puede abrirse en cualquier PC con herramientas comunes incluso sin este módulo (ver
  `etc/RECOVERY.md`). Un formato que no podemos abandonar.
- **Metadatos append-only.** `manifest.json` lleva `format_version`. El esquema solo
  crece: los campos pueden *añadirse*, nunca eliminarse, renombrarse ni reutilizarse. La restauración lee
  cada campo de forma defensiva (los campos opcionales ausentes caen en un valor por defecto) e instala
  APKs y extrae archives por su nombre y extensión de archivo, sin asumir una forma fija de
  manifest.
- **Restauración compatible hacia adelante.** La restauración nunca rechaza un backup por ser antiguo, y un
  VDBackup más antiguo silenciosamente omite tipos de ítem que no conoce en vez de fallar. Un VDBackup más nuevo
  por tanto restaura cualquier backup más antiguo, y los archives en formato estándar siguen siendo
  restaurables a mano de todos modos.

En resumen: cualquier cosa que VDBackup haya escrito, todo VDBackup futuro (y un PC común)
todavía puede restaurar. Cambiar el formato de un modo que rompa un backup anterior no está
permitido; las nuevas capacidades se añaden detrás de `format_version` y de campos nuevos y aditivos.

Para el diseño técnico completo (formato de archive, esquema de metadatos, pipelines, cripto,
destinos, importadores) los mantenedores guardan notas de diseño detalladas; este archivo es la
visión general orientada a colaboradores.

*Esta documentación fue generada con Claude (Anthropic) y es mantenida por VD171. Correcciones y mejoras son bienvenidas - ve [CONTRIBUTING.md](CONTRIBUTING.md).*

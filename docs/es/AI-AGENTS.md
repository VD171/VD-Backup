> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · Español · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Controlar VDBackup desde un agente de IA

VDBackup está construido para que un asistente o agente de IA pueda administrar **toda**
acción y contenido del módulo de forma headless, igual que una persona lo hace por la WebUI. La
WebUI es solo un cliente de una pequeña API JSON; tu agente es otro. Usa la API,
no raspes la WebUI.

## El contrato

Todo pasa por un único punto de entrada, ejecutado como root en el dispositivo:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Los argumentos son un único objeto JSON, **codificado en base64**, pasado como un único token argv.
- El comando imprime **un objeto JSON** en stdout: `{"ok":true,...}` o
  `{"ok":false,"code":"ERR_...","message":"..."}`. Parsea eso; nunca raspes texto.
- Las operaciones largas (`backup`, `restore`, `import`) devuelven `{"ok":true,"opid":"..."}`
  inmediatamente y corren **desacopladas** (sobreviven a que el llamador/WebUI desaparezca). Haz poll
  de su progreso; no están terminadas cuando la llamada retorna.
- `progress` y `cancel` reciben **el base64 de la cadena opid cruda**, no un objeto JSON.

Un pequeño helper para tu shell:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Para controlarlo desde una estación de trabajo, ejecuta eso por tu canal root habitual hacia el dispositivo
(adb shell como root, o un setup de SSH-a-root). El módulo trae binarios empaquetados, así que
una vez instalado no necesita **nada de internet** para backup/restauración local; solo los destinos
de nube (`rclone`/`restic`/ssh) hablan con la red.

## Verbos

| Verbo | Args (JSON) | Devuelve |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | el objeto de config (o `{key,value}`) | `{ok}` |
| `keygen` | `{}` | genera el par de claves `age` para cifrado |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, fallback shell) |
| `label` | `{package,user?}` | `{ok,label}` (nombre real localizado de la app, sin contexto) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (PNG base64; cacheado por package+`vc`) |
| `backup` | ver abajo | `{ok,opid}` (desacoplada) |
| `restore` | ver abajo | `{ok,opid}` (desacoplada) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (desacoplada) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | el `progress-<opid>.json` en vivo |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (reacoplar tras reconectar) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | lista de apps / iconos base64 por lote |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `backup-info` | `{ref}` | `{ok,...}` todos los detalles de un backup (versión, origen de instalación, estado, fecha, modo, tamaño, items, conteos de permisos, dispositivo) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 desde el manifest (funciona cuando la app está desinstalada) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref debe estar bajo el directorio de backups) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` mantiene los N más recientes de un paquete |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` registro de auditoría, del más reciente primero |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` copia a nivel de todo el sistema (desacoplada) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (requiere reboot; `confirm` la protege) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | monta una app instalada como app de sistema (submódulo sin montaje; en vivo vía NoMount, si no al próximo arranque) |
| `companion-status` / `companion-install` | `{}` | estado / instalación bajo demanda del compañero de Google Drive |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | gestión de destinos |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | gestión de remotos rclone (crea la entrada `rclone.conf` a la que apunta un dest `type:"rclone"`) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | trabajos agendados |
| `scheduler-tick` | `{}` | corre trabajos vencidos + aplica retención + el observador de copia automática (el heartbeat de arranque llama a esto) |

### Args de `backup`

```json
{
  "package": "com.example.app",
  "user": 0,
  "mode": "full",                 // full | snapshot | mirror
  "compression": "zstd:10",       // none | lz4 | zstd[:N] | gzip
  "items": ["apk","data","data_de","obb","external","media"],
  "encrypt_data": false,
  "encrypt_apk": false,
  "dest": "local",                // local | <destination id>
  "verify": true,                 // re-hash each archive vs the manifest (default on for Full)
  "dry_run": false,               // true = report a size plan, write nothing
  "ssaid": false                  // OPT-IN, see below
}
```

`restore`/`import` reciben `{ref}` (un dir de backup / ref de scan). `restore` también acepta:
`"items"` (un subconjunto de los tipos de ítem del backup a restaurar; omítelo para todos), `"test": true`
(extrae a un dir temporal y verifica, sin tocar la app viva), `"mode"` para snapshot/mirror, `"password"`
para un backup cifrado, `"ssaid"` (opt-in) y las opciones de origen de instalación `"spoof_installer"`
(por defecto desde la config, fija el instalador como Play Store en el momento de la instalación) y
`"deep_spoof": true` (opt-in avanzado; además falsifica el paquete iniciador y el origen del paquete
editando la base de datos de paquetes, se aplica tras un reboot). `import` recibe
`"from": "neo" | "databackup"` y, para un backup Neo cifrado, `"password"`.

### Args de `remote-add`

Un destino de nube es un dest `type:"rclone"` que nombra un remoto `rclone`; crea
ese remoto primero con `remote-add`. Los campos de contraseña se guardan ofuscados, nunca en
claro. Valores `backend` soportados y sus `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive tiene dos caminos: este remoto `drive` (sin necesidad de un proyecto Google Cloud, usa
el OAuth propio de rclone - corre `rclone authorize "drive"` una vez en cualquier computadora y pasa el
token) o la app compañera opt-in (tu propio client id OAuth). Ambos terminan como destinos
comunes.

### Política de red

El campo de config `network_policy` controla qué conexión pueden usar las transferencias de nube:
`any` (por defecto), `wifi`, o `mobile`. Defínelo con `config-set`. Cuando es `wifi` o
`mobile`, cada transferencia de nube (upload Full `rclone`/Drive, sync Mirror, backup/restauración
de snapshot `restic` remoto, restauración Mirror) revisa el transporte activo primero y
aborta con `ERR_NET_POLICY` si no coincide - tanto para trabajos manuales como agendados.
Los destinos locales nunca se gatean.

## Barandillas de seguridad que tu agente debe respetar

- **`ssaid` es estrictamente opt-in (por defecto apagado).** Hace backup / restaura el
  ANDROID_ID del dispositivo reescribiendo un archivo de sistema; una restauración se aplica solo tras un reboot, y
  el archivo anterior siempre se guarda primero para rollback. Solo envía `"ssaid": true`
  a petición directa y deliberada del usuario - nunca por defecto.
- **Las acciones mutables (restore, delete, import) son destructivas** y se registran en una
  traza de auditoría local (`logs/audit.jsonl`). La restauración es fiel (borra-luego-extrae), así que
  revierte la app al estado exacto del backup. Confirma la intención antes de llamarlas.
- **Nunca debilites** la preservación (SELinux/uid/gid/modos/xattr) ni la regla del APK (los APK
  siempre se comprimen, nunca se cifran salvo que `encrypt_apk` esté activado).
- Trata la salida JSON como la fuente de la verdad; revisa `ok`/`code`, haz poll de `progress`,
  y expón los códigos `ERR_*` en vez de adivinar.

Ve [ARCHITECTURE.md](ARCHITECTURE.md) y
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) para los detalles internos.

---

*Esta documentación fue generada con Claude (Anthropic) y es mantenida por VD171. Correcciones y mejoras son bienvenidas - ve [CONTRIBUTING.md](CONTRIBUTING.md).*

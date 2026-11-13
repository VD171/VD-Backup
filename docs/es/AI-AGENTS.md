> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · Español · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Українська](../uk/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

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
- Las operaciones largas (`backup`, `restore`, `import`, `backup-batch`, `restore-batch`, `config-export`, `config-import`) devuelven `{"ok":true,"opid":"..."}`
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
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` conteos (tamaños en bytes): apps con backups, total de instancias de backup, backups de ruta independientes, trabajos programados, tamaño total de los backups, y el libre/total del sistema de archivos de los backups. No desacoplada, retorna de inmediato; usada por el resumen inicial de la WebUI. |
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
| `list-users` | `{}` | `{ok,users:[{id,name}]}` usuarios de Android del dispositivo (multiusuario). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` subdirectorios de una ruta (selector de carpeta). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` copias de carpeta/archivo independientes. |
| `provenance` | `{}` | manifiesto de auditoría de los binarios incluidos (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` todos los detalles de un backup (versión, origen de instalación, estado, fecha, modo, tamaño, items, conteos de permisos, dispositivo) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 desde el manifest (funciona cuando la app está desinstalada) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref debe estar bajo el directorio de backups) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` mantiene los N más recientes de un paquete |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` registro de auditoría, del más reciente primero |
| `log-export` | `{user?}` | `{ok:true,path}` (ruta absoluta de un `.txt` escrito bajo el directorio de backups) o `{ok:false,code:"ERR_LOG_EXPORT"}`. Escribe el registro de actividad (`audit.jsonl`) más una breve cabecera de compilación/dispositivo en un único archivo de texto visible para el usuario para que pueda adjuntarse a un informe de error. No desacoplada, retorna de inmediato. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` copia a nivel de todo el sistema (desacoplada) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (requiere reboot; `confirm` la protege) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` respalda cualquier ruta absoluta como `tar.zst`+`manifest.json` bajo `.paths/` (desacoplada) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` restaura un backup de ruta a su ubicación original (`confirm` la protege; desacoplada) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | monta una app instalada como app de sistema (submódulo sin montaje; en vivo vía NoMount, si no al próximo arranque) |
| `companion-status` / `companion-install` | `{}` | estado / instalación bajo demanda del compañero de Google Drive |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | gestión de destinos |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | gestión de remotos rclone (crea la entrada `rclone.conf` a la que apunta un dest `type:"rclone"`); `backend` puede ser cualquier backend de rclone, sin lista blanca |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (el motor ya abrió el navegador del teléfono en esa URL de consentimiento mediante un intent VIEW de Android) o `{ok:false,code:"ERR_AUTHORIZE"}`. Ejecuta `rclone authorize <backend>` en un servidor de callback local (`127.0.0.1:53682`) para OAuth en el dispositivo. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` mientras espera, `{ok:true,done:true,token}` una vez que el usuario consintió (el `token` que se pasa a `remote-add`), o `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; detiene una autorización pendiente. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (si los binarios `rclone`/`restic` están presentes, si esta edición `lite` puede obtenerlos, tamaño de la descarga en bytes) |
| `cloud-fetch` | `{}` | `{ok,opid}` (desacoplada) descarga+verifica+instala el addon `rclone`/`restic` en una edición `lite` |
| `schedule-set` / `schedule-list` / `schedule-delete` | ver abajo | trabajos agendados (un backup o una restauración; apuntan a una app, un conjunto o todas las apps) |
| `scheduler-tick` | `{}` | corre trabajos vencidos + aplica retención + el observador de copia automática (el heartbeat de arranque llama a esto) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (no destacada; retorna de inmediato; `ERR_UPDATE_CHECK` en caso de fallo, ver abajo) |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) respalda varias aplicaciones en una op independiente; el progreso lleva `n`/`of`. Un fallo por app no detiene el lote. |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) restaura varias copias en una op independiente; el progreso lleva `n`/`of`. Un fallo por app no detiene el lote. |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` volúmenes de almacenamiento para el selector de carpetas: interno más SD/USB extraíble. |
| `config-export` | `{password}` | `{ok,opid}` (detached) exporta config, trabajos, destinos, credenciales y claves a un único archivo cifrado con frase de contraseña, bajo la carpeta de copias. |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) combina un archivo de config exportado de vuelta en este dispositivo (nunca sobrescribe a ciegas). |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` enumera los archivos de config cifrados disponibles para importar. |
| `wipe-credentials` | `{}` | `{ok,wiped}` elimina las contraseñas remotas guardadas y la clave de cifrado del dispositivo; destinos, trabajos y copias permanecen. |
| `log-prune` | `{}` | `{ok}` poda registros de ops hace tiempo terminadas, limita el registro de auditoría y elimina iconos obsoletos (lo llama el servicio de arranque). |

### Campos de `progress`

Hacer poll de `progress` devuelve el `progress-<opid>.json` en vivo de la operación. Estos campos
están **siempre presentes**:

| Campo | Tipo | Significado |
|-------|------|-------------|
| `opid` | string | el id de la operación |
| `percent` | int | 0-100 de avance |
| `phase` | string | el label de la fase actual |
| `item` | string | el tipo de ítem que se está procesando ahora |
| `done` | bool | true en una escritura terminal (finish / dry-run / restore-test) |

Una operación en curso también puede llevar estos campos en vivo **opcionales**. Están ausentes o
vacíos cuando son desconocidos, y se **omiten en las escrituras terminales** (finish / dry-run /
restore-test):

| Campo | Tipo | Significado |
|-------|------|-------------|
| `rate` | string | velocidad de transferencia, p. ej. `"4.2 MiB/s"` (vacío = desconocido) |
| `eta` | string | tiempo restante estimado, p. ej. `"1m12s"` (vacío = desconocido) |
| `n` | int | índice del ítem actual (0 = desconocido) |
| `of` | int | total de ítems (0 = desconocido) |
| `cur` | string | nombre del ítem actual (vacío = ninguno) |

Las transferencias de nube llenan `rate`/`eta` (el percent viene de rclone); los backups Full
locales llenan `n`/`of`/`cur`. Los labels de fase incluyen la fase de sello de checksum
**`verified`** y, para transferencias de nube, **`transfer`** y **`mirror <item>`**.

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
  "ssaid": false,                 // OPT-IN, see below
  "manual": false                 // true = single interactive backup, keeps these exact items;
                                  // omit/false lets config.app_items (a per-app item map) override
                                  // the set on bulk, auto and scheduled runs
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

### Args de `schedule-set`

Un trabajo agendado elige **un** objetivo y una **acción**:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (por defecto) | "restore"
  "package": "com.example.app",   // una app   - O -
  "packages": ["com.a","com.b"],  // un conjunto de apps   - O -
  "all": true,                    // todas las apps, menos la lista de apps excluidas
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // gate: solo corre en Wi-Fi
  "require_charging": false,      // gate: solo corre mientras carga
  "min_battery": 0,               // gate: solo corre con batería >= este % (0-100)
  "days": [1,2,3,4,5]             // gate: solo corre en estos días de la semana (0=domingo)
}
```

Pasa exactamente **uno** de `package`, `packages` o `all` como objetivo. Un trabajo `backup`
conserva los habituales `mode`/`dest`/`keep`/`items`. Un trabajo `restore` (`action: "restore"`)
restaura el backup **más reciente** de cada app objetivo (o una `ref` explícita) y **sobrescribe
los datos actuales de la app en cada ejecución**: es deliberado y opcional, así que configúralo
solo a petición directa del usuario.

### Gating del programador

Un trabajo agendado puede llevar **condiciones de gate opcionales**. Cuando el gate de un trabajo
vencido no se cumple, se **omite y se reintenta en el siguiente tick, sin avanzar su
programación** (su `last_run` no se sella, así que dispara en cuanto la condición se cumple):

| Campo | Tipo | Gate |
|-------|------|------|
| `require_wifi` | bool | solo corre mientras hay Wi-Fi |
| `require_charging` | bool | solo corre mientras carga |
| `min_battery` | int (0-100) | solo corre con la batería en este nivel o por encima |
| `days` | array de int (0-6, 0=domingo) | solo corre en estos días de la semana |

Una comprobación mínima de **seguridad térmica** se aplica siempre además de estas: una op
agendada se omite mientras el dispositivo está críticamente caliente. Cada omisión de gate se
escribe en la traza de auditoría como `op:"scheduler-gated"` con un `reason` de `wifi` /
`charging` / `battery` / `days` / `thermal`.

### Args de `remote-add`

Un destino de nube es un dest `type:"rclone"` que nombra un remoto `rclone`; crea
ese remoto primero con `remote-add`. El `backend` puede ser **cualquier backend de rclone** -
no hay lista blanca. `remote-add` acepta cualquier nombre de backend (`dropbox`, `onedrive`,
`box`, `pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` y los ~70 otros
que soporta rclone), y los `params` se pasan directamente a la config de `rclone` como pares
`key=value`. Los campos de contraseña se guardan ofuscados, nunca en claro. Backends comunes
y sus `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**OAuth en el dispositivo (sin PC).** Los backends que necesitan iniciar sesión por navegador
(Google Drive, Dropbox, OneDrive, Box, pCloud) no requieren un escritorio ni un token pegado a
mano. Llama a `remote-authorize` con `{backend}`: el motor ejecuta `rclone authorize <backend>`
contra un servidor de callback local (`127.0.0.1:53682`) y abre el propio navegador del teléfono
en la página de consentimiento del proveedor mediante un intent VIEW de Android, devolviendo
`{ok:true,url}` (o `{ok:false,code:"ERR_AUTHORIZE"}`). Sondea `remote-authorize-poll` (`{}`):
devuelve `{ok:true,done:false,url}` mientras espera y `{ok:true,done:true,token}` una vez que el
usuario aprueba, pasa ese `token` a `remote-add`. `remote-authorize-cancel` (`{}`) detiene una
autorización pendiente (`{ok:true,cancelled:true}`). Pegar a mano la salida de
`rclone authorize "<backend>"` desde cualquier computadora sigue siendo compatible como alternativa.

Google Drive tiene dos caminos: este remoto `drive` (sin necesidad de un proyecto Google Cloud, usa
el OAuth propio de rclone, autoriza en el dispositivo con `remote-authorize`, o corre
`rclone authorize "drive"` una vez en cualquier computadora y pasa el token) o la app compañera
opt-in (tu propio client id OAuth). Ambos terminan como destinos comunes.

### Política de red

El campo de config `network_policy` controla qué conexión pueden usar las transferencias de nube:
`any` (por defecto), `wifi`, o `mobile`. Defínelo con `config-set`. Cuando es `wifi` o
`mobile`, cada transferencia de nube (upload Full `rclone`/Drive, sync Mirror, backup/restauración
de snapshot `restic` remoto, restauración Mirror) revisa el transporte activo primero y
aborta con `ERR_NET_POLICY` si no coincide, tanto para trabajos manuales como agendados.
Los destinos locales nunca se gatean.

### Integridad y cuota de nube

- **Sello de checksum (nube).** Tras una copia a nube exitosa, el engine corre una comprobación de
  checksum remota (`rclone check`); una discrepancia falla la op con `ERR_VERIFY`. Los backends
  que no comparten ningún hash común con el lado local se omiten (no es un fallo).
- **Comprobación de cuota (nube, modo Full).** Antes de un upload en modo Full a un remoto
  `rclone`, el engine consulta el espacio libre del remoto (`rclone about --json`) y se niega con
  `ERR_QUOTA` si el backup no cabe. Los remotos que no reportan información de cuota se omiten. El
  modo Mirror es un delta sync y está exento.

### Binarios de nube (edición `lite`)

Una edición `full` trae todos los binarios empaquetados y nunca necesita red. La edición `lite`
omite los dos más grandes, `rclone` y `restic`, y los obtiene bajo demanda la primera vez que
corres una acción de nube o snapshot. `cloud-status` informa si ya están presentes, si esta
edición puede obtenerlos, y el tamaño de la descarga en bytes. `cloud-fetch` corre **desacoplada**
(haz poll de `progress` con su `opid`): descarga el addon `rclone`+`restic` por arquitectura, lo
verifica contra el SHA-256 incrustado en el módulo, y lo instala en el caché de runtime. Sus
fases de progreso son `downloading`, `verifying` e `installing`; el código final es `ERR_NONE` en
caso de éxito, o `ERR_FETCH` (descarga fallida) / `ERR_FETCH_VERIFY` (checksum no coincide,
descartado) en caso de fallo. En una edición `full` es innecesaria. Un `backup`/`restore` a un
destino de nube o snapshot en una edición `lite`, antes de que los binarios estén presentes,
falla con `ERR_CLOUD_FETCHABLE`; el cliente debe ofrecer correr `cloud-fetch`, y luego reintentar.

### Categorías de copias especiales

`special-categories` reporta qué categorías a nivel de todo el sistema tiene un dispositivo;
`special-backup` captura las que pasas en `categories` y `special-restore` las re-aplica. Las
categorías son:

| Categoría | Qué es | Semántica de restauración |
|----------|-----------|-------------------|
| `messages` | SMS/MMS | reemplazo del proveedor (borra + extrae) |
| `contacts` | contactos y registro de llamadas | reemplazo del proveedor (borra + extrae) |
| `wifi` | redes Wi-Fi guardadas | reemplazo del proveedor (borra + extrae) |
| `bluetooth` | emparejamientos Bluetooth | reemplazo del proveedor (borra + extrae) |
| `calendar` | el proveedor de calendario (`com.android.providers.calendar`, app + datos); también exportado de forma portable a `calendar.json` | reemplazo del proveedor (borra + extrae) |
| `wallpaper` | fondo de pantalla de inicio y de bloqueo más `wallpaper_info.xml`, guardado en crudo (binario) | archivos reemplazados |
| `dns` | el modo y el especificador de DNS privado, leídos de settings | `settings put` idempotente |
| `system_settings` | el volcado completo de los ajustes system/global/secure | **opt-in**, `settings put` idempotente, sobrescribe los ajustes del dispositivo |

**`system_settings` es estrictamente opt-in y destructivo en la restauración.** Como `ssaid`,
sobrescribe los ajustes de todo el dispositivo cuando se restaura, así que está protegido tras un
consentimiento explícito del usuario y se escribe en la traza de auditoría. Nunca lo selecciones por
defecto; solo a petición directa y deliberada del usuario.

### Backup de ruta independiente

`path-backup` / `path-restore` respaldan y restauran **cualquier ruta absoluta**: una carpeta o un
solo archivo, en el almacenamiento compartido o bajo `/data`, fuera del modelo por-app. El archive
se escribe como `tar.zst` más un `manifest.json` en el propio formato de VDBackup (sellado con SHA-256,
con un kit RECOVERY cuando está cifrado) bajo `.paths/` en el directorio de backups.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- La ruta de origen debe ser **absoluta** y estar bajo uno de los roots permitidos:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. Una ruta que no existe falla
  con `ERR_NO_PATH`; una ruta fuera de los roots permitidos, o una que contiene `..`, falla con
  `ERR_BAD_PATH`.
- `path-restore` escribe de vuelta en la ubicación original, así que es destructivo y requiere
  `"confirm": true`, una barrera de alta fricción, como `special-restore`. Un `ref` que no es un
  backup de ruta válido falla con `ERR_BAD_REF`.
- Ambos corren **desacoplados**; haz poll de `progress` con el `opid` devuelto.

### `update-check`

`update-check` informa si se ha publicado una versión más nueva del módulo, para que un agente
(o la WebUI) pueda mostrarla. Es un **verbo de lectura que retorna de inmediato**: **no** es
destacado, así que no hay `opid` que sondear. Disparado solo por una acción explícita del
usuario, busca el manifiesto de actualización publicado del módulo (la URL `updateJson` del
`module.prop`) con el `curl` empaquetado mediante una petición HTTP del lado root, esto corre
fuera del WebView, así que no está sujeto a la CSP de la WebUI, y compara el `versionCode`
publicado con el instalado. No recibe **ningún argumento**.

En caso de éxito retorna:

| Campo | Tipo | Significado |
|-------|------|-------------|
| `ok` | bool | `true` |
| `current_version` | string | el versionName instalado |
| `current_code` | int | el versionCode instalado |
| `latest_version` | string | el versionName publicado |
| `latest_code` | int | el versionCode publicado |
| `update_available` | bool | `true` cuando `latest_code` es mayor que `current_code` |
| `zipUrl` | string | la URL del zip publicado |
| `changelog` | string | la URL del changelog publicado |
| `notes` | string | las notas de la versión |

Si no hay URL `updateJson`, si la petición de red falla, o si el manifiesto no se puede parsear,
retorna `{"ok":false,"code":"ERR_UPDATE_CHECK"}`.

`update-check` solo **informa** la disponibilidad y las notas de la versión; la actualización en
sí la realiza tu gestor root (KernelSU / APatch / Magisk) a través del `updateJson` del módulo,
nunca este verbo.

## Barandillas de seguridad que tu agente debe respetar

- **`ssaid` es estrictamente opt-in (por defecto apagado).** Hace backup / restaura el
  ANDROID_ID del dispositivo reescribiendo un archivo de sistema; una restauración se aplica solo tras un reboot, y
  el archivo anterior siempre se guarda primero para rollback. Solo envía `"ssaid": true`
  a petición directa y deliberada del usuario, nunca por defecto.
- **Las acciones mutables (restore, delete, import) son destructivas** y se registran en una
  traza de auditoría local (`logs/audit.jsonl`). La restauración es fiel (borra-luego-extrae), así que
  revierte la app al estado exacto del backup. Confirma la intención antes de llamarlas.
- **`system_settings` es opt-in y destructivo, exactamente como `ssaid`.** Restaurarlo
  sobrescribe los ajustes de todo el dispositivo, así que envíalo solo a petición directa del usuario;
  está protegido por consentimiento explícito y queda registrado en la traza de auditoría.
- **La restauración es idempotente.** Las restauraciones crudas de proveedor (messages/contacts/wifi/
  bluetooth/calendar) **reemplazan** en vez de fusionar, los datos del proveedor se borran y el archive
  se extrae sobre ellos, así que re-restaurar el mismo backup no puede duplicar filas. `dns` y
  `system_settings` se re-aplican con `settings put` idempotente.
- **La extracción de archives está protegida contra path traversal.** La restauración corre como root,
  así que cada archive (restore, import, special-restore, path-restore) se comprueba antes de cualquier
  escritura: uno cuyos miembros usen rutas absolutas o contengan `..` se rechaza de entrada con
  `ERR_UNSAFE_ARCHIVE`, antes de que ocurra una sola escritura destructiva (GNU tar también corre con
  `--no-absolute-names`). Un archive manipulado nunca puede escapar de su directorio objetivo.
- **Nunca debilites** la preservación (SELinux/uid/gid/modos/xattr) ni la regla del APK (los APK
  siempre se comprimen, nunca se cifran salvo que `encrypt_apk` esté activado).
- Trata la salida JSON como la fuente de la verdad; revisa `ok`/`code`, haz poll de `progress`,
  y expón los códigos `ERR_*` en vez de adivinar.

Ve [ARCHITECTURE.md](ARCHITECTURE.md) y
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) para los detalles internos.

<!-- doc-footer -->

---

> _Esta documentación se generó con Claude (Anthropic) y la mantiene VD171. Las correcciones y mejoras son bienvenidas; consulta [CONTRIBUTING.md](CONTRIBUTING.md)._

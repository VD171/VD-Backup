> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · Español · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Todos los cambios relevantes de VDBackup están documentados aquí. Solo en inglés.

## v1.04

Correcciones:

- Las carpetas de copias ahora se mantienen abribles con un gestor de archivos de forma automática: sus permisos se vuelven a aplicar en la instalación, en cada arranque y cada vez que se abre la WebUI, así que una carpeta que quedó solo para el propietario (por ejemplo una copia hecha antes de v1.03.2) se repara sola sin ningún paso manual.

Privacidad:

- Cuando tienes copias locales, la pestaña Copias ahora te recuerda ocultar la carpeta de copias con SUSFS, igual que la app companion: su presencia puede revelar el root o un bootloader desbloqueado. SUSFS oculta; el recordatorio solo te indica dónde.

Copias:

- Ahora puedes definir qué elementos respalda cada app - por ejemplo solo APK, o APK + OBB - y se aplica en copias masivas, automáticas y programadas. Una copia manual individual te sigue dejando elegir, con los elementos de la app preseleccionados. Configúralo en Ajustes, junto a la lista de apps excluidas.

- Presets de copia: guarda conjuntos con nombre de qué incluir y aplícalos con una sola elección en el diálogo de copia.
- Multiusuario: las copias de apps, las especiales y las restauraciones ahora siguen el usuario de Android que elijas.
- Las apps vuelven más listas y completas: se respaldan y restauran sus perfiles de compilación ART y sus permisos de escucha de notificaciones, accesibilidad y exención de batería Doze.
- Restauraciones más fiables: la propiedad de archivos y el contexto SELinux se vuelven a derivar en el dispositivo destino, así la restauración funciona entre dispositivos y usuarios.
- Restauraciones más seguras: Play Protect y el verificador de instalación se silencian solo durante la instalación y se restauran exactamente; el gestor de root nunca se respalda ni restaura; y la fuente de instalación se verifica y registra.
- Etiquetas de apps: da a las apps nombres libres como games o work, filtra la lista de apps por una etiqueta y respalda todo un grupo etiquetado a la vez.

## v1.03.2

Correcciones:

- La página de inicio de sesión en la nube en el dispositivo siempre mostraba "Sign-in failed",
  incluso cuando el inicio de sesión había funcionado. Ahora muestra el resultado real.
- Las copias guardadas ahora se pueden abrir con un gestor de archivos: las carpetas de
  copia por app quedaban solo para el propietario, así que ni un gestor con root entraba;
  ahora son accesibles como el resto de /sdcard/VDBackup.

Destinos en la nube:

- La app companion opcional de Google Drive ahora se compila y se incluye, así que Google
  Drive funciona mediante el companion en el dispositivo (la cuenta del dispositivo, sin
  pegar token a mano) además de rclone.

Interfaz:

- El diálogo de copia tiene un selector de destino, así una copia puede ir a un destino en la nube
  o remoto elegido sin cambiar antes el destino predeterminado en Ajustes.
- La app busca una versión más nueva al abrirse (como máximo una vez por hora) y muestra el aviso
  de actualización solo cuando hay una; permanece en silencio si está al día o sin conexión.

## v1.03.1

Nuevo alcance de backup:

- Nuevas categorías de backup especial: calendario (el proveedor de calendario, más una
  exportación portátil `calendar.json`), fondo de pantalla (fondo de inicio y de bloqueo),
  DNS privado (modo y especificador) y ajustes del sistema (el volcado completo de los
  ajustes system/global/secure). Los ajustes del sistema son opt-in y sobrescriben los
  ajustes de todo el dispositivo al restaurar, así que están protegidos como SSAID, con
  consentimiento explícito y una entrada completa de auditoría.
- Backup independiente de carpeta y archivo: respalda cualquier ruta absoluta
  (almacenamiento compartido o datos de app) como un archivo comprimido y sellado por
  manifiesto, y restáuralo a la misma ruta. La restauración necesita una confirmación
  explícita.

Restauración más segura:

- Cada archivo se comprueba antes de escribir nada: un backup cuyo contenido apunta fuera
  de su destino (una ruta absoluta o un componente `..`) se rechaza, de modo que una
  restauración que corre como root no puede ser engañada para escribir fuera del destino.

Progreso y programación:

- El progreso en vivo ahora muestra la velocidad de transferencia, el ETA y un contador de
  ítems durante los backups, además de un paso verificado por checksum para las subidas a la
  nube y una comprobación previa de "espacio insuficiente".
- Los trabajos programados pueden condicionarse: ejecutarse solo en Wi-Fi, solo mientras se
  carga, solo por encima de un nivel de batería, o solo en días de la semana elegidos; un
  trabajo programado también se omite mientras el dispositivo está críticamente caliente. Un
  trabajo omitido se reintenta en el siguiente tick.

Destinos en la nube:

- Conecta cualquier backend de rclone desde la interfaz: el desplegable de remoto en la nube
  ofrece los proveedores populares (Google Drive, Dropbox, OneDrive, Box, pCloud, Mega,
  Backblaze B2, S3, SFTP, WebDAV, FTP, SMB) más una opción "Custom (advanced)" donde escribes
  el nombre de cualquier otro backend de rclone y sus parámetros `key=value`, de modo que todos
  los backends de rclone quedan accesibles.
- Inicio de sesión en el dispositivo (sin PC): los proveedores que necesitan iniciar sesión con
  un navegador (Google Drive, Dropbox, OneDrive, Box, pCloud) tienen un botón "Authorize in
  browser" que abre el propio navegador del teléfono en la página de consentimiento del
  proveedor; tras aprobar, vuelves a la app y el remoto se guarda automáticamente, con el token
  capturado en el dispositivo. Pegar un token a mano sigue disponible como alternativa.

Interfaz:

- Una escala de interfaz ajustable (un control deslizante arrastrable) reescala toda la
  interfaz, de modo que encaje en pantallas de diferentes densidades de píxeles; 100% es el
  valor predeterminado y no cambia.
- La interfaz ahora se muestra de derecha a izquierda para árabe y persa.
- Un resumen inicial con conteos de backup y una barra de almacenamiento, insignias de
  estado, copiar hashes y rutas al portapapeles, interruptores de estilo Android, y una acción
  "Check for updates".
- El registro de actividad es una pantalla completa que se abre al instante, con una acción
  "Export logs" que guarda un archivo de registro que puedes adjuntar a un informe.

Correcciones:

- La restauración y la importación ya no fallan en dispositivos cuyo `tar` empaquetado no
  acepta la opción `--no-absolute-names`; la comprobación de seguridad del archivo es
  independiente de esa opción.
- "Check for updates" funciona incluso donde no hay ningún cliente HTTP empaquetado,
  recurriendo al rclone empaquetado; y el registro de actividad ya no tarda mucho en abrir.

## v1.01

Primer lanzamiento público. Un módulo WebUI para KernelSU/APatch/Magisk que respalda y restaura
apps y sus datos enteramente como root, sin aviso de concesión.

Motor y formatos:

- Motor de respaldo/restauración ejecutado como un proceso root desacoplado (`setsid`): sobrevive al cierre
  de la WebUI o del gestor de root, y la interfaz se reconecta al progreso en vivo mediante `opid`.
- Tres modos de respaldo: Full (tar.zst, local o remoto), Snapshot (repositorio restic, cifrado
  y desduplicado) y Mirror (sincronización 1:1 con rclone/rsync). Los APK siempre se comprimen,
  incluso en un mirror.
- Ítems por app: APK (base + splits), `data`, `data_de`, `obb`, externo y medios.
  El contexto SELinux, uid/gid, modos y xattr/caps se preservan; la restauración usa una
  sesión `pm install` y reasigna propietario/contexto al uid activo.
- Consciente de múltiples usuarios (multi-user) de principio a fin. Los respaldos se almacenan en `/sdcard/VDBackup`
  (por usuario), fuera de `/data/adb`, de modo que no son legibles antes del primer desbloqueo; cada
  destino queda aislado bajo `<path>/vdbackup`.
- Compresión: ninguna, lz4, zstd (niveles) o gzip ("modo de compatibilidad"). Un manifiesto JSON
  registra el dispositivo, el paquete (incluida la etiqueta del app), los ítems y los permisos.
- Cifrado portátil con `age` (keygen), además de una guía de RECUPERACIÓN en PC incluida dentro de cada
  respaldo cifrado, para que pueda descifrarse y extraerse en cualquier lugar, sin el módulo.

Destinos y nube:

- Destinos: agregar/listar/probar/eliminar (local, remoto rclone, repositorio restic y un companion
  opcional de Google Drive); las credenciales se almacenan ofuscadas, nunca en claro.
- Crear remotos rclone desde la interfaz/API (`remote-add`/`remote-list`/`remote-del`), de modo que cualquier
  backend de nube (SFTP, SMB, WebDAV, FTP, S3, Google Drive y más) sea accesible sin
  editar `rclone.conf` a mano.
- Google Drive de dos maneras: vía rclone (sin cuenta de Google Cloud) o mediante el app companion headless
  opcional (`ru.vd171.vdbackup`), que lleva un aviso obligatorio de ocultación con [HMA-OSS](https://github.com/frknkrc44/HMA-OSS).
- Política de red: elegir si las transferencias a la nube pueden usar cualquier conexión, solo Wi-Fi o
  solo datos móviles; se aplica a trabajos manuales y programados. Los destinos locales están exentos.

Importación (migración):

- Importar desde Neo-Backup, incluidos respaldos cifrados con contraseña (AES-256-GCM descifrado por
  el helper dex; la WebUI solicita la contraseña).
- Importar desde Android-DataBackup (instalar APK, extraer archivos user/user_de/data, reasignar).
- Ambos validados contra respaldos reales en varios dispositivos.

Integridad y seguridad:

- Restauración fiel del tipo borrar-y-extraer; verificación sha256 por archivo (activada por defecto en Full,
  y una comprobación de integridad del repositorio para Snapshot), dry-run y restore-test. Los archivos se releen
  para comprobar su integridad; un archivo corrupto o un nombre de paquete inválido nunca pueden desencadenar
  una restauración destructiva, y los fallos de transferencia remota se informan, nunca de forma silenciosa.
- Restauración selectiva: restaura cualquier subconjunto de los ítems que contiene un respaldo (APK, data, datos
  protegidos, OBB, externo, medios), todos seleccionados por defecto.
- Eliminar respaldos desde la interfaz/API (`delete-backup`) y retención keep-last-N para respaldos manuales
  (`prune`); cada borrado, restauración, poda y ejecución programada se escribe en un registro de auditoría JSON
  local que puedes ver en el app.
- Permisos de runtime y AppOps capturados en el manifiesto y reaplicados en la restauración. El origen de
  instalación (installerPackageName) y el estado habilitado/deshabilitado también se capturan y se reaplican en
  la restauración.
- Falsificación del origen de instalación: por defecto un app restaurado indica Play Store como su origen de
  instalación (fijado en el momento de la instalación mediante la sesión de instalación, ya que de lo contrario un
  app restaurado parece sideloaded); conmutable globalmente y por restauración, y cuando está desactivado se
  conserva el origen capturado. Un modo "deep" avanzado y opt-in además falsifica el paquete iniciador y el
  origen del paquete editando la base de datos de paquetes del sistema (respaldo byte a byte primero, se aplica
  tras un reinicio) de modo que el app parezca totalmente instalado desde la tienda.
- SSAID (ANDROID_ID del dispositivo): estrictamente opt-in y señalado de forma prominente; consciente de ABX; el
  archivo activo siempre se respalda byte a byte antes de cualquier sobrescritura, para rollback; se aplica tras un
  reinicio.
- La restauración y la importación requieren un reconocimiento explícito de "esto sobrescribe los datos actuales
  del app" antes de continuar.

Programación y automatización:

- Respaldos programados con retención keep-N, gestionados desde una pestaña Schedule (por app, diario/
  cada hora/semanal con una hora, modo y destino opcionales).
- Respaldo automático al instalar o actualizar: un observador opt-in va montado en el heartbeat del programador,
  respalda apps nuevas o actualizadas en segundo plano, y solo siembra en la primera ejecución, de modo que
  activarlo nunca respalda todo de una vez. Respeta el ajuste de apps excluidas (lista de bloqueo).

Copias especiales (a nivel de todo el sistema):

- Respaldar mensajes (SMS/MMS), contactos y registro de llamadas, Wi-Fi y Bluetooth como datos de sistema en
  crudo, archivados fielmente (la misma preservación de SELinux/xattr y el mismo cifrado age opcional que los
  respaldos de app). La restauración es fiel al mismo dispositivo/misma ROM, requiere reinicio, y está protegida
  tras un reconocimiento prominente de sobrescritura-y-reinicio.
- Exportación portátil opcional junto al archivo en crudo: mensajes, registro de llamadas y contactos también se
  escriben como JSON abrible (leído con el sqlite3 empaquetado directamente desde las bases de datos del
  proveedor, de modo que los cuerpos de mensaje con comas o saltos de línea sobreviven intactos), dando una copia
  multidispositivo y sin necesidad del módulo. La copia portátil también se cifra cuando el respaldo está cifrado,
  así que nunca filtra lo que el archivo protege.

Integración con el sistema:

- Montar un app instalado como app de sistema sin tocar la partición /system real: VDBackup prepara el/los APK
  del app en su propio submódulo de superposición, que el gestor de root monta. Con NoMount en KernelSU se
  inyecta en vivo (sin reinicio); de lo contrario se aplica en el próximo arranque, así que nunca depende de que
  NoMount esté instalado. Elige colocación regular o privilegiada.

WebUI:

- La lista de apps muestra el nombre real localizado del app (resuelto desde el APK, de modo que sobrevive a una
  desinstalación) junto con el paquete, con iconos cargados bajo demanda y en caché, renderizados como bloques
  redondeados y conscientes de iconos adaptativos.
- Toca un app para abrir su historial de respaldos y restaurar cualquier respaldo anterior; la pestaña Backups
  muestra el nombre y el paquete en líneas separadas y abre una hoja de detalles por respaldo (versión,
  origen de instalación, estado, fecha, tamaño, ítems, conteo de permisos, dispositivo).
- Filtra la lista de apps por usuario/sistema/todas y ordena por nombre o paquete; selecciona varias apps y
  respáldalas en un solo lote; excluye apps de los respaldos automáticos y programados.
- Elige qué incluir y alterna verify o dry-run por respaldo; elige una restauración solo-de-prueba que extrae a
  staging sin tocar el app vivo.
- Tema claro/oscuro, un selector de color de acento, selector de idioma, una pestaña Acerca de (con los
  proyectos hermanos y el manifiesto de auditoría de los binarios empaquetados), un selector de carpetas para
  el destino local, progreso de operación localizado con feedback instantáneo y diálogos modernos dentro del
  app (sin pop-ups de alert/confirm del sistema).
- La navegación con el botón atrás regresa a la pestaña anterior y cierra primero los diálogos; los diálogos son
  flotantes y el app sobrevive a la reapertura reconectándose a las operaciones en vivo.

AI-friendly e i18n:

- Una superficie de control JSON documentada para que los agentes administren cada acción de forma headless
  (`docs/AI-AGENTS.md`); la WebUI es solo un cliente de esa API.
- El README y toda la documentación del proyecto están traducidos a los 21 idiomas estándar
  (`docs/<lang>/`), con los docs espejados en el wiki.
- El listado rico de apps y el descifrado de Neo se ejecutan a través de un helper dex dirigido como root
  (`IPackageManager` vía ServiceManager), de modo que funcionan donde ActivityThread se bloquea.

*Esta documentación fue generada con Claude (Anthropic) y es mantenida por VD171. Correcciones y mejoras son bienvenidas - ve [CONTRIBUTING.md](CONTRIBUTING.md).*

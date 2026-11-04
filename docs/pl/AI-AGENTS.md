> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · Polski · [Português](../pt/AI-AGENTS.md) · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Sterowanie VDBackup z agenta AI

VDBackup jest zbudowany tak, aby asystent lub agent AI mógł administrować **każdą** treścią i
akcją modułu bezgłowo, tak samo jak robi to człowiek przez WebUI. WebUI jest tylko jednym
klientem małego API JSON; twój agent jest kolejnym. Używaj API,
nie scrapuj WebUI.

## Kontrakt

Wszystko przechodzi przez jeden punkt wejścia, uruchamiany jako root na urządzeniu:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Argumenty to pojedynczy obiekt JSON, **zakodowany w base64**, przekazany jako jeden token argv.
- Polecenie wypisuje **jeden obiekt JSON** na stdout: `{"ok":true,...}` lub
  `{"ok":false,"code":"ERR_...","message":"..."}`. Parsuj to; nigdy nie scrapuj tekstu.
- Długie operacje (`backup`, `restore`, `import`) zwracają `{"ok":true,"opid":"..."}`
  natychmiast i działają **odłączone** (przeżywają zamknięcie wywołującego/WebUI). Odpytuj
  ich postęp; nie są zakończone, gdy wywołanie powraca.
- `progress` i `cancel` biorą **base64 surowego łańcucha opid**, nie obiekt JSON.

Mały pomocnik dla twojego shella:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Aby sterować tym z komputera roboczego, uruchom to przez swój zwykły kanał root do urządzenia
(adb shell jako root, lub konfiguracja SSH-to-root). Moduł dostarcza dołączone binaria, więc
po instalacji nie potrzebuje **żadnego internetu** dla lokalnej kopii/przywracania; tylko cele
chmurowe (`rclone`/`restic`/ssh) komunikują się z siecią.

## Czasowniki

| Czasownik | Args (JSON) | Zwraca |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | obiekt konfiguracji (lub `{key,value}`) | `{ok}` |
| `keygen` | `{}` | generuje parę kluczy `age` do szyfrowania |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, shell fallback) |
| `label` | `{package,user?}` | `{ok,label}` (prawdziwa zlokalizowana nazwa aplikacji, bez kontekstu) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (base64 PNG; cachowane per package+`vc`) |
| `backup` | zobacz poniżej | `{ok,opid}` (odłączone) |
| `restore` | zobacz niżej | `{ok,opid}` (odłączone) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (odłączone) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | żywy `progress-<opid>.json` |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (ponowne podłączenie po przywróceniu połączenia) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | lista aplikacji / wsadowe ikony base64 |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `backup-info` | `{ref}` | `{ok,...}` pełne szczegóły jednej kopii (wersja, źródło instalacji, stan, data, tryb, rozmiar, elementy, liczby uprawnień, urządzenie) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 z manifestu (działa, gdy aplikacja jest odinstalowana) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref musi być pod katalogiem kopii) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` zachowuje N najnowszych kopii pakietu |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` dziennik audytu, od najnowszych |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` kopia ogólnosystemowa (odłączone) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (wymaga restartu; `confirm` to zabezpiecza) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | montuje zainstalowaną aplikację jako systemową (bezsystemowy podmoduł; na żywo przez NoMount, inaczej przy następnym rozruchu) |
| `companion-status` / `companion-install` | `{}` | status komponentu Dysku Google / instalacja na żądanie |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | zarządzanie celami |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | zarządzanie zdalnymi rclone (tworzy wpis `rclone.conf`, na który wskazuje cel `type:"rclone"`) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | zaplanowane zadania |
| `scheduler-tick` | `{}` | uruchamia należne zadania + stosuje retencję + obserwator automatycznej kopii (wywołuje to heartbeat rozruchowy) |

### Argumenty `backup`

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

`restore`/`import` biorą `{ref}` (katalog kopii / scan ref). `restore` przyjmuje również:
`"items"` (podzbiór typów elementów kopii do przywrócenia; pomiń, by przywrócić wszystkie), `"test": true`
(rozpakowuje do katalogu tymczasowego i weryfikuje, bez dotykania żywej aplikacji), `"mode"` dla
snapshot/mirror, `"password"` dla zaszyfrowanej kopii, `"ssaid"` (opt-in) oraz opcje źródła
instalacji `"spoof_installer"` (domyślnie z config, ustawia instalatora na Sklep Play w czasie
instalacji) i `"deep_spoof": true` (zaawansowany opt-in; fałszuje też pakiet inicjujący i źródło
pakietu, edytując bazę pakietów, stosuje się po restarcie). `import` bierze `"from": "neo" | "databackup"`
oraz, dla zaszyfrowanej kopii Neo, `"password"`.

### Argumenty `remote-add`

Cel chmurowy to cel `type:"rclone"`, który nazywa zdalny `rclone`; utwórz
najpierw ten zdalny za pomocą `remote-add`. Pola haseł są przechowywane zaciemnione, nigdy
w postaci jawnej. Obsługiwane wartości `backend` i ich `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

Google Drive ma dwie ścieżki: ten zdalny `drive` (nie wymaga projektu Google Cloud, używa
własnego OAuth rclone - uruchom `rclone authorize "drive"` raz na dowolnym komputerze i przekaż
token) lub opcjonalną aplikację towarzyszącą (własne OAuth client id). Oba kończą jako zwykłe
cele.

### Polityka sieciowa

Pole konfiguracji `network_policy` kontroluje, które połączenie mogą wykorzystać przesyły chmurowe:
`any` (domyślnie), `wifi`, lub `mobile`. Ustaw je za pomocą `config-set`. Gdy jest `wifi` lub
`mobile`, każdy przesył chmurowy (Full `rclone`/Drive upload, Mirror sync, zdalna
`restic` kopia/przywracanie snapshota, Mirror przywracanie) najpierw sprawdza aktywny transport i
przerywa z `ERR_NET_POLICY`, jeśli nie pasuje - zarówno dla zadań ręcznych, jak i zaplanowanych.
Cele lokalne nigdy nie są ograniczane.

## Bariery bezpieczeństwa, których twój agent musi przestrzegać

- **`ssaid` jest ściśle opt-in (domyślnie wyłączone).** Tworzy kopię / przywraca
  ANDROID_ID urządzenia przez przepisanie pliku systemowego; przywracanie stosuje się dopiero po restarcie, a
  poprzedni plik jest zawsze najpierw zapisywany dla rollbacku. Wysyłaj `"ssaid": true`
  tylko na bezpośrednie, zamierzone żądanie użytkownika - nigdy domyślnie.
- **Akcje modyfikujące (restore, delete, import) są destrukcyjne** i są logowane do
  lokalnej ścieżki audytu (`logs/audit.jsonl`). Przywracanie jest wierne (wipe-then-extract), więc
  przywraca aplikację do dokładnego stanu kopii. Potwierdź zamiar, zanim je wywołasz.
- **Nigdy nie osłabiaj** zachowania (SELinux/uid/gid/tryby/xattr) ani reguły APK (APK
  są zawsze skompresowane, nigdy zaszyfrowane, chyba że ustawiono `encrypt_apk`).
- Traktuj wyjście JSON jako źródło prawdy; sprawdzaj `ok`/`code`, odpytuj `progress`,
  i uwidaczniaj kody `ERR_*` zamiast zgadywać.

Zobacz [ARCHITECTURE.md](ARCHITECTURE.md) i
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) dla wewnętrznych szczegółów.

---

*Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane - zobacz [CONTRIBUTING.md](CONTRIBUTING.md).*

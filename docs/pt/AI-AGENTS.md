> **Languages:** [English](../AI-AGENTS.md) · [العربية](../ar/AI-AGENTS.md) · [Čeština](../cs/AI-AGENTS.md) · [Deutsch](../de/AI-AGENTS.md) · [Español](../es/AI-AGENTS.md) · [فارسی](../fa/AI-AGENTS.md) · [Français](../fr/AI-AGENTS.md) · [हिन्दी](../hi/AI-AGENTS.md) · [Bahasa Indonesia](../in/AI-AGENTS.md) · [Italiano](../it/AI-AGENTS.md) · [日本語](../ja/AI-AGENTS.md) · [한국어](../ko/AI-AGENTS.md) · [Nederlands](../nl/AI-AGENTS.md) · [Polski](../pl/AI-AGENTS.md) · Português · [Русский](../ru/AI-AGENTS.md) · [Svenska](../sv/AI-AGENTS.md) · [ไทย](../th/AI-AGENTS.md) · [Türkçe](../tr/AI-AGENTS.md) · [Tiếng Việt](../vi/AI-AGENTS.md) · [中文](../zh/AI-AGENTS.md)

---

# Dirigindo o VDBackup a partir de um agente de IA

O VDBackup é construído para que um assistente ou agente de IA possa administrar **toda**
ação e conteúdo do módulo de forma headless, do mesmo jeito que uma pessoa faz pela WebUI. A
WebUI é apenas um cliente de uma pequena API JSON; seu agente é outro. Use a API,
não raspe a WebUI.

## O contrato

Tudo passa por um único ponto de entrada, executado como root no dispositivo:

```
sh /data/adb/modules/vdbackup/scripts/helper.sh <verb> <base64(JSON-args)>
```

- Os argumentos são um único objeto JSON, **codificado em base64**, passado como um único token argv.
- O comando imprime **um objeto JSON** no stdout: `{"ok":true,...}` ou
  `{"ok":false,"code":"ERR_...","message":"..."}`. Faça o parse disso; nunca raspe texto.
- Operações longas (`backup`, `restore`, `import`, `backup-batch`, `restore-batch`, `config-export`, `config-import`) retornam `{"ok":true,"opid":"..."}`
  imediatamente e rodam **destacadas** (sobrevivem à saída do chamador/WebUI). Faça poll
  do progresso delas; elas não estão concluídas quando a chamada retorna.
- `progress` e `cancel` recebem **o base64 da string opid crua**, não um objeto JSON.

Um pequeno helper para o seu shell:

```sh
b64() { printf '%s' "$1" | base64 -w0; }
H=/data/adb/modules/vdbackup/scripts/helper.sh
sh "$H" backup "$(b64 '{"package":"com.example.app","mode":"full"}')"
```

Para dirigi-lo a partir de uma estação de trabalho, rode isso pelo seu canal root habitual até o dispositivo
(adb shell como root, ou um setup de SSH-para-root). O módulo entrega binários embarcados, então
uma vez instalado ele não precisa de **nenhuma internet** para backup/restauração local; apenas destinos
de nuvem (`rclone`/`restic`/ssh) falam com a rede.

## Verbos

| Verbo | Args (JSON) | Retorna |
|------|-------------|---------|
| `ping` | `{}` | `{ok,version,abi}` |
| `overview` | `{user?}` | `{ok:true,apps,instances,path_backups,jobs,backups_size,free,total}` contagens (tamanhos em bytes): apps com backups, total de instâncias de backup, backups de caminho avulsos, jobs agendados, tamanho total dos backups, e o livre/total do sistema de arquivos dos backups. Não destacada, retorna imediatamente; usada pelo overview inicial da WebUI. |
| `config-get` | `{}` | `{ok,config}` |
| `config-set` | o objeto de config (ou `{key,value}`) | `{ok}` |
| `keygen` | `{}` | gera o par de chaves `age` para criptografia |
| `list-apps` | `{user?}` | `{ok,apps:[{package,label,system,versionCode}]}` (dex, fallback shell) |
| `label` | `{package,user?}` | `{ok,label}` (nome real localizado do app, sem contexto) |
| `icon` | `{package,user?,vc?}` | `{ok,package,icon}` (PNG base64; cacheado por package+`vc`) |
| `backup` | veja abaixo | `{ok,opid}` (destacada) |
| `restore` | veja abaixo | `{ok,opid}` (destacada) |
| `import` | `{from,ref,password,ssaid,user}` | `{ok,opid}` (destacada) |
| `import-scan` | `{from,path}` | `{ok,backups:[...]}` |
| `progress` | base64(opid) | o `progress-<opid>.json` ao vivo |
| `cancel` | base64(opid) | `{ok,cancelled}` |
| `list-ops` | `{}` | `{ok,ops:[...]}` (reatar após reconectar) |
| `list-apps`/`icons` | `{user?}` / `{user?,items:[{package,vc}]}` | lista de apps / ícones base64 em lote |
| `list-backups` | `{package?}` | `{ok,backups:[{ref,package,label,versionName,versionCode,created_at,mode,items}]}` |
| `list-users` | `{}` | `{ok,users:[{id,name}]}` usuários Android do dispositivo (multiusuário). |
| `list-dirs` | `{path}` | `{ok,path,parent,dirs:[...]}` subdiretórios de um caminho (seletor de pastas). |
| `path-list` | `{user?}` | `{ok,backups:[...]}` backups avulsos de pasta/arquivo. |
| `provenance` | `{}` | manifesto de auditoria dos binários embarcados (`PROVENANCE.json`). |
| `backup-info` | `{ref}` | `{ok,...}` todos os detalhes de um backup (versão, fonte de instalação, estado, data, modo, tamanho, itens, contagens de permissão, dispositivo) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 do manifesto (funciona quando o app está desinstalado) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref deve estar sob o diretório de backups) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` mantém os N mais recentes de um pacote |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` log de auditoria, do mais recente para o mais antigo |
| `log-export` | `{user?}` | `{ok:true,path}` (caminho absoluto de um `.txt` gravado sob o diretório de backups) ou `{ok:false,code:"ERR_LOG_EXPORT"}`. Grava o log de atividades (`audit.jsonl`) mais um breve cabeçalho de build/dispositivo em um único arquivo de texto visível ao usuário, para que possa ser anexado a um relatório de bug. Não destacada, retorna imediatamente. |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth/calendar/wallpaper/dns/system_settings) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` backup de todo o sistema (destacada) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (precisa de reboot; `confirm` o protege) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `path-backup` | `{path,compression?,password?}` | `{ok,opid}` faz backup de qualquer caminho absoluto como `tar.zst`+`manifest.json` sob `.paths/` (destacada) |
| `path-restore` | `{ref,confirm:true,password?}` | `{ok,opid}` restaura um backup de caminho para seu local original (`confirm` o protege; destacada) |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | monta um app instalado como app de sistema (sub-módulo sem sistema; ao vivo via NoMount, senão no próximo boot) |
| `companion-status` / `companion-install` | `{}` | status do companheiro do Google Drive / instalação sob demanda |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | gerenciamento de destinos |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | gerenciamento de remotos rclone (cria a entrada `rclone.conf` para a qual um dest `type:"rclone"` aponta); `backend` pode ser qualquer backend rclone, sem lista de permissões |
| `remote-authorize` | `{backend}` | `{ok:true,url}` (o motor já abriu o navegador do telefone nessa URL de consentimento via uma intent VIEW do Android) ou `{ok:false,code:"ERR_AUTHORIZE"}`. Roda `rclone authorize <backend>` num servidor de callback local (`127.0.0.1:53682`) para OAuth no dispositivo. |
| `remote-authorize-poll` | `{}` | `{ok:true,done:false,url}` enquanto aguarda, `{ok:true,done:true,token}` quando o usuário consente (o `token` a passar para `remote-add`), ou `{ok:false,code:"ERR_AUTHORIZE"}`. |
| `remote-authorize-cancel` | `{}` | `{ok:true,cancelled:true}`; interrompe uma autorização pendente. |
| `cloud-status` | `{}` | `{ok,rclone,restic,fetchable,size}` (se os binários `rclone`/`restic` estão presentes, se esta edição `lite` consegue buscá-los, tamanho do download em bytes) |
| `cloud-fetch` | `{}` | `{ok,opid}` (destacada) baixa+verifica+instala o addon `rclone`/`restic` numa edição `lite` |
| `schedule-set` / `schedule-list` / `schedule-delete` | veja abaixo | jobs agendados (um backup ou uma restauração; alvo de um app, um conjunto, ou todos os apps) |
| `scheduler-tick` | `{}` | roda jobs vencidos + aplica retenção + o observador de auto-backup (o heartbeat de boot chama isto) |
| `update-check` | `{}` | `{ok,current_version,current_code,latest_version,latest_code,update_available,zipUrl,changelog,notes}` (não destacada; retorna imediatamente; `ERR_UPDATE_CHECK` em caso de falha, veja abaixo) |
| `backup-batch` | `{packages:[...], ...backup args}` | `{ok,opid}` (detached) faz backup de vários apps numa op destacada; o progresso traz `n`/`of`. Uma falha por app não interrompe o lote. |
| `restore-batch` | `{refs:[...], ...restore args}` | `{ok,opid}` (detached) restaura vários backups numa op destacada; o progresso traz `n`/`of`. Uma falha por app não interrompe o lote. |
| `list-volumes` | `{}` | `{ok,volumes:[{path,removable,id?}]}` volumes de armazenamento para o seletor de pastas: interno mais SD/USB removível. |
| `config-export` | `{password}` | `{ok,opid}` (detached) exporta config, jobs, destinos, credenciais e chaves para um arquivo único cifrado por frase-senha, sob a pasta de backups. |
| `config-import` | `{ref,password}` | `{ok,opid}` (detached) mescla um arquivo de config exportado de volta neste aparelho (nunca sobrescreve às cegas). |
| `config-exports` | `{}` | `{ok,exports:[{ref,name,size}]}` lista os arquivos de config cifrados disponíveis para importar. |
| `wipe-credentials` | `{}` | `{ok,wiped}` remove senhas remotas salvas e a chave de criptografia do aparelho; destinos, jobs e backups permanecem. |
| `log-prune` | `{}` | `{ok}` poda logs de ops há muito concluídas, limita a trilha de auditoria e remove ícones obsoletos (o serviço de boot chama isto). |

### Campos de `progress`

Fazer poll de `progress` retorna o `progress-<opid>.json` ao vivo da operação. Estes campos
estão **sempre presentes**:

| Campo | Tipo | Significado |
|-------|------|-------------|
| `opid` | string | o id da operação |
| `percent` | int | 0-100 de conclusão |
| `phase` | string | o label da fase atual |
| `item` | string | o tipo de item sendo processado no momento |
| `done` | bool | true numa escrita terminal (finish / dry-run / restore-test) |

Uma operação em andamento também pode carregar estes campos ao vivo **opcionais**. Eles ficam
ausentes ou vazios quando desconhecidos, e são **omitidos nas escritas terminais** (finish /
dry-run / restore-test):

| Campo | Tipo | Significado |
|-------|------|-------------|
| `rate` | string | velocidade de transferência, ex. `"4.2 MiB/s"` (vazio = desconhecido) |
| `eta` | string | tempo restante estimado, ex. `"1m12s"` (vazio = desconhecido) |
| `n` | int | índice do item atual (0 = desconhecido) |
| `of` | int | total de itens (0 = desconhecido) |
| `cur` | string | nome do item atual (vazio = nenhum) |

Transferências de nuvem preenchem `rate`/`eta` (o percent vem do rclone); backups Full locais
preenchem `n`/`of`/`cur`. Os labels de fase incluem a fase de selo de checksum **`verified`** e,
para transferências de nuvem, **`transfer`** e **`mirror <item>`**.

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

`restore`/`import` recebem `{ref}` (um dir de backup / ref de scan). `restore` também aceita:
`"items"` (um subconjunto dos tipos de item do backup a restaurar; omita para todos), `"test": true`
(extrai para um dir temporário e verifica, sem tocar no app vivo), `"mode"` para
snapshot/mirror, `"password"` para um backup criptografado, `"ssaid"` (opt-in), e as
opções de fonte de instalação `"spoof_installer"` (padrão vindo da config, define o instalador como a
Play Store no momento da instalação) e `"deep_spoof": true` (opt-in avançado; também forja o
pacote iniciador e a fonte do pacote editando o banco de pacotes, aplica-se após um
reboot). `import` recebe `"from": "neo" | "databackup"` e, para um backup Neo criptografado,
`"password"`.

### Args de `schedule-set`

Um job de agendamento escolhe **um** alvo e uma **ação**:

```json
{
  "id": "nightly-games",
  "action": "backup",             // "backup" (padrão) | "restore"
  "package": "com.example.app",   // um app   - OU -
  "packages": ["com.a","com.b"],  // um conjunto de apps   - OU -
  "all": true,                    // todos os apps, menos a lista de apps excluídos
  "cron": "daily",                // hourly | daily | weekly
  "at": "02:30",                  // HH:MM
  "mode": "full",
  "dest": "local",
  "keep": 5,
  "items": ["apk","data"],
  "require_wifi": false,          // gate: só roda no Wi-Fi
  "require_charging": false,      // gate: só roda enquanto carregando
  "min_battery": 0,               // gate: só roda com bateria >= este % (0-100)
  "days": [1,2,3,4,5]             // gate: só roda nestes dias da semana (0=domingo)
}
```

Dê exatamente **um** de `package`, `packages` ou `all` para o alvo. Um job `backup`
mantém os habituais `mode`/`dest`/`keep`/`items`. Um job `restore` (`action: "restore"`)
restaura o backup **mais recente** de cada app-alvo (ou um `ref` explícito) e **sobrescreve
os dados atuais do app a cada execução**: é deliberado e opt-in, então defina isto só a um
pedido direto do usuário.

### Gating do agendador

Um job agendado pode carregar **condições de gate opcionais**. Quando o gate de um job vencido
não é atendido, ele é **pulado e tentado de novo no próximo tick, sem avançar seu agendamento**
(seu `last_run` não é carimbado, então ele dispara assim que a condição se cumpre):

| Campo | Tipo | Gate |
|-------|------|------|
| `require_wifi` | bool | só roda enquanto no Wi-Fi |
| `require_charging` | bool | só roda enquanto carregando |
| `min_battery` | int (0-100) | só roda com a bateria neste nível ou acima |
| `days` | array de int (0-6, 0=domingo) | só roda nestes dias da semana |

Uma checagem mínima de **segurança térmica** é sempre aplicada além destas: uma op agendada é
pulada enquanto o dispositivo está criticamente quente. Todo skip de gate é escrito na trilha de
auditoria como `op:"scheduler-gated"` com um `reason` de `wifi` / `charging` / `battery` / `days`
/ `thermal`.

### Args de `remote-add`

Um destino de nuvem é um dest `type:"rclone"` que nomeia um remoto `rclone`; crie
esse remoto primeiro com `remote-add`. O `backend` pode ser **qualquer backend rclone**: não há
lista de permissões. O `remote-add` aceita qualquer nome de backend (`dropbox`, `onedrive`,
`box`, `pcloud`, `mega`, `b2`, `s3`, `sftp`, `smb`, `webdav`, `ftp`, `drive` e os ~70 outros que
o rclone suporta), e os `params` são repassados diretamente para a config do `rclone` como pares
`key=value`. Campos de senha são guardados obscurecidos, nunca em claro. Backends comuns e seus
`params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

**OAuth no dispositivo (sem PC).** Backends que precisam de login no navegador (Google Drive,
Dropbox, OneDrive, Box, pCloud) não exigem um computador nem um token colado manualmente. Chame
`remote-authorize` com `{backend}`: o motor roda `rclone authorize <backend>` contra um servidor
de callback local (`127.0.0.1:53682`) e abre o próprio navegador do telefone na página de
consentimento do provedor via uma intent VIEW do Android, retornando `{ok:true,url}` (ou
`{ok:false,code:"ERR_AUTHORIZE"}`). Faça poll de `remote-authorize-poll` (`{}`): retorna
`{ok:true,done:false,url}` enquanto aguarda e `{ok:true,done:true,token}` quando o usuário aprova
- passe esse `token` para `remote-add`. `remote-authorize-cancel` (`{}`) interrompe uma
autorização pendente (`{ok:true,cancelled:true}`). Colar manualmente o output de
`rclone authorize "<backend>"` de qualquer computador ainda é suportado como fallback.

O Google Drive tem dois caminhos: este remoto `drive` (sem precisar de projeto Google Cloud, usa
o OAuth próprio do rclone, autorize no dispositivo com `remote-authorize`, ou rode
`rclone authorize "drive"` uma vez em qualquer computador e passe o token) ou o app companheiro
opt-in (seu próprio client id OAuth). Ambos terminam como destinos comuns.

### Política de rede

O campo de config `network_policy` controla qual conexão as transferências de nuvem podem usar:
`any` (padrão), `wifi`, ou `mobile`. Defina-o com `config-set`. Quando for `wifi` ou
`mobile`, toda transferência de nuvem (upload Full `rclone`/Drive, sync Mirror, backup/restauração
de snapshot `restic` remoto, restauração Mirror) checa o transporte ativo primeiro e
aborta com `ERR_NET_POLICY` se não casar, tanto para jobs manuais quanto agendados.
Destinos locais nunca são gateados.

### Integridade e cota de nuvem

- **Selo de checksum (nuvem).** Após uma cópia de nuvem bem-sucedida, o engine roda uma checagem
  de checksum remota (`rclone check`); uma divergência falha a op com `ERR_VERIFY`. Backends que
  não compartilham nenhum hash em comum com o lado local são pulados (não é uma falha).
- **Checagem de cota (nuvem, modo Full).** Antes de um upload em modo Full para um remoto
  `rclone`, o engine consulta o espaço livre do remoto (`rclone about --json`) e recusa com
  `ERR_QUOTA` se o backup não couber. Remotos que não reportam informação de cota são pulados. O
  modo Mirror é um delta sync e está isento.

### Binários de nuvem (edição `lite`)

Uma edição `full` entrega todos os binários embarcados e nunca precisa de rede. A edição `lite`
omite os dois maiores, `rclone` e `restic`, e os busca sob demanda na primeira vez que você roda
uma ação de nuvem ou snapshot. `cloud-status` informa se eles já estão presentes, se esta edição
consegue buscá-los, e o tamanho do download em bytes. `cloud-fetch` roda **destacada** (faça poll
de `progress` com o `opid` dela): baixa o addon `rclone`+`restic` por arquitetura, verifica-o
contra o SHA-256 embutido no módulo, e o instala no cache de runtime. Suas fases de progresso são
`downloading`, `verifying` e `installing`; o código final é `ERR_NONE` em caso de sucesso, ou
`ERR_FETCH` (download falhou) / `ERR_FETCH_VERIFY` (checksum não bate, descartado) em caso de
falha. Numa edição `full` ela é desnecessária. Um `backup`/`restore` para um destino de nuvem ou
snapshot numa edição `lite`, antes de os binários estarem presentes, falha com
`ERR_CLOUD_FETCHABLE`; o cliente deve oferecer rodar `cloud-fetch`, e então tentar de novo.

### Categorias de backup especial

`special-categories` informa quais categorias de todo o sistema um dispositivo tem;
`special-backup` captura as que você passa em `categories` e `special-restore` as reaplica.
As categorias são:

| Categoria | O que é | Semântica de restauração |
|-----------|---------|--------------------------|
| `messages` | SMS/MMS | substituição no provider (apaga + extrai) |
| `contacts` | contatos e registro de chamadas | substituição no provider (apaga + extrai) |
| `wifi` | redes Wi-Fi salvas | substituição no provider (apaga + extrai) |
| `bluetooth` | pareamentos Bluetooth | substituição no provider (apaga + extrai) |
| `calendar` | o provider de calendário (`com.android.providers.calendar`, app + dados); também exportado de forma portátil para `calendar.json` | substituição no provider (apaga + extrai) |
| `wallpaper` | papel de parede da tela inicial e de bloqueio mais `wallpaper_info.xml`, guardado cru (binário) | arquivos substituídos |
| `dns` | o modo e o especificador de DNS privado, lidos das settings | `settings put` idempotente |
| `system_settings` | o dump completo das settings system/global/secure | **opt-in**, `settings put` idempotente, sobrescreve as configurações do dispositivo |

**`system_settings` é estritamente opt-in e destrutivo na restauração.** Como o `ssaid`, ele
sobrescreve as configurações de todo o dispositivo quando é restaurado, então é protegido por
consentimento explícito do usuário e escrito na trilha de auditoria. Nunca o selecione por
padrão; só a um pedido direto e deliberado do usuário.

### Backup de caminho avulso

`path-backup` / `path-restore` fazem backup e restauram **qualquer caminho absoluto**: uma
pasta ou um único arquivo, no armazenamento compartilhado ou sob `/data`, fora do modelo
por-app. O archive é escrito como `tar.zst` mais um `manifest.json` no formato próprio do
VDBackup (selado com SHA-256, com um kit RECOVERY quando criptografado) sob `.paths/` no
diretório de backups.

```json
// path-backup
{ "path": "/sdcard/DCIM/Camera", "compression": "zstd:10", "password": "..." }
// path-restore
{ "ref": "<.paths ref>", "confirm": true, "password": "..." }
```

- O caminho de origem deve ser **absoluto** e estar sob uma das roots permitidas:
  `/storage/emulated`, `/data/media`, `/sdcard`, `/data`. Um caminho que não existe falha com
  `ERR_NO_PATH`; um caminho fora das roots permitidas, ou um que contenha `..`, falha com
  `ERR_BAD_PATH`.
- `path-restore` escreve de volta no local original, então é destrutivo e exige
  `"confirm": true`, um portão de alto atrito, como o `special-restore`. Um `ref` que não é um
  backup de caminho válido falha com `ERR_BAD_REF`.
- Ambos rodam **destacados**; faça poll de `progress` com o `opid` retornado.

### `update-check`

`update-check` informa se uma versão mais nova do módulo foi publicada, para que um agente
(ou a WebUI) possa exibi-la. É um **verbo de leitura que retorna imediatamente**: **não** é
destacado, então não há `opid` para fazer poll. Acionado somente por uma ação explícita do
usuário, ele busca o manifesto de atualização publicado do módulo (a URL `updateJson` do
`module.prop`) com o `curl` embarcado por uma requisição HTTP do lado root, isso roda fora do
WebView, então não está sujeito à CSP da WebUI, e compara o `versionCode` publicado com o
instalado. Não recebe **nenhum argumento**.

Em caso de sucesso retorna:

| Campo | Tipo | Significado |
|-------|------|-------------|
| `ok` | bool | `true` |
| `current_version` | string | o versionName instalado |
| `current_code` | int | o versionCode instalado |
| `latest_version` | string | o versionName publicado |
| `latest_code` | int | o versionCode publicado |
| `update_available` | bool | `true` quando `latest_code` é maior que `current_code` |
| `zipUrl` | string | a URL do zip publicado |
| `changelog` | string | a URL do changelog publicado |
| `notes` | string | as notas de versão |

Se não houver URL `updateJson`, se a requisição de rede falhar, ou se o manifesto não puder ser
parseado, ele retorna `{"ok":false,"code":"ERR_UPDATE_CHECK"}`.

O `update-check` apenas **informa** a disponibilidade e as notas de versão; a atualização em si é
feita pelo seu gerenciador root (KernelSU / APatch / Magisk) através do `updateJson` do módulo,
nunca por este verbo.

## Trilhos de segurança que seu agente deve respeitar

- **`ssaid` é estritamente opt-in (padrão desligado).** Ele faz backup / restaura o
  ANDROID_ID do dispositivo reescrevendo um arquivo de sistema; uma restauração se aplica só após um reboot, e
  o arquivo anterior é sempre salvo primeiro para rollback. Só envie `"ssaid": true`
  a pedido direto e deliberado do usuário, nunca por padrão.
- **Ações mutáveis (restore, delete, import) são destrutivas** e são logadas em uma
  trilha de auditoria local (`logs/audit.jsonl`). A restauração é fiel (apaga-depois-extrai), então
  ela reverte o app ao estado exato do backup. Confirme a intenção antes de chamá-las.
- **`system_settings` é opt-in e destrutivo, exatamente como o `ssaid`.** Restaurá-lo
  sobrescreve as configurações de todo o dispositivo, então envie-o só a um pedido direto do
  usuário; é protegido por consentimento explícito e registrado na trilha de auditoria.
- **A restauração é idempotente.** Restaurações cruas de provider (messages/contacts/wifi/
  bluetooth/calendar) **substituem** em vez de mesclar, os dados do provider são apagados e o
  archive é extraído por cima, então re-restaurar o mesmo backup não pode duplicar linhas. `dns`
  e `system_settings` são reaplicados com `settings put` idempotente.
- **A extração de archives é protegida contra path traversal.** A restauração roda como root,
  então todo archive (restore, import, special-restore, path-restore) é checado antes de qualquer
  escrita: um cujos membros usem caminhos absolutos ou contenham `..` é rejeitado de antemão com
  `ERR_UNSAFE_ARCHIVE`, antes que uma única escrita destrutiva aconteça (o GNU tar também roda com
  `--no-absolute-names`). Um archive adulterado nunca pode escapar do seu diretório de destino.
- **Nunca enfraqueça** a preservação (SELinux/uid/gid/modos/xattr) ou a regra do APK (APKs
  são sempre comprimidos, nunca criptografados a menos que `encrypt_apk` esteja setado).
- Trate a saída JSON como a fonte da verdade; cheque `ok`/`code`, faça poll de `progress`,
  e exponha os códigos `ERR_*` em vez de adivinhar.

Veja [ARCHITECTURE.md](ARCHITECTURE.md) e
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) para os detalhes internos.

<!-- doc-footer -->

---

> _Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas; veja [CONTRIBUTING.md](CONTRIBUTING.md)._

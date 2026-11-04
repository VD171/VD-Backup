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
- Operações longas (`backup`, `restore`, `import`) retornam `{"ok":true,"opid":"..."}`
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
| `backup-info` | `{ref}` | `{ok,...}` todos os detalhes de um backup (versão, fonte de instalação, estado, data, modo, tamanho, itens, contagens de permissão, dispositivo) |
| `backup-icon` | `{ref}` | `{ok,icon}` PNG base64 do manifesto (funciona quando o app está desinstalado) |
| `delete-backup` | `{ref}` | `{ok,deleted}` (ref deve estar sob o diretório de backups) |
| `prune` | `{package,user?,keep}` | `{ok,pruned:[...]}` mantém os N mais recentes de um pacote |
| `log-read` | `{limit?}` | `{ok,entries:[...]}` log de auditoria, do mais recente para o mais antigo |
| `special-categories` | `{}` | `{ok,categories:[{id,available}]}` (messages/contacts/wifi/bluetooth) |
| `special-backup` | `{categories,compression?,password?,portable?}` | `{ok,opid}` backup de todo o sistema (destacada) |
| `special-restore` | `{ref,confirm:true,categories?,password?}` | `{ok,opid}` (precisa de reboot; `confirm` o protege) |
| `special-list` | `{}` | `{ok,backups:[{ref,created_at,categories}]}` |
| `sysmount-status` | `{}` | `{ok,nomount,nm,ksu,live_capable}` |
| `sysmount-add` / `sysmount-del` / `sysmount-list` | `{package,priv?}` | monta um app instalado como app de sistema (sub-módulo sem sistema; ao vivo via NoMount, senão no próximo boot) |
| `companion-status` / `companion-install` | `{}` | status do companheiro do Google Drive / instalação sob demanda |
| `dests-list` / `dest-add` / `dest-test` / `dest-del` | `{id,type,...}` | gerenciamento de destinos |
| `remote-add` / `remote-list` / `remote-del` | `{name,backend,params:{...}}` | gerenciamento de remotos rclone (cria a entrada `rclone.conf` para a qual um dest `type:"rclone"` aponta) |
| `schedule-set` / `schedule-list` / `schedule-delete` | `{id,package,mode,dest,cron,at,keep,items}` | jobs agendados |
| `scheduler-tick` | `{}` | roda jobs vencidos + aplica retenção + o observador de auto-backup (o heartbeat de boot chama isto) |

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

`restore`/`import` recebem `{ref}` (um dir de backup / ref de scan). `restore` também aceita:
`"items"` (um subconjunto dos tipos de item do backup a restaurar; omita para todos), `"test": true`
(extrai para um dir temporário e verifica, sem tocar no app vivo), `"mode"` para
snapshot/mirror, `"password"` para um backup criptografado, `"ssaid"` (opt-in), e as
opções de fonte de instalação `"spoof_installer"` (padrão vindo da config, define o instalador como a
Play Store no momento da instalação) e `"deep_spoof": true` (opt-in avançado; também forja o
pacote iniciador e a fonte do pacote editando o banco de pacotes, aplica-se após um
reboot). `import` recebe `"from": "neo" | "databackup"` e, para um backup Neo criptografado,
`"password"`.

### Args de `remote-add`

Um destino de nuvem é um dest `type:"rclone"` que nomeia um remoto `rclone`; crie
esse remoto primeiro com `remote-add`. Campos de senha são guardados obscurecidos, nunca em
claro. Valores `backend` suportados e seus `params`:

```
sftp   : host, port, user, pass           smb  : host, port, user, pass
ftp    : host, port, user, pass           webdav: url, vendor, user, pass
s3     : provider, access_key_id, secret_access_key, endpoint, region
drive  : token, scope                     (token = output of `rclone authorize "drive"`)
```

O Google Drive tem dois caminhos: este remoto `drive` (sem precisar de projeto Google Cloud, usa
o OAuth próprio do rclone - rode `rclone authorize "drive"` uma vez em qualquer computador e passe o
token) ou o app companheiro opt-in (seu próprio client id OAuth). Ambos terminam como destinos
comuns.

### Política de rede

O campo de config `network_policy` controla qual conexão as transferências de nuvem podem usar:
`any` (padrão), `wifi`, ou `mobile`. Defina-o com `config-set`. Quando for `wifi` ou
`mobile`, toda transferência de nuvem (upload Full `rclone`/Drive, sync Mirror, backup/restauração
de snapshot `restic` remoto, restauração Mirror) checa o transporte ativo primeiro e
aborta com `ERR_NET_POLICY` se não casar - tanto para jobs manuais quanto agendados.
Destinos locais nunca são gateados.

## Trilhos de segurança que seu agente deve respeitar

- **`ssaid` é estritamente opt-in (padrão desligado).** Ele faz backup / restaura o
  ANDROID_ID do dispositivo reescrevendo um arquivo de sistema; uma restauração se aplica só após um reboot, e
  o arquivo anterior é sempre salvo primeiro para rollback. Só envie `"ssaid": true`
  a pedido direto e deliberado do usuário - nunca por padrão.
- **Ações mutáveis (restore, delete, import) são destrutivas** e são logadas em uma
  trilha de auditoria local (`logs/audit.jsonl`). A restauração é fiel (apaga-depois-extrai), então
  ela reverte o app ao estado exato do backup. Confirme a intenção antes de chamá-las.
- **Nunca enfraqueça** a preservação (SELinux/uid/gid/modos/xattr) ou a regra do APK (APKs
  são sempre comprimidos, nunca criptografados a menos que `encrypt_apk` esteja setado).
- Trate a saída JSON como a fonte da verdade; cheque `ok`/`code`, faça poll de `progress`,
  e exponha os códigos `ERR_*` em vez de adivinhar.

Veja [ARCHITECTURE.md](../ARCHITECTURE.md) e
[FILE-STRUCTURE.md](FILE-STRUCTURE.md) para os detalhes internos.

---

*Esta documentação foi gerada com Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas - veja [CONTRIBUTING.md](../CONTRIBUTING.md).*

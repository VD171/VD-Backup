> **Languages:** [English](../../ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [Čeština](../cs/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [فارسی](../fa/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Bahasa Indonesia](../in/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · Português · [Русский](../ru/ARCHITECTURE.md) · [Svenska](../sv/ARCHITECTURE.md) · [ไทย](../th/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [中文](../zh/ARCHITECTURE.md)

---

# Arquitetura

O VDBackup é um módulo WebUI root. Ele tem três camadas: a **WebUI** (o que você vê),
o **backend shell** (o que faz o trabalho, como root) e os **binários embarcados**
(os arquivadores e transportes). Tudo roda já-root, então não há
prompt de permissão nem app companheiro para os recursos centrais.

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

## Pontos principais

- **Já root.** O processo do módulo é root, então o motor é shell puro. ~85% do
  trabalho é shell puro (`tar`/`zstd`/`age`/`pm`/`am`/`chown`/`chcon`/`rclone`/...).
- **Execução destacada.** Backup/restauração rodam via `setsid nohup`, como processo root
  independente. Fechar a WebUI não os interrompe; a UI se reata lendo
  `logs/progress-<opid>.json`.
- **Helper de framework (~15%).** Permissões granulares, AppOps, SSAID, StorageStats,
  ícones e Wi-Fi privilegiado precisam do framework Android. Uma pequena execução `dex` via
  `app_process` (sem app instalado) cuida disso, com fallback em shell.
- **Portabilidade.** Só formatos padrão; os backups abrem num PC sem este módulo.
- **O estado** vive em `/data/adb/vdbackup/` (config, jobs, destinos, credenciais
  cifradas, logs, staging). **Os backups** são gravados em armazenamento visível ao usuário e com
  credenciais cifradas em `/sdcard/VDBackup/` (`/data/media/<user>/VDBackup`, por usuário),
  não em `/data/adb` (que é cifrado pelo device e legível antes do primeiro desbloqueio).

## Garantia de compatibilidade

Um backup deve permanecer restaurável para sempre. Isto é regra rígida, não esforço de melhor caso.

**Escopo.** A garantia cobre backups gravados pela **v1.01 em diante** (o primeiro release
publicado oficialmente) e somente por versões publicadas oficialmente e lançadas. A v1.00 foi
um build só de teste e está explicitamente fora de escopo; builds pré-release e de
desenvolvimento não são cobertos. A partir do primeiro release público, a promessa abaixo é
absoluta:

- **Só formatos padrão.** Todo archive é um `tar` simples comprimido com `zstd`,
  `gzip` ou `lz4`, opcionalmente embrulhado com `age`. Não há container proprietário, então
  um backup pode ser aberto em qualquer PC com ferramentas comuns mesmo sem este módulo (veja
  `etc/RECOVERY.md`). Um formato que não podemos abandonar.
- **Metadados append-only.** `manifest.json` carrega `format_version`. O schema só
  cresce: campos podem ser *adicionados*, nunca removidos, renomeados ou reaproveitados. A restauração lê
  cada campo defensivamente (campos opcionais ausentes caem num padrão) e instala
  APKs e extrai archives pelo nome e extensão do arquivo, não assumindo um formato fixo de
  manifest.
- **Restauração compatível para frente.** A restauração nunca rejeita um backup por ser antigo, e um
  VDBackup mais antigo silenciosamente pula tipos de item que não conhece em vez de falhar. Um VDBackup mais novo
  portanto restaura qualquer backup mais antigo, e os archives em formato padrão permanecem
  restauráveis à mão de qualquer modo.

Em resumo: tudo que o VDBackup já escreveu, todo VDBackup futuro (e um PC comum)
ainda consegue restaurar. Mudar o formato de um jeito que quebre um backup anterior não é
permitido; novas capacidades são adicionadas atrás de `format_version` e de novos campos aditivos.

Para o design técnico completo (formato de archive, schema de metadados, pipelines, cripto,
destinos, importadores) os mantenedores guardam notas de design detalhadas; este arquivo é a
visão geral voltada aos colaboradores.

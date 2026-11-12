> **Languages:** [English](../BINARIES.md) · [العربية](../ar/BINARIES.md) · [Čeština](../cs/BINARIES.md) · [Deutsch](../de/BINARIES.md) · [Español](../es/BINARIES.md) · [فارسی](../fa/BINARIES.md) · [Français](../fr/BINARIES.md) · [हिन्दी](../hi/BINARIES.md) · [Bahasa Indonesia](../in/BINARIES.md) · [Italiano](../it/BINARIES.md) · [日本語](../ja/BINARIES.md) · [한국어](../ko/BINARIES.md) · [Nederlands](../nl/BINARIES.md) · [Polski](../pl/BINARIES.md) · Português · [Русский](../ru/BINARIES.md) · [Svenska](../sv/BINARIES.md) · [ไทย](../th/BINARIES.md) · [Türkçe](../tr/BINARIES.md) · [Tiếng Việt](../vi/BINARIES.md) · [中文](../zh/BINARIES.md)

---

# Binários embarcados: proveniência e auditoria

Privacidade e segurança não são opcionais no VDBackup. Uma ferramenta de backup roda como root sobre
os seus dados mais pessoais, então você precisa poder ver exatamente o que vem dentro dela. Esta
página documenta cada binário e biblioteca pré-compilados que o módulo carrega, de onde cada um vem,
e como verificar que nada opaco foi inserido às escondidas.

## Princípios

- **Nada opaco.** Cada binário e biblioteca distribuído é rastreável até um upstream público e
   nomeado, numa versão fixada, com um SHA-256 registrado. Nenhum blob é embarcado sem uma
  entrada que você possa conferir.
- **Buscado do upstream, nunca de um dispositivo.** As ferramentas nativas vêm do repositório
  oficial de pacotes do Termux (os arquivos `.deb` assinados em `packages.termux.dev/apt`), nunca
  copiadas de um Termux instalado em algum telefone. O build falha de forma ruidosa, ele nunca
  improvisa.
- **Reproduzível.** Refaça o build e você obtém os mesmos arquivos; rebusque as fontes fixadas
   e os valores de SHA-256 batem.
- **A trilha de auditoria viaja com o módulo.** Ela não está apenas no site, ela viaja
  dentro do módulo instalado, no seu dispositivo, para que você possa auditar offline.

## O que é distribuído, e de onde

| Artefato | Origem | Como é construído |
|---|---|---|
| ferramentas nativas em `bin/<abi>/` (`tar`, `zstd`, `gzip`, `lz4`, `jq`, `rclone`, `restic`, `rsync`, `ssh`/`scp`/`sftp`, `age`, `age-keygen`, `script`, `sqlite3`) + a closure de `lib/` delas | Repositório apt oficial do **Termux** (`packages.termux.dev/apt`), pacotes `.deb` oficiais | `.github/scripts/build_bin.sh` baixa os arquivos `.deb` + suas dependências transitivas, extrai-os, e copia os binários mais apenas as bibliotecas compartilhadas de que cada um precisa |
| `bin/<abi>/abx2xml`, `bin/<abi>/xml2abx` (fallback do conversor ABX) | Release do GitHub **rhythmcache/android-xml-converter** (`ABX_RELEASE`, ELF estático) | baixado da release fixada pelo `build_bin.sh` |
| `companion.apk` (companion opcional do Google Drive) | **Este repositório**, `companion/` (Gradle/Kotlin) | construído a partir do código pela CI e assinado com a chave do projeto; não é um blob pré-compilado |
| `vdbackup_helper.dex` (helper de framework) | **Este repositório**, `dex/src/` (Java) | compilado a partir do código pela CI com `javac` + `d8` |

Apenas as duas primeiras linhas são binários de terceiros pré-compilados; as duas últimas são
construídas a partir do código que vive neste repositório e pode ser lido e reconstruído.

> **Edições Full vs lite.** As edições lite omitem apenas `rclone` e `restic` (os dois
> maiores binários) para ficarem pequenas e os buscam sob demanda (verificados por SHA-256) na
> primeira vez que você usa um destino de nuvem ou o modo snapshot; `rsync` e `ssh`/`scp`/`sftp`
> continuam presentes, e todo o restante dos binários listados acima também está presente. As
> edições Full trazem `rclone` (provedores de nuvem) e `restic` (snapshots) embutidos, então
> nada é baixado.

## O manifesto no dispositivo: `PROVENANCE.json`

O `build_bin.sh` escreve um `bin/<abi>/PROVENANCE.json` por ABI. Na instalação o módulo
mantém apenas a ABI do seu dispositivo, de modo que esse arquivo permanece no dispositivo em
`/data/adb/modules/vdbackup/bin/<abi>/PROVENANCE.json`. Ele registra:

- `sources`: cada `.deb` upstream (pacote, versão, URL completa, SHA-256 do `.deb`) e
   a release do ABX (URL, SHA-256 do arquivo).
- `files`: cada arquivo efetivamente distribuído sob `bin/<abi>/` (caminho, tamanho, SHA-256).

Você pode lê-lo na WebUI (a aba **Sobre** aponta para ele) ou pela API do agente:

```sh
sh /data/adb/modules/vdbackup/helper.sh provenance '' | jq .
```

## Como verificar (passo a passo)

1. **Confira os arquivos distribuídos.** Calcule o hash de cada arquivo sob `bin/<abi>/` no seu
   dispositivo e compare com o `files[].sha256` no `PROVENANCE.json`:
   ```sh
   cd /data/adb/modules/vdbackup/bin/<abi>
   sha256sum tar zstd jq rclone ... lib/*
   ```
2. **Confira os arquivos contra o upstream.** Para cada entrada de `sources[]`, baixe o `.deb`
   fixado a partir da sua URL, confirme que o seu SHA-256 bate com `deb_sha256`, extraia-o, e confirme
   que os binários/bibliotecas que ele contém têm o mesmo hash dos distribuídos. Os arquivos `.deb` no
   repositório do Termux são eles mesmos servidos a partir do repositório apt assinado do Termux.
3. **Reconstrua do zero.** Rode você mesmo o `.github/scripts/build_bin.sh` (precisa apenas de
   `curl`, `ar`, `tar`, `xz`, `zstd`, `readelf`) e compare a saída com o que foi distribuído.
4. **Companion e dex.** Reconstrua `companion/` e `dex/` a partir do código; a assinatura do
   companion é a chave do projeto (SHA-256
   `F3:F8:2B:B9:2F:2C:69:A1:75:90:1D:40:BD:65:DD:A6:8F:2B:B5:88:69:77:F5:EA:8B:BA:AA:51:40:E5:25:2B`).

## Reportando

Se algum arquivo distribuído não corresponder à sua origem registrada, trate isso como um problema de
segurança e reporte (veja [SECURITY.md](SECURITY.md)). Este é exatamente o tipo de divergência que este
manifesto existe para tornar visível.

<!-- doc-footer -->

---

> _Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas; veja [CONTRIBUTING.md](CONTRIBUTING.md)._

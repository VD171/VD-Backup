> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · [Español](../es/CONTRIBUTING.md) · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · Português · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Українська](../uk/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Contribuindo com o VDBackup

Obrigado por ajudar! VDBackup foi pensado para ser fácil de contribuir. Este guia diz
onde as coisas ficam e as poucas convenções que seguimos.

## O projeto num relance

VDBackup é um **módulo WebUI KernelSU/APatch/Magisk**: scripts de shell + uma WebUI
em vanilla-JS + binários estáticos por-ABI. Nenhum app é necessário para os recursos principais. Veja
[ARCHITECTURE.md](ARCHITECTURE.md) e [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Ele é o **sucessor** aberto e root-native **do Swift Backup, Neo-Backup e
Android-DataBackup**: a união dos recursos deles sob AGPLv3, com importação de
backups existentes do Neo-Backup e do Android-DataBackup para que as pessoas possam migrar.

## Colaboradores de IA são bem-vindos

Assistentes e agentes de IA são colaboradores de primeira classe aqui, não um detalhe secundário.

- O projeto foi construído para ser legível por máquina: cada verbo do `helper.sh` imprime um único
  objeto JSON, a engine é shell POSIX puro, e o layout de arquivos está documentado em
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Um agente pode administrar **cada** conteúdo e ação do módulo de forma headless por meio
  dessa API JSON, a superfície de controle completa, verbos e salvaguardas estão em
  [docs/AI-AGENTS.md](AI-AGENTS.md).
- Patches assistidos por IA são revisados e aceitos nos mesmos termos de qualquer outro, por
  correção, clareza e as convenções abaixo, não por quem (ou o quê) os escreveu.
- Se você dirige o VDBackup a partir de um agente, use a saída JSON do `helper.sh` como o
  contrato; não raspe a WebUI.
- Mesma régua para todos: recursos reais nunca são enfraquecidos, segredos e dados do dispositivo
  nunca vão para o repo (veja o estrito [.gitignore](.gitignore)), e ações
  mutáveis seguem confirmadas e auditadas.

## Setup de dev

- Você precisa de um dispositivo/emulador rooteado (KernelSU, APatch ou Magisk) para testar.
- Monte o zip flashável: `cd module && zip -r9 ../VD-Backup-dev.zip .` e então flashe.
- A WebUI é `module/webroot/` (abra-a pelo gerenciador de root). O backend é
  `module/helper.sh` (dispatcher) e `module/worker.sh` (engine destacada).
- Binários nativos vivem em `module/bin/<abi>/` e são produzidos pela CI
  (`.github/scripts/build_bin.sh`); normalmente você não os recompila à mão.

## Convenções

- **Todo arquivo-fonte** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) começa com o
  cabeçalho banner do projeto (copie de qualquer arquivo existente). Sem exceções.
- **Código e comentários em inglês.** Mantenha os comentários mínimos e só onde necessário.
- **Sem em-dash ou en-dash**; sempre use um hífen simples `-`.
- A WebUI é **vanilla JS** (um `scripts.js`); sem frameworks. Fale com o root só por meio do
  wrapper `helper(verb, args)`, e escape cada valor interpolado.
- **Nunca enfraqueça** um recurso real (ex.: preservação de SELinux/uid/gid/modes).
- Ações mutáveis (restauração, exclusão) devem pedir confirmação e gravar um log de auditoria.

## Internacionalização (i18n)

- As strings da UI vivem em `module/webroot/lang/`. Inglês é o fallback canônico
  (`en.js` + `en.json`); os outros 20 idiomas são `<code>.json`.
- Para adicionar ou mudar uma string: edite `en.js` **e** `en.json`, depois atualize cada
  `<code>.json`. Mexer num label visível significa atualizar **todos** os arquivos de idioma e
  **todos** os `README.<code>.md`.
- Traduções são JSON puro, uma ótima primeira contribuição. Veja a lista de idiomas em
  `module/webroot/i18n.js`.

## Commits e PRs

- Mantenha os PRs focados. Descreva o quê e o porquê.
- Assine seus commits (DCO): `git commit -s` (adiciona `Signed-off-by:`).
- A CI deve ficar verde. Seja gentil nas revisões, veja [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Boas primeiras issues

Procure pelos labels `good first issue` e `help wanted`. Traduções, docs, novos
presets de destino `rclone` e polimento da WebUI são todos ótimos pontos de partida.

<!-- doc-footer -->

---

> _Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas; veja [CONTRIBUTING.md](CONTRIBUTING.md)._

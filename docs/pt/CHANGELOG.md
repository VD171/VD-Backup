> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · [Deutsch](../de/CHANGELOG.md) · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · Português · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Todas as mudanças relevantes do VDBackup estão documentadas aqui. Apenas em inglês.

## v1.06

Restauração:

- Restaurar um app por cima de uma instalação nova agora reetiqueta os dados dele para essa instalação. Os arquivos restaurados no armazenamento interno recebem as categorias SELinux da nova instalação, corrigindo um travamento em que o app tinha acesso negado aos próprios dados. Os arquivos restaurados no armazenamento externo (Android/data, Android/obb, Android/media) passam a pertencer ao novo app para que ele volte a conseguir lê-los em vez de travar ao iniciar. Vale para restaurações full, snapshot e mirror.

## v1.05

Confiabilidade:

- Backups em lote não param mais no meio quando você sai do app. Uma seleção inteira, um grupo de tags ou uma execução agendada agora é tocada por um único processo root destacado que continua com a WebUI fechada, e protegido de ser morto sob pressão de memória. O progresso reata quando você volta.

Configurações:

- Backup das configurações: exporte seus destinos, agendamentos, predefinições e credenciais salvas para um único arquivo criptografado e importe em outro aparelho ou após uma instalação limpa. O arquivo sempre pede uma frase-senha porque carrega senhas remotas, e a importação mescla no aparelho sem remover o que já existe.
- Agora você pode apagar as credenciais remotas salvas e a chave de criptografia do aparelho pelas Configurações em um passo, mantendo seus destinos, agendamentos e backups no lugar.

Segurança:

- Backups só podem ser guardados onde permanecem criptografados em repouso. Destinos em caminhos legíveis antes do primeiro desbloqueio, como /data/adb ou /data/system, são recusados.
- As credenciais salvas, o rclone.conf e a chave age agora ficam em armazenamento credential-encrypted, bloqueado até o primeiro desbloqueio, em vez de um local que era legível antes dele; uma atualização do módulo os move para lá de forma permanente.
- Os backups agora verificam o espaço livre antes de começar e param com uma mensagem clara em vez de falhar no meio.

Restauração:

- Restaurar um app que não está mais instalado agora reinstala o APK primeiro, e o diálogo de restauração oferece a opção de APK sempre que o backup tem um. Uma restauração que não consegue instalar o app reporta a falha em vez de fingir sucesso.
- Operações de app, permissão e configuração agora rodam num ambiente limpo, corrigindo erros "Failed transaction" que travavam restauração, app-ops e configurações em algumas ROMs.

Destinos:

- Você pode fazer backup em cartão SD ou pen drive USB: o seletor de pastas mostra um atalho para cada volume de armazenamento e aceita caminhos de mídia removível.

## v1.04

Correções:

- As pastas de backup agora continuam podendo ser abertas por um gerenciador de arquivos de forma automática: suas permissões são reaplicadas na instalação, a cada boot e toda vez que a WebUI abre, então uma pasta que ficou só para o dono (por exemplo um backup feito antes da v1.03.2) se conserta sozinha sem nenhum passo manual.

Privacidade:

- Quando você tem backups locais, a aba Backups agora te lembra de ocultar a pasta de backups com o SUSFS, assim como o app companheiro: a presença dela pode revelar root ou um bootloader desbloqueado. Quem oculta é o SUSFS; o lembrete só te indica o caminho.

Backups:

- Agora você pode definir quais itens cada app faz backup, por exemplo só APK, ou APK + OBB, aplicado em backups em massa, automáticos e agendados. Um backup manual individual ainda te deixa escolher na hora, pré-preenchido com o conjunto do app. Configure em Ajustes, ao lado da lista de apps excluídos.

- Presets de backup: salve conjuntos nomeados do que incluir e aplique com uma escolha no diálogo de backup.
- Multiusuário: backups de apps, backups especiais e restaurações agora seguem o usuário do Android que você escolher.
- Os apps voltam mais prontos e completos: seus perfis de compilação ART e as permissões de notification-listener, acessibilidade e isenção de bateria Doze são salvos e restaurados.
- Restaurações mais confiáveis: a propriedade dos arquivos e o contexto SELinux são re-derivados no aparelho de destino, então a restauração funciona entre aparelhos e usuários.
- Restaurações mais seguras: o Play Protect e o verificador de instalação são silenciados só durante o install e restaurados exatamente; o gerenciador root nunca é copiado nem restaurado; e a fonte de instalação é verificada e registrada.
- Tags de app: dê aos apps rótulos livres como games ou work, filtre a lista de apps por uma tag e faça backup de um grupo marcado inteiro de uma vez.

## v1.03.2

Correções:

- A página de login de nuvem no aparelho sempre mostrava "Sign-in failed", mesmo quando o login
  tinha dado certo. Agora mostra o resultado real.
- Backups salvos agora podem ser abertos num gerenciador de arquivos: as pastas de backup
  por app ficavam só para o dono, então nem um gerenciador root entrava; agora são
  acessíveis como o resto de /sdcard/VDBackup.

Destinos de nuvem:

- O app companion opcional do Google Drive agora é compilado e embarcado, então o Google
  Drive funciona pelo companion no aparelho (a conta do aparelho, sem colar token na mão)
  além do rclone.

Interface:

- O diálogo de backup tem um seletor de destino, então um backup pode ir para um destino de nuvem
  ou remoto escolhido sem precisar mudar antes o destino padrão nas Configurações.
- O app verifica se há uma versão mais nova ao abrir (no máximo 1 vez por hora) e mostra o aviso
  de atualização só quando há uma; fica silencioso se estiver atualizado ou offline.

## v1.03.1

Novo escopo de backup:

- Novas categorias de backup especial: calendário (o provider de calendário, mais uma
  exportação portátil `calendar.json`), papel de parede (papéis de parede da tela inicial e
  de bloqueio), DNS privado (modo e especificador) e configurações do sistema (o despejo
  completo das configurações system/global/secure). As configurações do sistema são opt-in e
  sobrescrevem as configurações de todo o dispositivo na restauração, então são protegidas
  como o SSAID, com consentimento explícito e uma entrada completa de auditoria.
- Backup avulso de pasta e arquivo: faça backup de qualquer caminho absoluto (armazenamento
  compartilhado ou dados de app) como um arquivo comprimido e selado por manifesto, e
  restaure-o para o mesmo caminho. A restauração exige uma confirmação explícita.

Restauração mais segura:

- Todo arquivo é verificado antes de qualquer escrita: um backup cujo conteúdo aponta para
  fora do seu alvo (um caminho absoluto ou um componente `..`) é recusado, de modo que uma
  restauração rodando como root não pode ser enganada a escrever fora do destino.

Progresso e agendamento:

- O progresso ao vivo agora mostra velocidade de transferência, ETA e um contador de itens
  durante os backups, além de uma etapa verificada por checksum para uploads de nuvem e uma
  pré-checagem de "espaço insuficiente".
- Jobs agendados podem ser condicionados: rodar apenas no Wi-Fi, apenas carregando, apenas
  acima de um nível de bateria, ou apenas em dias da semana escolhidos; um job agendado
  também é pulado enquanto o dispositivo está criticamente quente. Um job pulado tenta de
  novo no próximo tick.

Destinos de nuvem:

- Conecte qualquer backend rclone pela interface: a lista suspensa de remoto de nuvem
  oferece os provedores populares (Google Drive, Dropbox, OneDrive, Box, pCloud, Mega,
  Backblaze B2, S3, SFTP, WebDAV, FTP, SMB) mais uma opção "Custom (advanced)" onde você
  digita o nome de qualquer outro backend rclone e seus parâmetros `key=value`, de modo que
  todos os backends do rclone ficam acessíveis.
- Login no próprio dispositivo (sem PC): provedores que precisam de um login por navegador
  (Google Drive, Dropbox, OneDrive, Box, pCloud) têm um botão "Authorize in browser" que
  abre o próprio navegador do telefone na página de consentimento do provedor; depois que
  você aprova, você retorna ao app e o remoto é salvo automaticamente, com o token capturado
  no dispositivo. Colar um token à mão continua disponível como fallback.

Interface:

- Uma escala de interface ajustável (um controle deslizante arrastável) redimensiona toda a
  interface, de modo que ela sirva a telas de diferentes densidades de pixels; 100% é o padrão e
  permanece inalterado.
- A interface agora é renderizada da direita para a esquerda para árabe e persa.
- Um resumo inicial com contagens de backup e uma barra de armazenamento, selos de status,
  copiar hashes e caminhos para a área de transferência, interruptores de alternância no estilo
  Android, e uma ação "Check for updates".
- O log de atividades é uma tela cheia que abre instantaneamente, com uma ação "Export logs" que
  salva um arquivo de log que você pode anexar a um relatório.

Correções:

- A restauração e a importação não falham mais em dispositivos cujo `tar` embarcado não
  aceita a opção `--no-absolute-names`; a verificação de segurança do arquivo é independente
  dessa opção.
- "Check for updates" funciona mesmo onde nenhum cliente HTTP está embarcado, recorrendo ao
  rclone embarcado; e o log de atividades não demora mais para abrir.

## v1.01

Primeiro lançamento público. Um módulo WebUI para KernelSU/APatch/Magisk que faz backup e restaura
apps e seus dados inteiramente como root, sem prompt de concessão.

Engine e formatos:

- Engine de backup/restauração executada como processo root destacado (`setsid`): sobrevive ao fechamento
  da WebUI ou do gerenciador de root, e a interface reata ao progresso ao vivo pelo `opid`.
- Três modos de backup: Full (tar.zst, local ou remoto), Snapshot (repositório restic, criptografado
  e desduplicado) e Mirror (sincronização 1:1 rclone/rsync). Os APKs são sempre comprimidos,
  mesmo em um mirror.
- Itens por app: APK (base + splits), `data`, `data_de`, `obb`, externo e mídia.
  Contexto SELinux, uid/gid, modos e xattr/caps são preservados; a restauração usa uma
  sessão `pm install` e remapeia dono/contexto para o uid ativo.
- Ciente de múltiplos usuários (multi-user) de ponta a ponta. Os backups são armazenados em `/sdcard/VDBackup`
  (por usuário), fora de `/data/adb`, de modo que não são legíveis antes do primeiro desbloqueio; todo
  destino é isolado sob `<path>/vdbackup`.
- Compressão: nenhuma, lz4, zstd (níveis) ou gzip ("modo de compatibilidade"). Um manifesto JSON
  registra o dispositivo, o pacote (incluindo o rótulo do app), os itens e as permissões.
- Criptografia portátil com `age` (keygen), além de um guia de RECUPERAÇÃO no PC embutido em todo backup
  criptografado, para que ele possa ser descriptografado e extraído em qualquer lugar, sem o módulo.

Destinos e nuvem:

- Destinos: adicionar/listar/testar/excluir (local, remoto rclone, repositório restic e um companion
  opcional do Google Drive); as credenciais são armazenadas ofuscadas, nunca em claro.
- Criar remotos rclone pela interface/API (`remote-add`/`remote-list`/`remote-del`), de modo que qualquer
  backend de nuvem (SFTP, SMB, WebDAV, FTP, S3, Google Drive e mais) fique acessível sem
  editar `rclone.conf` à mão.
- Google Drive de duas formas: via rclone (sem conta Google Cloud) ou pelo app companion headless
  opcional (`ru.vd171.vdbackup`), que traz um aviso obrigatório de ocultação com [HMA-OSS](https://github.com/frknkrc44/HMA-OSS).
- Política de rede: escolher se as transferências de nuvem podem usar qualquer conexão, apenas Wi-Fi ou
  apenas dados móveis; aplicada a jobs manuais e agendados. Destinos locais são isentos.

Importação (migração):

- Importar do Neo-Backup, incluindo backups criptografados por senha (AES-256-GCM descriptografado pelo
  helper dex; a WebUI solicita a senha).
- Importar do Android-DataBackup (instalar APKs, extrair arquivos user/user_de/data, remapear).
- Ambos validados contra backups reais em vários dispositivos.

Integridade e segurança:

- Restauração fiel do tipo apagar-e-extrair; verificação sha256 por arquivo (padrão ligada no Full, e
  uma checagem de integridade do repositório no Snapshot), dry-run e restore-test. Os arquivos são relidos
  para verificar completude; um arquivo corrompido ou um nome de pacote inválido nunca podem disparar uma
  restauração destrutiva, e falhas de transferência remota são reportadas, nunca silenciosas.
- Restauração seletiva: restaure qualquer subconjunto dos itens que um backup contém (APK, data, dados
  protegidos, OBB, externo, mídia), todos selecionados por padrão.
- Apagar backups pela interface/API (`delete-backup`) e retenção keep-last-N para backups manuais
  (`prune`); toda exclusão, restauração, poda e execução agendada é gravada em um log de auditoria JSON
  local que você pode ver no app.
- Permissões de runtime e AppOps capturadas no manifesto e reaplicadas na restauração. A fonte de instalação
  (installerPackageName) e o estado habilitado/desabilitado também são capturados e reaplicados na restauração.
- Spoofing de fonte de instalação: por padrão um app restaurado reporta a Play Store como sua fonte de
  instalação (definida no momento da instalação via sessão de instalação, já que um app restaurado de outra
  forma parece sideloaded); alternável globalmente e por restauração, e quando desligado a fonte capturada é
  mantida. Um modo "deep" avançado e opt-in forja adicionalmente o pacote iniciador e a fonte do pacote
  editando o banco de pacotes do sistema (backup byte-exato antes, aplica-se após um reboot) para que o app
  pareça totalmente instalado pela loja.
- SSAID (ANDROID_ID do dispositivo): estritamente opt-in e sinalizado de forma proeminente; ciente de ABX; o
  arquivo ativo é sempre salvo byte a byte antes de qualquer sobrescrita, para rollback; aplica-se após um
  reboot.
- Restauração e importação exigem uma confirmação explícita de "isto sobrescreve os dados atuais do app"
  antes de prosseguir.

Agendamento e automação:

- Backups agendados com retenção keep-N, gerenciados a partir de uma aba Schedule (por app, diário/
  de hora em hora/semanal com um horário, modo e destino opcionais).
- Backup automático ao instalar ou atualizar: um observador opt-in aproveita o heartbeat do agendador,
  faz backup de apps novos ou atualizados em background, e só semeia na primeira execução, de modo que
  habilitá-lo nunca faz backup de tudo de uma vez. Respeita a configuração de apps excluídos (blocklist).

Backups especiais (de todo o sistema):

- Backup de mensagens (SMS/MMS), contatos e registro de chamadas, Wi-Fi e Bluetooth como dados de sistema
  crus e fielmente arquivados (a mesma preservação de SELinux/xattr e criptografia age opcional dos backups
  de app). A restauração é fiel no mesmo dispositivo/mesma ROM, exige reboot, e é protegida por um aviso
  destacado de sobrescrever-e-reiniciar.
- Exportação portátil opcional junto do arquivo cru: mensagens, registro de chamadas e contatos também são
  escritos como JSON abrível (lido com o sqlite3 embarcado direto dos bancos de dados do provider, de modo
  que corpos de mensagem com vírgulas ou quebras de linha sobrevivem intactos), dando uma cópia
  multi-dispositivo que não precisa do módulo. A cópia portátil também é criptografada quando o backup é
  criptografado, então ela nunca vaza o que o arquivo protege.

Integração com o sistema:

- Montar um app instalado como app de sistema sem tocar na partição /system real: o VDBackup prepara o(s)
  APK(s) do app em seu próprio sub-módulo de overlay, que o gerenciador de root monta. Com NoMount no
  KernelSU ele é injetado ao vivo (sem reboot); caso contrário ele se aplica no próximo boot, então nunca
  depende de o NoMount estar instalado. Escolha colocação comum ou privilegiada.

WebUI:

- A lista de apps mostra o nome real localizado do app (resolvido do APK, de modo que sobrevive a uma
  desinstalação) junto com o pacote, com ícones carregados sob demanda e em cache, renderizados como blocos
  arredondados e cientes de ícones adaptativos.
- Toque em um app para abrir seu histórico de backups e restaurar qualquer backup anterior; a aba Backups
  mostra nome e pacote em linhas separadas e abre uma folha de detalhes por backup (versão,
  fonte de instalação, estado, data, tamanho, itens, contagem de permissões, dispositivo).
- Filtre a lista de apps por usuário/sistema/todos e ordene por nome ou pacote; selecione vários apps
  e faça backup deles em um lote; exclua apps dos backups automáticos e agendados.
- Escolha o que incluir e alterne verify ou dry-run por backup; escolha uma restauração só-de-teste
  que extrai para staging sem tocar no app vivo.
- Tema claro/escuro, um seletor de cor de destaque, seletor de idioma, uma aba Sobre (com os
  projetos irmãos e o manifesto de auditoria dos binários embarcados), um seletor de pastas para
  o destino local, progresso de operação localizado com
  feedback instantâneo e diálogos modernos no app (sem pop-ups de alert/confirm do sistema).
- A navegação pelo botão Voltar retorna à aba anterior e fecha diálogos primeiro; os diálogos são
  flutuantes e o app sobrevive à reabertura reatando às operações ao vivo.

AI-friendly e i18n:

- Uma superfície de controle JSON documentada para que agentes administrem toda ação de forma headless
  (`docs/AI-AGENTS.md`); a WebUI é apenas um cliente dessa API.
- O README e toda a documentação do projeto são traduzidos para os 21 idiomas padrão
  (`docs/<lang>/`), com os docs espelhados no wiki.
- A listagem rica de apps e a descriptografia do Neo rodam através de um helper dex dirigido como root
  (`IPackageManager` via ServiceManager), de modo que funcionam onde o ActivityThread trava.

*Esta documentação foi gerada com Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas, veja [CONTRIBUTING.md](CONTRIBUTING.md).*

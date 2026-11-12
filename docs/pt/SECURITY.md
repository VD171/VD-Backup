> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · Português · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Política de Segurança

VDBackup roda como root e lida com os seus dados e (opcionalmente) suas credenciais e
senhas de criptografia. Levamos segurança a sério.

## Reportando uma vulnerabilidade

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **Tópico XDA:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Inclua uma descrição clara e, se possível, passos para reproduzir. Responderemos assim
que pudermos e daremos crédito a você se desejar.

## Notas de escopo

- Credenciais e senhas são armazenadas cifradas em repouso e nunca são gravadas em
  texto claro. Backups nunca são atrelados a chaves de hardware vinculadas ao dispositivo (para que permaneçam
  portáveis), o que também significa que a senha é o que protege um backup cifrado -
  escolha uma forte.
- Essas credenciais ficam em armazenamento credential-encrypted (`/data/misc_ce`), bloqueado até o primeiro desbloqueio após reiniciar, então nunca são legíveis antes desse desbloqueio, ao contrário de `/data/adb`. Uma atualização do módulo move cópias antigas para lá de forma permanente (verificando cada uma antes de remover a original), e elas persistem entre reinstalações.
- Um destino de backup local precisa permanecer criptografado em repouso: só é permitido armazenamento interno e removível do usuário, nunca `/data/adb`, `/data/system` ou outros caminhos legíveis antes do primeiro desbloqueio, e nunca um traversal `..`. Mídia removível SD/USB não é criptografada em repouso, então você é avisado (não bloqueado) para ligar a criptografia do backup nela.
- O app companheiro opcional do Google Drive deve sempre ser ocultado com o [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) para que ele não
  revele root ou um bootloader desbloqueado.
- A restauração roda como root, então todo pacote é verificado antes de qualquer coisa ser
  gravada: um backup cujo conteúdo aponte para fora do seu destino (um caminho absoluto ou
  um componente `..`) é recusado, e nenhum arquivo é extraído enquanto o pacote inteiro não
  for aprovado.
- Todo binário e biblioteca pré-compilados são rastreáveis até um upstream público fixado, com um
  SHA-256 registrado, e o manifesto é embarcado no dispositivo, de modo que o payload empacotado pode
  ser auditado e reproduzido. Veja [BINARIES.md](BINARIES.md).

<!-- doc-footer -->

---

> _Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas; veja [CONTRIBUTING.md](CONTRIBUTING.md)._

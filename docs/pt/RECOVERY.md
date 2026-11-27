> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../id/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · Português · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, recuperar um backup num PC (Windows / macOS / Linux)

Seus backups do VDBackup usam **formatos padrão**, então você pode abri-los em qualquer lugar,
sem este módulo. Uma pasta de backup contém um `manifest.json`, os APKs
(`*.apk.zst`) e os archives de dados (`<item>.tar.zst`, `.tar.gz` ou `.tar.lz4`),
opcionalmente cifrados com um `.age` final.

**Se os dados estiverem cifrados**, os metadados também são cifrados, então nada deles vaza
para quem tiver apenas os arquivos. A pasta então também contém `manifest.full.age` (o
manifesto completo) e dois pequenos arquivos `stub.*.age`. Nesse caso o `manifest.json` é
apenas um marcador fino e não sensível; os detalhes reais estão em `manifest.full.age`. Tudo
que é portátil (os archives de dados e o `manifest.full.age`) se decifra apenas com a sua
**senha** - veja o passo 1. Os arquivos `stub.dev.age` / `stub.pass.age` são apenas o cache de
listagem do módulo no dispositivo; você pode ignorá-los num PC.

## Ferramentas que você pode precisar

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`, Linux: `apt install zstd`)
- **age** (só para arquivos `.age`): https://github.com/FiloSottile/age/releases
- `tar` já vem embutido no macOS, Linux e no Windows 10/11 moderno.
- `gzip` já vem embutido em todo lugar, para `.tar.gz` você não precisa de nada extra.

## 1. Decifrar (só se o arquivo terminar com `.age`)

Senha (a forma portátil - funciona em qualquer PC apenas com a sua senha):

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Faça o mesmo para cada arquivo `*.age` (APKs e archives de dados). Se o backup estiver
cifrado, decifre o `manifest.full.age` da mesma forma para ler o manifesto completo:

```
age -d -o manifest.json  manifest.full.age    # the full, readable manifest
```

## 2. Descomprimir + extrair

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd lê lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

APKs são apenas arquivos APK (ZIP) comprimidos com zstd:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Notas

- Arquivos extraídos mantêm seus caminhos relativos, o contexto SELinux, uid/gid e modes
  estão dentro do tar (e são reaplicados adequadamente só quando você restaura no Android).
- `manifest.json` descreve exatamente o que cada arquivo é, a versão do app e o
  owner/contexto original. Ele é a fonte da verdade. Para um backup cifrado o manifesto
  completo é o `manifest.full.age` (decifre-o como no passo 1); o `manifest.json` em texto
  claro é apenas um pequeno marcador e não carrega nenhum dado sensível.
- Nada aqui é atrelado a um dispositivo específico: a mesma senha funciona em qualquer
  máquina.

<!-- doc-footer -->

---

> _Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas, veja [CONTRIBUTING.md](CONTRIBUTING.md)._

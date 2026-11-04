> **Languages:** [English](../../module/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · [Español](../es/RECOVERY.md) · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · Português · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup - recuperar um backup num PC (Windows / macOS / Linux)

Seus backups do VDBackup usam **formatos padrão**, então você pode abri-los em qualquer lugar,
sem este módulo. Uma pasta de backup contém um `manifest.json`, os APKs
(`*.apk.zst`) e os archives de dados (`<item>.tar.zst`, `.tar.gz` ou `.tar.lz4`),
opcionalmente cifrados com um `.age` final.

## Ferramentas que você pode precisar

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (só para arquivos `.age`): https://github.com/FiloSottile/age/releases
- `tar` já vem embutido no macOS, Linux e no Windows 10/11 moderno.
- `gzip` já vem embutido em todo lugar; para `.tar.gz` você não precisa de nada extra.

## 1. Decifrar (só se o arquivo terminar com `.age`)

Keyfile (recomendado):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Senha:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Faça o mesmo para cada arquivo `*.age` (APKs e archives de dados).

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

- Arquivos extraídos mantêm seus caminhos relativos; o contexto SELinux, uid/gid e modes
  estão dentro do tar (e são reaplicados adequadamente só quando você restaura no Android).
- `manifest.json` descreve exatamente o que cada arquivo é, a versão do app e o
  owner/contexto original. Ele é a fonte da verdade.
- Nada aqui é atrelado a um dispositivo específico: a mesma senha/keyfile funciona em qualquer
  máquina.

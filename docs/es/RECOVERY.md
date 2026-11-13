> **Languages:** [English](../../module/etc/RECOVERY.md) · [العربية](../ar/RECOVERY.md) · [Čeština](../cs/RECOVERY.md) · [Deutsch](../de/RECOVERY.md) · Español · [فارسی](../fa/RECOVERY.md) · [Français](../fr/RECOVERY.md) · [हिन्दी](../hi/RECOVERY.md) · [Bahasa Indonesia](../in/RECOVERY.md) · [Italiano](../it/RECOVERY.md) · [日本語](../ja/RECOVERY.md) · [한국어](../ko/RECOVERY.md) · [Nederlands](../nl/RECOVERY.md) · [Polski](../pl/RECOVERY.md) · [Português](../pt/RECOVERY.md) · [Русский](../ru/RECOVERY.md) · [Svenska](../sv/RECOVERY.md) · [ไทย](../th/RECOVERY.md) · [Türkçe](../tr/RECOVERY.md) · [Українська](../uk/RECOVERY.md) · [Tiếng Việt](../vi/RECOVERY.md) · [中文](../zh/RECOVERY.md)

---

# VDBackup, recuperar un backup en un PC (Windows / macOS / Linux)

Tus backups de VDBackup usan **formatos estándar**, así que puedes abrirlos en cualquier parte,
sin este módulo. Una carpeta de backup contiene un `manifest.json`, los APK
(`*.apk.zst`) y los archivos de datos (`<item>.tar.zst`, `.tar.gz` o `.tar.lz4`),
opcionalmente cifrados con una `.age` al final.

## Herramientas que podrías necesitar

- **zstd**: https://github.com/facebook/zstd/releases  (macOS: `brew install zstd`; Linux: `apt install zstd`)
- **age** (solo para archivos `.age`): https://github.com/FiloSottile/age/releases
- `tar` está integrado en macOS, Linux y Windows 10/11 modernos.
- `gzip` está integrado en todas partes; para `.tar.gz` no necesitas nada extra.

## 1. Descifrar (solo si el archivo termina en `.age`)

Keyfile (recomendado):

```
age -d -i age.key -o data.tar.zst  data.tar.zst.age
```

Frase de cifrado:

```
age -d -o data.tar.zst  data.tar.zst.age      # age will prompt for the passphrase
```

Haz lo mismo para cada archivo `*.age` (APK y archivos de datos).

## 2. Descomprimir + extraer

`.tar.zst`:

```
zstd -d data.tar.zst            # -> data.tar
tar  -xf data.tar               # extracts the files
```

`.tar.gz`:

```
tar -xzf data.tar.gz
```

`.tar.lz4` (zstd lee lz4):

```
zstd -d --format=lz4 data.tar.lz4 -o data.tar
tar  -xf data.tar
```

Los APK son solo archivos APK (ZIP) comprimidos con zstd:

```
zstd -d base.apk.zst            # -> base.apk  (a normal installable APK)
```

## Notas

- Los archivos extraídos conservan sus rutas relativas; el contexto SELinux, uid/gid y modos
  están dentro del tar (y se reaplican correctamente solo cuando restauras en Android).
- `manifest.json` describe exactamente qué es cada archivo, la versión de la app y el
  propietario/contexto original. Es la fuente de verdad.
- Nada aquí está atado a un dispositivo específico: la misma frase de cifrado/keyfile funciona en cualquier
  máquina.

<!-- doc-footer -->

---

> _Esta documentación se generó con Claude (Anthropic) y la mantiene VD171. Las correcciones y mejoras son bienvenidas; consulta [CONTRIBUTING.md](CONTRIBUTING.md)._

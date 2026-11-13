> **Languages:** [English](../../CONTRIBUTING.md) · [العربية](../ar/CONTRIBUTING.md) · [Čeština](../cs/CONTRIBUTING.md) · [Deutsch](../de/CONTRIBUTING.md) · Español · [فارسی](../fa/CONTRIBUTING.md) · [Français](../fr/CONTRIBUTING.md) · [हिन्दी](../hi/CONTRIBUTING.md) · [Bahasa Indonesia](../in/CONTRIBUTING.md) · [Italiano](../it/CONTRIBUTING.md) · [日本語](../ja/CONTRIBUTING.md) · [한국어](../ko/CONTRIBUTING.md) · [Nederlands](../nl/CONTRIBUTING.md) · [Polski](../pl/CONTRIBUTING.md) · [Português](../pt/CONTRIBUTING.md) · [Русский](../ru/CONTRIBUTING.md) · [Svenska](../sv/CONTRIBUTING.md) · [ไทย](../th/CONTRIBUTING.md) · [Türkçe](../tr/CONTRIBUTING.md) · [Українська](../uk/CONTRIBUTING.md) · [Tiếng Việt](../vi/CONTRIBUTING.md) · [中文](../zh/CONTRIBUTING.md)

---

# Contribuir a VDBackup

¡Gracias por ayudar! VDBackup está pensado para que sea fácil contribuir. Esta guía te dice
dónde vive cada cosa y las pocas convenciones que seguimos.

## El proyecto de un vistazo

VDBackup es un **módulo WebUI de KernelSU/APatch/Magisk**: scripts de shell + una WebUI
en vanilla-JS + binarios estáticos por ABI. No se requiere ninguna aplicación para las funciones principales. Ver
[ARCHITECTURE.md](ARCHITECTURE.md) y [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).

Es el **sucesor** abierto y root-native de **Swift Backup, Neo-Backup y
Android-DataBackup**: la unión de sus funciones bajo AGPLv3, con importación de
backups existentes de Neo-Backup y Android-DataBackup para que la gente pueda migrar.

## Colaboradores IA bienvenidos

Los asistentes y agentes de IA son colaboradores de primera clase aquí, no una idea tardía.

- El proyecto está construido para ser legible por máquina: cada verbo de `helper.sh` imprime un único
  objeto JSON, el motor es shell POSIX puro, y la disposición de archivos está documentada en
  [docs/FILE-STRUCTURE.md](FILE-STRUCTURE.md).
- Un agente puede administrar **todo** el contenido y acción del módulo de forma headless a través de
  esa API JSON, la superficie de control completa, los verbos y las barreras de seguridad están en
  [docs/AI-AGENTS.md](AI-AGENTS.md).
- Los parches asistidos por IA se revisan y aceptan en los mismos términos que cualquier otro, por
  corrección, claridad y las convenciones de abajo, no por quién (o qué) los escribió.
- Si manejas VDBackup desde un agente, usa la salida JSON de `helper.sh` como el
  contrato; no raspes la WebUI.
- La misma vara para todos: las funciones reales nunca se debilitan, los secretos y los datos del dispositivo
  nunca llegan al repo (ver el estricto [.gitignore](.gitignore)), y las acciones
  mutantes se mantienen confirmadas y auditadas.

## Configuración de desarrollo

- Necesitas un dispositivo/emulador rooteado (KernelSU, APatch o Magisk) para probar.
- Construye el zip flasheable: `cd module && zip -r9 ../VD-Backup-dev.zip .` y luego flashéalo.
- La WebUI es `module/webroot/` (ábrela desde el gestor de root). El backend es
  `module/helper.sh` (dispatcher) y `module/worker.sh` (motor desacoplado).
- Los binarios nativos viven en `module/bin/<abi>/` y los produce la CI
  (`.github/scripts/build_bin.sh`); normalmente no los reconstruyes a mano.

## Convenciones

- **Cada archivo fuente** (`.sh`, `.js`, `.css`, `.html`, `.svg`, `.yml`) empieza con el
  encabezado banner del proyecto (cópialo de cualquier archivo existente). Sin excepciones.
- **Código y comentarios en inglés.** Mantén los comentarios al mínimo y solo donde haga falta.
- **Sin em-dash ni en-dash**; usa siempre un guion simple `-`.
- La WebUI es **vanilla JS** (un solo `scripts.js`); sin frameworks. Habla con root solo a través del
  wrapper `helper(verb, args)`, y escapa cada valor interpolado.
- **Nunca debilites** una función real (p. ej. la preservación de SELinux/uid/gid/modos).
- Las acciones mutantes (restaurar, borrar) deben pedir confirmación y escribir un log de auditoría.

## Internacionalización (i18n)

- Las cadenas de la UI viven en `module/webroot/lang/`. El inglés es el fallback canónico
  (`en.js` + `en.json`); los otros 20 idiomas son `<code>.json`.
- Para añadir o cambiar una cadena: edita `en.js` **y** `en.json`, luego actualiza cada
  `<code>.json`. Tocar una etiqueta visible significa actualizar **todos** los archivos de idioma y
  **todos** los `README.<code>.md`.
- Las traducciones son JSON plano, una gran primera contribución. Ver la lista de idiomas en
  `module/webroot/i18n.js`.

## Commits y PRs

- Mantén los PRs enfocados. Describe qué y por qué.
- Firma tus commits (DCO): `git commit -s` (añade `Signed-off-by:`).
- La CI debe permanecer en verde. Sé amable en las revisiones, ver [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Buenas primeras tareas

Busca las etiquetas `good first issue` y `help wanted`. Las traducciones, la documentación, los nuevos
presets de destino de `rclone` y el pulido de la WebUI son todos grandes puntos de partida.

<!-- doc-footer -->

---

> _Esta documentación se generó con Claude (Anthropic) y la mantiene VD171. Las correcciones y mejoras son bienvenidas; consulta [CONTRIBUTING.md](CONTRIBUTING.md)._

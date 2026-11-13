#!/usr/bin/env python3
# ======================================================================
#  VD BACKUP  ::  root backup & restore, no grant prompt
#  Full app/data backup & restore as root - KernelSU/APatch/Magisk WebUI.
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: AGPL-3.0-or-later
#
#  Free software under the GNU AGPL v3 or later. NETWORK COPYLEFT: run a
#  modified version, even as a service, and you MUST offer its source.
#
#  Source         : https://github.com/VD171/VD-Backup
# ======================================================================
"""Maintain the `> **Languages:**` switcher header and the attribution footer
on the repository docs, in place (for the repo view; the wiki gets its own
switcher from gen_wiki.sh).

Why this exists: the English source of a doc may live in docs/, at the repo
root, or under module/etc, while every translation lives in docs/<lang>/. The
switcher's relative links therefore depend on where the English source sits.
This script encodes that layout once, so adding a language or a doc is a single
run with no hand-edited link math. Idempotent: the footer is sentinel-bounded
and the header is fully regenerated.

    python3 .github/scripts/gen-doc-nav.py [repo_root]
"""
import os
import re
import sys

ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()

# Ordered language set (code -> endonym). uk sits between tr and vi.
LANGS = ["en", "ar", "cs", "de", "es", "fa", "fr", "hi", "in", "it", "ja", "ko",
         "nl", "pl", "pt", "ru", "sv", "th", "tr", "uk", "vi", "zh"]
ENDONYM = {
    "en": "English", "ar": "العربية", "cs": "Čeština", "de": "Deutsch", "es": "Español",
    "fa": "فارسی", "fr": "Français", "hi": "हिन्दी", "in": "Bahasa Indonesia", "it": "Italiano",
    "ja": "日本語", "ko": "한국어", "nl": "Nederlands", "pl": "Polski", "pt": "Português",
    "ru": "Русский", "sv": "Svenska", "th": "ไทย", "tr": "Türkçe", "uk": "Українська",
    "vi": "Tiếng Việt", "zh": "中文",
}

# Doc base name -> directory of its English source, relative to the repo root.
# Translations always live in docs/<lang>/<DOC>.md. GitHub issue/PR templates
# carry no switcher, so they are not listed here.
HOME = {
    "USER-GUIDE": "docs", "AI-AGENTS": "docs", "ARCHITECTURE": "docs",
    "FILE-STRUCTURE": "docs", "BINARIES": "docs",
    "RECOVERY": "module/etc",
    "CONTRIBUTING": ".", "SECURITY": ".", "CHANGELOG": ".", "CODE_OF_CONDUCT": ".",
}

# Attribution footer, one per language. Proper nouns (Claude (Anthropic),
# VD171, CONTRIBUTING.md) stay as-is. English base docs live in docs/ but the
# English CONTRIBUTING.md is at the repo root, so the "en" link is ../; the
# locales keep theirs in docs/<lang>/ and link same-dir.
FOOTER = {
    "en": "_This documentation was generated with Claude (Anthropic) and is maintained by VD171. Corrections and improvements are welcome; see [CONTRIBUTING.md](../CONTRIBUTING.md)._",
    "ar": "_تم إنشاء هذا التوثيق باستخدام Claude (Anthropic) ويتولى صيانته VD171. التصحيحات والتحسينات مرحّب بها؛ راجع [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "cs": "_Tato dokumentace byla vytvořena pomocí Claude (Anthropic) a spravuje ji VD171. Opravy a vylepšení jsou vítány; viz [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "de": "_Diese Dokumentation wurde mit Claude (Anthropic) erstellt und wird von VD171 gepflegt. Korrekturen und Verbesserungen sind willkommen; siehe [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "es": "_Esta documentación se generó con Claude (Anthropic) y la mantiene VD171. Las correcciones y mejoras son bienvenidas; consulta [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "fa": "_این مستندات با Claude (Anthropic) تولید شده و توسط VD171 نگهداری می‌شود. اصلاحات و بهبودها خوش‌آمد است؛ به [CONTRIBUTING.md](CONTRIBUTING.md) مراجعه کنید._",
    "fr": "_Cette documentation a été générée avec Claude (Anthropic) et est maintenue par VD171. Les corrections et améliorations sont les bienvenues ; voir [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "hi": "_यह दस्तावेज़ Claude (Anthropic) से तैयार किया गया है और इसे VD171 द्वारा अनुरक्षित किया जाता है। सुधार और संशोधन का स्वागत है; देखें [CONTRIBUTING.md](CONTRIBUTING.md)।_",
    "in": "_Dokumentasi ini dibuat dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan dipersilakan; lihat [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "it": "_Questa documentazione è stata generata con Claude (Anthropic) ed è gestita da VD171. Correzioni e miglioramenti sono benvenuti; vedi [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "ja": "_このドキュメントは Claude (Anthropic) で生成され、VD171 によって保守されています。修正や改善を歓迎します。[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。_",
    "ko": "_이 문서는 Claude (Anthropic)로 생성되었으며 VD171이 유지 관리합니다. 수정 및 개선을 환영합니다. [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요._",
    "nl": "_Deze documentatie is gegenereerd met Claude (Anthropic) en wordt onderhouden door VD171. Correcties en verbeteringen zijn welkom; zie [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "pl": "_Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane; zobacz [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "pt": "_Esta documentação foi gerada com o Claude (Anthropic) e é mantida por VD171. Correções e melhorias são bem-vindas; veja [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "ru": "_Эта документация создана с помощью Claude (Anthropic) и поддерживается VD171. Исправления и улучшения приветствуются; см. [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "sv": "_Denna dokumentation genererades med Claude (Anthropic) och underhålls av VD171. Rättelser och förbättringar välkomnas; se [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "th": "_เอกสารนี้สร้างขึ้นด้วย Claude (Anthropic) และดูแลโดย VD171 ยินดีรับการแก้ไขและการปรับปรุง ดู [CONTRIBUTING.md](CONTRIBUTING.md)_",
    "tr": "_Bu belgeler Claude (Anthropic) ile oluşturulmuş olup VD171 tarafından yürütülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır; bkz. [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "uk": "_Ця документація створена за допомогою Claude (Anthropic) і підтримується VD171. Виправлення та покращення вітаються; див. [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "vi": "_Tài liệu này được tạo bằng Claude (Anthropic) và được duy trì bởi VD171. Chúng tôi hoan nghênh các chỉnh sửa và cải tiến; xem [CONTRIBUTING.md](CONTRIBUTING.md)._",
    "zh": "_本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎修正和改进；请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。_",
}
FOOTER_MARK = "<!-- doc-footer -->"


# ---- language switcher -------------------------------------------------
def _target(doc, home, cur, other):
    """Relative link from `cur`'s page to `other`'s page of the same doc."""
    if other == "en":
        if home == "docs":
            return "../%s.md" % doc if cur != "en" else None
        if home == ".":
            return "../../%s.md" % doc if cur != "en" else None
        return "../../%s/%s.md" % (home, doc) if cur != "en" else None
    # other is a translation, living in docs/<other>/
    if cur == "en":
        if home == "docs":
            return "%s/%s.md" % (other, doc)
        if home == ".":
            return "docs/%s/%s.md" % (other, doc)
        return "../../docs/%s/%s.md" % (other, doc)
    # cur is a translation too -> sibling under docs/
    return "../%s/%s.md" % (other, doc)


def nav_line(doc, home, cur):
    parts = []
    for l in LANGS:
        name = ENDONYM[l]
        if l == cur:
            parts.append(name)
        else:
            parts.append("[%s](%s)" % (name, _target(doc, home, cur, l)))
    return "> **Languages:** " + " · ".join(parts)


def strip_header(text):
    lines = text.split("\n")
    if lines and lines[0].startswith("> **Languages:**"):
        i = 1
        while i < len(lines) and lines[i].strip() == "":
            i += 1
        if i < len(lines) and lines[i].strip() == "---":
            i += 1
            while i < len(lines) and lines[i].strip() == "":
                i += 1
        return "\n".join(lines[i:])
    return text


# ---- footer ------------------------------------------------------------
def strip_footer(text):
    i = text.find(FOOTER_MARK)
    if i != -1:
        text = text[:i]
    text = text.rstrip("\n")
    lines = text.split("\n")
    while lines and lines[-1].strip() == "":
        lines.pop()
    if lines:
        last = lines[-1].strip()
        if "CONTRIBUTING.md" in last and (
                (last.startswith("*") and last.endswith("*")) or
                (last.startswith("> _") and last.endswith("_")) or
                (last.startswith("> *") and last.endswith("*"))):
            lines.pop()
            while lines and lines[-1].strip() == "":
                lines.pop()
            if lines and lines[-1].strip() == "---":
                lines.pop()
    return "\n".join(lines).rstrip("\n")


# ---- passes ------------------------------------------------------------
def set_nav(path, doc, home, cur):
    old = open(path, encoding="utf-8").read()
    body = strip_header(old).lstrip("\n")
    out = nav_line(doc, home, cur) + "\n\n---\n\n" + body
    if out != old:
        open(path, "w", encoding="utf-8").write(out)
        return True
    return False


def set_footer(path, lang):
    old = open(path, encoding="utf-8").read()
    out = strip_footer(old) + "\n\n" + FOOTER_MARK + "\n\n---\n\n> " + FOOTER[lang] + "\n"
    if out != old:
        open(path, "w", encoding="utf-8").write(out)
        return True
    return False


def main():
    nav = 0
    foot = 0
    # Switcher: the English home + every translation of each doc.
    for doc, home in HOME.items():
        base = os.path.join(ROOT, home, doc + ".md") if home != "." else os.path.join(ROOT, doc + ".md")
        if os.path.isfile(base):
            nav += set_nav(base, doc, home, "en")
        for l in LANGS:
            if l == "en":
                continue
            p = os.path.join(ROOT, "docs", l, doc + ".md")
            if os.path.isfile(p):
                nav += set_nav(p, doc, home, l)
    # Footer: every page under docs/ (English guides + all translations).
    docs = os.path.join(ROOT, "docs")
    for fn in sorted(os.listdir(docs)):
        p = os.path.join(docs, fn)
        if fn.endswith(".md") and os.path.isfile(p):
            foot += set_footer(p, "en")
    for l in sorted(os.listdir(docs)):
        d = os.path.join(docs, l)
        if os.path.isdir(d) and l in FOOTER:
            for fn in sorted(os.listdir(d)):
                if fn.endswith(".md"):
                    foot += set_footer(os.path.join(d, fn), l)
    print("gen-doc-nav: %d switcher(s), %d footer(s) updated" % (nav, foot), file=sys.stderr)


if __name__ == "__main__":
    main()

#!/usr/bin/env bash
# ======================================================================
#  VD BACKUP  ::  root backup & restore, no grant prompt
#  Full app/data backup & restore as root: KernelSU/APatch/Magisk WebUI.
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: AGPL-3.0-or-later
#
#  Free software under the GNU AGPL v3 or later. NETWORK COPYLEFT: run a
#  modified version, even as a service, and you MUST offer its source.
#
#  Site           : https://vd171.ru
#  Site           : https://vd.priv8.ru
#  Source         : https://github.com/VD171/VD-Backup
#  GitHub         : @VD171 https://github.com/VD171
#  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
#  XDA thread     : https://xdaforums.com/t/VD-Backup.4807267/
#  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
#  Channel        : @Priv8_VD https://t.me/Priv8_VD
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
# ======================================================================
#
#  Generate the project Wiki from docs/. Single source of generation, used by
#  both the GitHub wiki-sync workflow and the manual Forgejo wiki push, so both
#  wikis are byte-identical. docs/ stays the source of truth; this only renders
#  a Home, a _Sidebar and a Languages index around the mirrored pages.
#
#  Usage: gen_wiki.sh <docs_dir> <wiki_dir>

set -euo pipefail
SRC="${1:?usage: gen_wiki.sh <docs_dir> <wiki_dir>}"
WIKI="${2:?usage: gen_wiki.sh <docs_dir> <wiki_dir>}"
[ -d "$SRC" ] || { echo "no docs dir: $SRC" >&2; exit 1; }
mkdir -p "$WIKI"

# English docs (source of truth) -> top-level wiki pages (keep file names).
for f in "$SRC"/*.md; do
  [ -f "$f" ] || continue
  cp "$f" "$WIKI/$(basename "$f")"
done
# the screenshots gallery: copy it so the pages that embed it resolve. The wiki is
# flat, so every page sits at the wiki root and references screenshots/ there (the
# python pass below flattens ../screenshots and docs/screenshots to screenshots).
[ -d "$SRC/screenshots" ] && { rm -rf "$WIKI/screenshots"; cp -r "$SRC/screenshots" "$WIKI/screenshots"; }
# Many English docs live OUTSIDE docs/ (repo root, module/, .github/) while their
# translations are all under docs/<lang>/. Mirror every English source as a top-level
# page so each translated page has its English counterpart (and the Home links resolve).
ROOT_DIR="$(cd "$SRC/.." && pwd)"
en_src() {   # print the English source path for a doc base (empty if none)
  for _p in "$SRC/$1.md" "$ROOT_DIR/$1.md" "$ROOT_DIR/module/etc/$1.md" "$ROOT_DIR/.github/$1.md" "$ROOT_DIR/.github/ISSUE_TEMPLATE/$1.md"; do
    if [ -f "$_p" ]; then printf '%s' "$_p"; return 0; fi
  done
  return 0
}
# full doc-name set = what a reference language dir carries (plus any docs/*.md EN-only)
DOCS=""
for _d in "$SRC"/*/; do
  [ -d "$_d" ] || continue
  for _f in "$_d"*.md; do
    [ -f "$_f" ] || continue
    _b="$(basename "$_f" .md)"; case " $DOCS " in *" $_b "*) ;; *) DOCS="$DOCS $_b" ;; esac
  done
  break
done
for _f in "$SRC"/*.md; do
  [ -f "$_f" ] || continue
  _b="$(basename "$_f" .md)"; case " $DOCS " in *" $_b "*) ;; *) DOCS="$DOCS $_b" ;; esac
done
for _b in $DOCS; do
  _s="$(en_src "$_b")"
  if [ -n "$_s" ]; then cp "$_s" "$WIKI/$_b.md"; fi
done

# Translations in docs/<lang>/ -> "<lang>-<DOC>" pages.
for d in "$SRC"/*/; do
  [ -d "$d" ] || continue
  lang="$(basename "$d")"
  for f in "$d"*.md; do
    [ -f "$f" ] || continue
    cp "$f" "$WIKI/${lang}-$(basename "$f")"
  done
done

# --- helpers -------------------------------------------------------------
have() { [ -f "$WIKI/$1.md" ]; }
dlink() {   # <base> <lang-prefix-or-empty> <code> : a localized doc link for that language
  if [ -n "$2" ]; then _pg="$2-$1"; else _pg="$1"; fi
  [ -f "$WIKI/$_pg.md" ] || return 0
  echo "- [[$(doclabel "$1" "$3")|$_pg]]"
}
doclabel() {   # <base> <code> : the doc's own H1 title in that language (fallback: base name)
  if [ "$2" = en ]; then _df="$WIKI/$1.md"; else _df="$SRC/$2/$1.md"; fi
  if [ -f "$_df" ]; then
    _h="$(grep -m1 '^#\{1,\} ' "$_df" | sed -e 's/^#\{1,\}[[:space:]]*//' -e 's/&amp;/\&/g')"
    if [ -n "$_h" ]; then printf '%s' "$_h"; return 0; fi
  fi
  printf '%s' "$1"
}
tagline() {   # <code> : the localized one-line tagline lifted from that language's README
  if [ "$1" = en ]; then _rf="$ROOT_DIR/README.md"; else _rf="$ROOT_DIR/README.$1.md"; fi
  [ -f "$_rf" ] || return 0
  grep -o '<b>[^<]*</b>' "$_rf" | head -1 | sed -e 's/<[^>]*>//g' -e 's/&amp;/\&/g' -e 's/&lt;/</g' -e 's/&gt;/>/g'
}
# Home chrome, localized (section title / all-languages label / footer note).
t_doc() { case "$1" in
  en) printf Documentation ;; ar) printf '%s' "التوثيق" ;; cs) printf Dokumentace ;; de) printf Dokumentation ;;
  es) printf '%s' "Documentación" ;; fa) printf '%s' "مستندات" ;; fr) printf Documentation ;; hi) printf '%s' "दस्तावेज़ीकरण" ;;
  in) printf Dokumentasi ;; it) printf Documentazione ;; ja) printf '%s' "ドキュメント" ;; ko) printf '%s' "문서" ;;
  nl) printf Documentatie ;; pl) printf Dokumentacja ;; pt) printf '%s' "Documentação" ;; ru) printf '%s' "Документация" ;;
  sv) printf Dokumentation ;; th) printf '%s' "เอกสารประกอบ" ;; tr) printf Belgeler ;; vi) printf '%s' "Tài liệu" ;;
  zh) printf '%s' "文档" ;; esac; }
t_all() { case "$1" in
  en) printf '%s' "All languages" ;; ar) printf '%s' "كل اللغات" ;; cs) printf '%s' "Všechny jazyky" ;; de) printf '%s' "Alle Sprachen" ;;
  es) printf '%s' "Todos los idiomas" ;; fa) printf '%s' "همه زبان‌ها" ;; fr) printf '%s' "Toutes les langues" ;; hi) printf '%s' "सभी भाषाएँ" ;;
  in) printf '%s' "Semua bahasa" ;; it) printf '%s' "Tutte le lingue" ;; ja) printf '%s' "すべての言語" ;; ko) printf '%s' "모든 언어" ;;
  nl) printf '%s' "Alle talen" ;; pl) printf '%s' "Wszystkie języki" ;; pt) printf '%s' "Todos os idiomas" ;; ru) printf '%s' "Все языки" ;;
  sv) printf '%s' "Alla språk" ;; th) printf '%s' "ทุกภาษา" ;; tr) printf '%s' "Tüm diller" ;; vi) printf '%s' "Tất cả ngôn ngữ" ;;
  zh) printf '%s' "所有语言" ;; esac; }
t_foot() { case "$1" in
  en) printf '%s' "This wiki is generated from the repository's docs/ folder." ;;
  ar) printf '%s' "تُولَّد هذه الويكي من مجلد docs/ في المستودع." ;;
  cs) printf '%s' "Tato wiki se generuje ze složky docs/ v repozitáři." ;;
  de) printf '%s' "Dieses Wiki wird aus dem Ordner docs/ des Repositorys generiert." ;;
  es) printf '%s' "Esta wiki se genera a partir de la carpeta docs/ del repositorio." ;;
  fa) printf '%s' "این ویکی از پوشه docs/ مخزن تولید می‌شود." ;;
  fr) printf '%s' "Ce wiki est généré à partir du dossier docs/ du dépôt." ;;
  hi) printf '%s' "यह विकी रिपॉज़िटरी के docs/ फ़ोल्डर से जेनरेट होती है।" ;;
  in) printf '%s' "Wiki ini dihasilkan dari folder docs/ di repositori." ;;
  it) printf '%s' "Questa wiki è generata dalla cartella docs/ del repository." ;;
  ja) printf '%s' "このウィキはリポジトリの docs/ フォルダーから生成されます。" ;;
  ko) printf '%s' "이 위키는 저장소의 docs/ 폴더에서 생성됩니다." ;;
  nl) printf '%s' "Deze wiki wordt gegenereerd uit de map docs/ van de repository." ;;
  pl) printf '%s' "Ta wiki jest generowana z katalogu docs/ w repozytorium." ;;
  pt) printf '%s' "Esta wiki é gerada a partir da pasta docs/ do repositório." ;;
  ru) printf '%s' "Эта вики генерируется из папки docs/ репозитория." ;;
  sv) printf '%s' "Den här wikin genereras från mappen docs/ i arkivet." ;;
  th) printf '%s' "วิกินี้สร้างขึ้นจากโฟลเดอร์ docs/ ในที่เก็บโค้ด" ;;
  tr) printf '%s' "Bu viki, deponun docs/ klasöründen oluşturulur." ;;
  vi) printf '%s' "Wiki này được tạo từ thư mục docs/ trong kho lưu trữ." ;;
  zh) printf '%s' "本维基由仓库的 docs/ 文件夹生成。" ;; esac; }
NAV_LANGS="ar cs de es fa fr hi in it ja ko nl pl pt ru sv th tr vi zh"
endonym() { case "$1" in
  en) printf English ;; ar) printf '%s' "العربية" ;; cs) printf '%s' "Čeština" ;; de) printf Deutsch ;;
  es) printf '%s' "Español" ;; fa) printf '%s' "فارسی" ;; fr) printf '%s' "Français" ;; hi) printf '%s' "हिन्दी" ;;
  in) printf '%s' "Bahasa Indonesia" ;; it) printf Italiano ;; ja) printf '%s' "日本語" ;; ko) printf '%s' "한국어" ;;
  nl) printf Nederlands ;; pl) printf Polski ;; pt) printf '%s' "Português" ;; ru) printf '%s' "Русский" ;;
  sv) printf Svenska ;; th) printf '%s' "ไทย" ;; tr) printf '%s' "Türkçe" ;; vi) printf '%s' "Tiếng Việt" ;;
  zh) printf '%s' "中文" ;; esac; }
# Home-level language switcher: links each language's Home (current shown plain)
home_switcher() {
  _s="**Languages:**"
  for _hc in en $NAV_LANGS; do
    if [ "$_hc" = en ]; then _hp="Home"; else _hp="${_hc}-Home"; fi
    _nm="$(endonym "$_hc")"
    if [ "$_hc" = "$1" ]; then _s="$_s ${_nm} |"; else _s="$_s [${_nm}](${_hp}) |"; fi
  done
  printf '%s\n' "${_s% |}"
}

# Home (landing) per language: switcher + localized tagline + localized doc links.
write_home() {   # <code>
  _c="$1"
  if [ "$_c" = en ]; then _file="$WIKI/Home.md"; _px=""; else _file="$WIKI/${_c}-Home.md"; _px="$_c"; fi
  {
    home_switcher "$_c"; echo; echo "---"; echo
    echo "# VDBackup"
    echo
    _tl="$(tagline "$_c")"
    if [ -n "$_tl" ]; then echo "$_tl"; echo; fi
    echo "## $(t_doc "$_c")"
    echo
    dlink USER-GUIDE "$_px" "$_c"
    dlink AI-AGENTS "$_px" "$_c"
    dlink ARCHITECTURE "$_px" "$_c"
    dlink FILE-STRUCTURE "$_px" "$_c"
    dlink BINARIES "$_px" "$_c"
    dlink RECOVERY "$_px" "$_c"
    dlink CHANGELOG "$_px" "$_c"
    dlink CONTRIBUTING "$_px" "$_c"
    dlink CODE_OF_CONDUCT "$_px" "$_c"
    dlink SECURITY "$_px" "$_c"
    echo
    echo "$(t_all "$_c"): [[Languages]]"
    echo
    echo "> $(t_foot "$_c")"
  } > "$_file"
}
write_home en
for _c in $NAV_LANGS; do write_home "$_c"; done

# Sidebar: the key pages in a sensible order, then the Languages index.
{
  for b in USER-GUIDE AI-AGENTS ARCHITECTURE FILE-STRUCTURE BINARIES RECOVERY CHANGELOG CONTRIBUTING CODE_OF_CONDUCT SECURITY; do
    if have "$b"; then echo "- [[$b]]"; fi
  done
  echo "- [[Languages]]"
} > "$WIKI/_Sidebar.md"

# Languages: per language, link to each translated doc.
{
  echo "# Languages"
  echo
  for d in "$SRC"/*/; do
    [ -d "$d" ] || continue
    lang="$(basename "$d")"
    echo "## ${lang}"
    echo
    for f in "$d"*.md; do
      [ -f "$f" ] || continue
      b="$(basename "$f" .md)"
      echo "- [[${lang}-${b}]]"
    done
    echo
  done
} > "$WIKI/Languages.md"

# Per-page language switcher: prepend a "Languages:" line to every doc page linking
# the SAME document in each language it exists in (the current one shown plain).
# (NAV_LANGS and endonym() are defined above, shared with the Home switcher.)
# Emit a doc body with any leading repo language switcher stripped (the source .md now
# carry their own relative-path switcher for GitHub; the wiki injects its own page-link one).
doc_body() {   # <file>
  awk '
    NR==1 && $0 ~ /^> \*\*Languages:\*\*/ { drop=1; next }
    drop==1 { if ($0 ~ /^---[[:space:]]*$/) { drop=2 } next }
    drop==2 { if ($0 ~ /^[[:space:]]*$/ && !started) next; started=1; print; next }
    { print }
  ' "$1"
}
prepend_nav() {   # <file> <base> <current-code>
  _f="$1"; _base="$2"; _cur="$3"; _nav="**Languages:**"
  for _pc in en $NAV_LANGS; do
    if [ "$_pc" = en ]; then _page="$_base"; else _page="${_pc}-${_base}"; fi
    [ -f "$WIKI/$_page.md" ] || continue
    _name="$(endonym "$_pc")"
    if [ "$_pc" = "$_cur" ]; then _nav="$_nav ${_name} |"; else _nav="$_nav [${_name}](${_page}) |"; fi
  done
  _nav="${_nav% |}"
  _tmp="$WIKI/.nav.$$"; { printf '%s\n\n---\n\n' "$_nav"; doc_body "$_f"; } > "$_tmp" && mv "$_tmp" "$_f"
}
# every doc in the full set gets a language switcher on its English + translated pages
for _b in $DOCS; do
  case "$_b" in Home|_Sidebar|Languages) continue ;; esac
  if [ -f "$WIKI/$_b.md" ]; then prepend_nav "$WIKI/$_b.md" "$_b" en; fi
  for _c in $NAV_LANGS; do
    if [ -f "$WIKI/${_c}-${_b}.md" ]; then prepend_nav "$WIKI/${_c}-${_b}.md" "$_b" "$_c"; fi
  done
done

# Rewrite body cross-doc links (`](path/DOC.md#a)`) to wiki page links in the page's own
# language, so they resolve on the flat wiki (../foo.md does not work there). The language
# switcher already uses page links (no .md), so it is untouched by the .md pattern.
DOC_SET="$DOCS" NAV="$NAV_LANGS" python3 - "$WIKI" <<'PY'
import os, re, sys
wiki = sys.argv[1]
docs = os.environ["DOC_SET"].split()
langs = set(os.environ["NAV"].split())
rx = re.compile(r"\]\((?:[^)]*/)?(" + "|".join(re.escape(d) for d in docs) + r")\.md(#[^)]*)?\)")
for fn in os.listdir(wiki):
    if not fn.endswith(".md"):
        continue
    m = re.match(r"([a-z]{2})-", fn[:-3])
    pref = m.group(1) + "-" if (m and m.group(1) in langs) else ""
    p = os.path.join(wiki, fn)
    t = open(p, encoding="utf-8").read()
    nt = rx.sub(lambda mm: "](" + pref + mm.group(1) + (mm.group(2) or "") + ")", t)
    # flatten screenshot image paths (../screenshots, docs/screenshots -> screenshots)
    # so embedded images resolve from the flat wiki root.
    nt = re.sub(r"\]\((?:\.\./|docs/)*screenshots/", "](screenshots/", nt)
    if nt != t:
        open(p, "w", encoding="utf-8").write(nt)
PY

echo "wiki generated: $(ls "$WIKI"/*.md | wc -l) pages in $WIKI (with per-page language switcher)"

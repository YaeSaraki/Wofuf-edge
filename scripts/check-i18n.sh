#!/usr/bin/env bash
# =============================================================================
# i18n 检查：语言包完整性 + 硬编码中文扫描
#
#   scripts/check-i18n.sh
#
# 两个检查：
#   1. 语言包每条都得有 zh 和 en
#      - zh 不能为空
#      - en 不能「漏写」（键必须存在）；显式写 `en: ''` 算有意留空，只记账不失败
#   2. 用户可见的界面文案不许硬编码中文
#      - 扫 .vue 的 template/script 段与 .ts 文件，排除注释与 console 输出
#      - 语言包文件本身不扫（那里本来就该有中文）
#      - 现存的欠账走白名单（scripts/i18n-allowlist.txt），白名单长度就是欠账数
#
# 退出码：有检查失败 → 1；全部通过 → 0
# =============================================================================
set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ALLOWLIST="$PROJECT_ROOT/scripts/i18n-allowlist.txt"
FRONTEND_SRC="$PROJECT_ROOT/frontend/src"

step "i18n 检查"

if [ ! -d "$FRONTEND_SRC" ]; then
  die "找不到 $FRONTEND_SRC"
fi

if [ ! -f "$ALLOWLIST" ]; then
  die "找不到白名单 $ALLOWLIST"
fi

python3 - "$FRONTEND_SRC" "$ALLOWLIST" <<'PY'
import re
import sys
from pathlib import Path

src_root = Path(sys.argv[1])
allowlist_path = Path(sys.argv[2])

CJK = re.compile(r'[一-鿿]')
# 语言包文件：那里本来就该有中文
LANG_PACK = re.compile(r'(config/translation/|utils/i18n/translations\.ts$|shared/services/i18n/)')
# 用户可见的字符串字面量：'...' "..." `...`
STRING = re.compile(r"'([^'\\\n]*)'|\"([^\"\\\n]*)\"|`([^`\\]*)`")
# HTML 标签与属性值
TAG = re.compile(r'<[^>]*>')
ATTR = re.compile(r"""=\s*["']([^"']*)["']""")

failures: list[str] = []
debt: list[str] = []


def strip_comments(text: str, style: str) -> str:
    """按注释风格去掉注释，保留行结构（方便按行号定位）"""
    if style == 'line':
        return '\n'.join(re.sub(r'//.*$', '', line) for line in text.splitlines())
    if style == 'block':
        return re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    if style == 'html':
        return re.sub(r'<!--.*?-->', '', text, flags=re.S)
    return text


def vue_sections(text: str):
    """返回 (template 段, script 段) —— style 段不看，里面没有文案"""
    template = ''
    script = ''
    for m in re.finditer(r'<template>(.*?)</template>', text, flags=re.S):
        template += m.group(1) + '\n'
    for m in re.finditer(r'<script[^>]*>(.*?)</script>', text, flags=re.S):
        script += m.group(1) + '\n'
    return template, script


def drop_console_calls(text: str) -> str:
    """摘掉 console.xxx(...) 整个调用表达式（含参数里的中文）"""
    out = []
    i = 0
    while True:
        j = text.find('console.', i)
        if j == -1:
            out.append(text[i:])
            break
        out.append(text[i:j])
        k = text.find('(', j)
        if k == -1:
            break
        depth = 0
        p = k
        while p < len(text):
            if text[p] == '(':
                depth += 1
            elif text[p] == ')':
                depth -= 1
                if depth == 0:
                    break
            p += 1
        i = p + 1
    return ''.join(out)


def visible_cjk_lines(path: Path, text: str):
    """找出文件里「用户可见」的中文，返回 [片段]"""
    hits = []
    if path.suffix == '.vue':
        template, script = vue_sections(text)
        # 模板：文本节点（去掉标签后剩下的字）+ 属性值（placeholder / alt / title…）
        tpl = strip_comments(template, 'html')
        for chunk in TAG.sub(' ', tpl).split('\n'):
            if CJK.search(chunk):
                hits.append(chunk.strip())
        for m in ATTR.finditer(tpl):
            value = m.group(1)
            if CJK.search(value):
                hits.append(value.strip())
        # 脚本：字符串字面量
        chunks = [strip_comments(script, 'line')]
    else:
        chunks = [strip_comments(strip_comments(text, 'block'), 'line')]

    for content in chunks:
        for m in STRING.finditer(drop_console_calls(content)):
            literal = m.group(1) or m.group(2) or m.group(3) or ''
            if CJK.search(literal):
                hits.append(literal.strip())
    # 去重（同一句话可能在多个语句里出现），保持出现顺序
    seen = set()
    return [h for h in hits if not (h in seen or seen.add(h))]


def load_allowlist():
    entries = {}
    for raw in allowlist_path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if '|' not in line:
            failures.append(f'白名单格式不对（应为 路径 | 中文片段）：{raw}')
            continue
        path, snippet = line.split('|', 1)
        entries.setdefault(path.strip(), []).append(snippet.strip())
    return entries


allow = load_allowlist()

# ── 检查 1：语言包完整性 ─────────────────────────────────────────────────────
KEY = re.compile(r"['\"]?([A-Za-z0-9_.\-]+)['\"]?\s*:\s*\{")


def parse_entries(text: str):
    """按大括号配对切出每个条目，返回 [(key, 条目内容)]"""
    entries = []
    i = 0
    while True:
        m = KEY.search(text, i)
        if not m:
            break
        start = text.index('{', m.end() - 1)
        depth = 0
        j = start
        while j < len(text):
            if text[j] == '{':
                depth += 1
            elif text[j] == '}':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        entries.append((m.group(1), text[start + 1:j]))
        i = j + 1
    return entries


lang_packs = sorted(p for p in src_root.rglob('*.ts') if LANG_PACK.search(str(p)))
entry_total = 0
empty_en = []

for pack in lang_packs:
    text = pack.read_text(encoding='utf-8')
    rel = pack.relative_to(src_root.parent.parent)
    for key, body in parse_entries(text):
        entry_total += 1
        zh = re.search(r"\bzh\s*:\s*'([^']*)'|\bzh\s*:\s*\"([^\"]*)\"", body)
        en = re.search(r"\ben\s*:\s*'([^']*)'|\ben\s*:\s*\"([^\"]*)\"", body)
        # 注意：'' 是「有意留空」，不是「没写」—— 不能用 `or` 取值（空串是假值）
        zh_value = zh.group(1) if zh and zh.group(1) is not None else (zh.group(2) if zh else None)
        en_value = en.group(1) if en and en.group(1) is not None else (en.group(2) if en else None)
        if zh_value is None:
            failures.append(f'{rel}: 条目 {key} 没有 zh')
        elif not zh_value.strip():
            failures.append(f'{rel}: 条目 {key} 的 zh 是空的')
        if en_value is None:
            failures.append(f'{rel}: 条目 {key} 没有 en（漏写英文）')
        elif not en_value.strip():
            empty_en.append(f'{rel}: {key}')

# ── 检查 2：硬编码中文 ───────────────────────────────────────────────────────
sources = sorted(
    p for p in list(src_root.rglob('*.vue')) + list(src_root.rglob('*.ts'))
    if not LANG_PACK.search(str(p))
)

for path in sources:
    rel = str(path.relative_to(src_root.parent.parent))
    text = path.read_text(encoding='utf-8')
    for literal in visible_cjk_lines(path, text):
        allowed = any(snippet and snippet in literal for snippet in allow.get(rel, []))
        if allowed:
            debt.append(f'{rel}: {literal}')
        else:
            failures.append(f'{rel}: 硬编码中文「{literal}」')

# ── 白名单里已经不成立的条目（欠账还完了就删掉白名单行）─────────────────────
for rel, snippets in allow.items():
    path = src_root.parent.parent / rel
    if not path.exists():
        failures.append(f'白名单里的文件不存在了：{rel}')
        continue
    text = path.read_text(encoding='utf-8')
    for snippet in snippets:
        if snippet and snippet not in text:
            failures.append(f'白名单条目已失效（欠账还完了，删掉这行）：{rel} | {snippet}')

# ── 输出 ────────────────────────────────────────────────────────────────────
print(f'  语言包条目：{entry_total} 条（{len(lang_packs)} 个文件）')
if empty_en:
    print(f'  有意留空英文的条目 {len(empty_en)} 条：')
    for item in empty_en:
        print(f'    - {item}')
if debt:
    print(f'  白名单里的硬编码中文（欠账 {len(debt)} 处）：')
    for item in debt:
        print(f'    - {item}')

if failures:
    print()
    print(f'  ✗ {len(failures)} 项不通过：')
    for item in failures:
        print(f'    - {item}')
    sys.exit(1)

print('  ✓ i18n 检查全部通过')
PY

STATUS=$?
if [ "$STATUS" -ne 0 ]; then
  err "i18n 检查失败"
  exit 1
fi
ok "i18n 检查通过"

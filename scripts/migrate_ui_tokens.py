#!/usr/bin/env python3
"""
一次性迁移脚本：把 --bf-* token 与 .bf-* class 统一到 --ui-* / .ui-*。
（用完即弃，保留在仓库里是为了让这次重构可复现、可审计。）

用法：python3 scripts/migrate_ui_tokens.py [根目录]
"""
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()

# ---- token 映射：--bf-* → --ui-* --------------------------------------------
TOKEN_MAP = {
    "bg-primary": "bg",
    "bg-secondary": "surface",
    "bg-tertiary": "surface-sunken",
    "bg-elevated": "surface-raised",
    "bg-hover": "surface-hover",
    "text-primary": "text",
    "text-secondary": "text-secondary",
    "text-muted": "text-muted",
    "text-accent": "text-accent",
    "border-default": "border",
    "border-subtle": "border-subtle",
    "border-accent": "border-accent",
    "border": "border",
    "card-bg": "card-bg",
    "card-border": "card-border",
    "card-shadow-hover": "card-shadow-hover",
    "card-shadow": "card-shadow",
    "card-radius-sm": "card-radius-sm",
    "card-radius-lg": "card-radius-lg",
    "card-radius": "card-radius",
    "radius-sm": "radius-sm",
    "radius-md": "radius-md",
    "radius-lg": "radius-lg",
    "shadow-sm": "shadow-sm",
    "shadow-md": "shadow-md",
    "shadow-lg": "shadow-lg",
    "space-xs": "space-xs",
    "space-sm": "space-sm",
    "space-md": "space-md",
    "space-lg": "space-lg",
    "space-xl": "space-xl",
    "space-2xl": "space-2xl",
    "space-1": "space-1",
    "space-2": "space-2",
    "space-3": "space-3",
    "space-4": "space-4",
    "space-5": "space-5",
    "space-6": "space-6",
    "transition-fast": "transition-fast",
    "transition-normal": "transition-normal",
    "transition-slow": "transition-slow",
    "primary-light": "accent-light",
    "primary-dark": "accent-dark",
    "primary-glow": "accent-glow",
    "primary": "accent",
    "fire-gradient-subtle": "accent-gradient-subtle",
    "fire-gradient": "accent-gradient",
    "btn-primary-bg": "btn-primary-bg",
    "btn-primary-hover": "btn-primary-hover",
    "btn-secondary-bg": "btn-secondary-bg",
    "btn-secondary-hover": "btn-secondary-hover",
    "btn-radius": "btn-radius",
    "input-bg": "input-bg",
    "input-border": "input-border",
    "input-focus": "input-focus",
    "input-radius": "input-radius",
    "nav-bg": "nav-bg",
    "nav-blur": "nav-blur",
    "nav-border": "nav-border",
    "success-light": "success-light",
    "success-bg": "success-bg",
    "success": "success",
    "danger-light": "danger-light",
    "danger-bg": "danger-bg",
    "danger": "danger",
    "warning-light": "warning-light",
    "warning-bg": "warning-bg",
    "warning": "warning",
    "info-light": "info-light",
    "info-bg": "info-bg",
    "info": "info",
    "accent-light": "highlight-light",
    "accent": "highlight",
    "gradient-primary": "gradient-primary",
    "gradient-success": "gradient-success",
    "gradient-accent": "gradient-highlight",
    "surface-hover": "surface-hover",
    "surface-active": "surface-active",
    "surface": "surface-glass",
}

# 长的 key 优先，避免 --bf-primary 抢走 --bf-primary-light
KEYS = sorted(TOKEN_MAP, key=len, reverse=True)
TOKEN_RE = re.compile(r"--bf-(" + "|".join(re.escape(k) for k in KEYS) + r")(?![-\w])")

# ---- 要处理的文件 -----------------------------------------------------------
FILES = [
    "modules/app/components/AppNavbar.vue",
    "modules/players/components/advancements/AdvancementsPanel.vue",
    "modules/players/components/advancements/styles/adv-item.css",
    "modules/players/components/playerProfile/PlayerProfilePanel.vue",
    "modules/players/components/playerSearch/PlayerSearch.vue",
    "modules/players/components/statistics/StatisticsPanel.vue",
    "modules/players/components/yesterdayOnlineList/YesterdayOnlineList.vue",
]


def migrate(text: str) -> tuple[str, int, int]:
    text, n_token = TOKEN_RE.subn(lambda m: "--ui-" + TOKEN_MAP[m.group(1)], text)
    # token 迁完后，剩下的 bf- 都是 class 名
    text, n_class = re.subn(r"\bbf-", "ui-", text)
    return text, n_token, n_class


def main() -> None:
    total_t = total_c = 0
    for rel in FILES:
        path = ROOT / rel
        if not path.exists():
            print(f"  ! 缺失 {rel}")
            continue
        src = path.read_text(encoding="utf-8")
        out, n_t, n_c = migrate(src)
        if out != src:
            path.write_text(out, encoding="utf-8")
            print(f"  ✓ {rel}  token {n_t} / class {n_c}")
            total_t += n_t
            total_c += n_c
    print(f"\n合计：token {total_t} 处，class {total_c} 处")


if __name__ == "__main__":
    main()

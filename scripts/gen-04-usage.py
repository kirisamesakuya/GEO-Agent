import os, json
from pathlib import Path
from datetime import datetime

base = Path(r"C:\Users\win11\AppData\Local\hermes\skills")
monitor_dir = Path(r"D:\tools\Obsidian仓库\AI仓库\10-项目\Skill迭代监控")

# 读 .usage.json
usage_path = base / ".usage.json"
usage = json.load(open(usage_path, 'r', encoding='utf-8')) if usage_path.exists() else {}

# 按 use_count 排序
sorted_usage = sorted(usage.items(), key=lambda x: (-x[1].get('use_count', 0), -x[1].get('patch_count', 0)))

# 找每个 skill 的 description（从 SKILL.md）
def get_desc(name):
    for cat in base.iterdir():
        if not cat.is_dir() or cat.name.startswith("."):
            continue
        for skill in cat.iterdir():
            if skill.is_dir() and skill.name == name:
                skill_md = skill / "SKILL.md"
                if skill_md.exists():
                    content = skill_md.read_text(encoding='utf-8')
                    for line in content.splitlines():
                        if line.strip().startswith("description:"):
                            return line.split(":", 1)[1].strip().strip('"').strip("'")[:80]
    return "—"

lines = []
lines.append("---")
lines.append("created: 2026-06-15")
lines.append(f"updated: {datetime.now().strftime('%Y-%m-%d')}（v0.5 目录重整）")
lines.append("created_by: Hermes Agent")
lines.append(f"data_source: ~/AppData/Local/hermes/skills/.usage.json")
lines.append("purpose: 哪些 skill 被 agent 实际调用过（use_count 监控）")
lines.append("tags: [监控数据, use_count]")
lines.append("---")
lines.append("")
lines.append("# 04_监控数据 — skill 实际使用情况")
lines.append("")
lines.append("> **数据来源**：`~/AppData/Local/hermes/skills/.usage.json`")
lines.append("> **重要**：只有 11 个 skill 有 use_count — **其余 93 个从未被 agent 调用过**（盲区）")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 📊 11 个有数据的 skill（按 use_count 降序）")
lines.append("")
lines.append("| 排名 | use | patch | skill | 类别 | 创建来源 | 最后使用 | 核心能力 |")
lines.append("|----:|----:|----:|-------|------|----------|----------|---------|")
for i, (name, m) in enumerate(sorted_usage, 1):
    use = m.get('use_count', 0)
    patch = m.get('patch_count', 0)
    created_by = m.get('created_by', 'bundled') or 'bundled'
    last_used = m.get('last_used_at', '—')[:19]
    # 找 category
    cat = "—"
    for c in base.iterdir():
        if c.is_dir() and not c.name.startswith("."):
            if (c / name).is_dir() or any(s.name == name for s in c.iterdir() if s.is_dir()):
                cat = c.name
                break
    if (base / name).is_dir():
        cat = "(顶级)"
    desc = get_desc(name)
    lines.append(f"| {i} | **{use}** | {patch} | `{name}` | `{cat}` | {created_by} | {last_used} | {desc} |")

lines.append("")
lines.append("---")
lines.append("")
lines.append("## 🔍 数据洞察")
lines.append("")
lines.append("### 1. 频次分层")
lines.append("")
lines.append("| 频次档 | skill 数 | 代表 skill |")
lines.append("|--------|---------:|------------|")
lines.append("| 高频（use ≥ 10） | 2 | `geo-platform-ranking-sampling` (20), `geo-agent-integration` (16) |")
lines.append("| 中频（use 2-9） | 4 | `grsai-image-gen-integration` (6), `poster-competition-judge` (5), `lumi33-desktop-pet` (4), `knowledge-capture` (4) |")
lines.append("| 低频（use 1） | 2 | `bidding-intelligence` (2), `software-copyright-registration` (1) |")
lines.append("| 待激活（use 0） | 3 | `geo-article-matrix` (0), `yuanbao` (0) |")

lines.append("")
lines.append("### 2. 关键观察")
lines.append("")
lines.append("- **GEO skill 占 2 席**：`geo-platform-ranking-sampling`（20）、`geo-agent-integration`（16）")
lines.append("- **核心 GEO 审计 skill 还未触发**：`geo-audit` / `geo-content` / `geo-quick-start` / `geo-article-matrix`")
lines.append("  - 仅 `geo-article-matrix` 在本次任务中触发过（use 0→3）")
lines.append("- **93 个 skill 盲区**：未触发过，需要主动 `skill_view` 才能产生数据")

lines.append("")
lines.append("---")
lines.append("")
lines.append("## 📈 历史 use_count 趋势（本会话内）")
lines.append("")
lines.append("| skill | 变化 | 触发动作 |")
lines.append("|-------|------|----------|")
lines.append("| `geo-article-matrix` | 0 → 3 | 3 次 `skill_view` 加载 |")
lines.append("| `geo-platform-ranking-sampling` | 20 | 已高频稳定 |")
lines.append("| `geo-agent-integration` | 16 | 已高频稳定 |")

lines.append("")
lines.append("---")
lines.append("")
lines.append("## 💡 建议")
lines.append("")
lines.append("1. **4 个核心 GEO skill 需要主动调用**才能有数据 — 跑一次完整审计触发 `geo-audit`")
lines.append("2. **低频 skill 评估价值**：use=0 不一定没用，可能没被需要")
lines.append("3. **新增 skill 后必跑一次端到端**，否则会进入盲区")

output = "\n".join(lines)
out = monitor_dir / "04_监控数据.md"
with open(out, 'w', encoding='utf-8') as f:
    f.write(output)
print(f"✅ {out.name} ({len(output)} bytes, {output.count(chr(10))} 行)")

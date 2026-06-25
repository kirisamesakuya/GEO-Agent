import os
from pathlib import Path
from datetime import datetime

monitor_dir = Path(r"D:\tools\Obsidian仓库\AI仓库\10-项目\Skill迭代监控")

# 收集所有 .md 文件（包括子目录）
md_files = sorted(monitor_dir.rglob("*.md"))
md_files = [f for f in md_files if not any(p.startswith(".") for p in f.relative_to(monitor_dir).parts)]

# 文件说明（自动包含所有顶层文件）
file_descs = {
    "00_总览.md": "监控中心入口（3-5 屏看完）",
    "01_目录.md": "本文件 — 所有文档的 1 行索引",
    "02_GEO核心技能.md": "4 个核心 GEO skill 状态总览",
    "03_中英对照.md": "双语状态：哪些有 SKILL.en.md 英文备份",
    "04_监控数据.md": "11 个有 use_count 的 skill（监控数据）",
    "04_全量技能清单.md": "全量 104 个 skill 清单（按类别，只列 path）",
    "05_CHANGELOG.md": "迭代历史日志",
    "geo-audit/v1-原始/测试报告.md": "geo-audit v1 测试报告",
    "geo-audit/对比报告.md": "geo-audit v1 vs v2 vs v3 横向对比",
    "geo-quick-start/v1-原始/测试报告.md": "geo-quick-start v1 测试报告",
    "geo-quick-start/对比报告.md": "geo-quick-start v1 vs v2 vs v3 横向对比",
    "geo-content/v1-原始/测试报告.md": "geo-content v1 测试报告",
    "geo-content/对比报告.md": "geo-content v1 vs v2 vs v3 横向对比",
    "geo-article-matrix/v1-原始/测试报告.md": "geo-article-matrix v1 测试报告",
    "geo-article-matrix/v2-修正/测试报告.md": "geo-article-matrix v2 测试报告（1/5 改动完成）",
    "geo-article-matrix/对比报告.md": "geo-article-matrix v1 vs v2 vs v3 横向对比 ⭐",
}

lines = []
lines.append("---")
lines.append("created: 2026-06-15")
lines.append(f"updated: {datetime.now().strftime('%Y-%m-%d')}（v0.5 目录重整）")
lines.append("created_by: Hermes Agent")
lines.append("purpose: 所有 .md 文件的 1 行索引（不展开内容）")
lines.append("tags: [文件索引]")
lines.append("---")
lines.append("")
lines.append("# 01_目录 — 文件索引（点开看，不展开）")
lines.append("")
lines.append("> **本目录的原则**：每个文件 = 1 行说明，详情点开链接。**不**把正文复制到这里。")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 顶层文件（6 个）")
lines.append("")
lines.append("| 文件 | 说明 |")
lines.append("|------|------|")
for f in sorted(md_files):
    if len(f.relative_to(monitor_dir).parts) == 1:
        rel = f.name
        desc = file_descs.get(rel, "—")
        lines.append(f"| [[{rel}\\|{rel}]] | {desc} |")

lines.append("")
lines.append("---")
lines.append("")
lines.append("## GEO skill 迭代目录（4 个 skill × 3 个版本 + 1 个对比）")
lines.append("")
lines.append("| skill | v1-原始 | v2-修正 | v3-实战 | 对比报告 |")
lines.append("|-------|---------|---------|---------|----------|")
for skill in ["geo-audit", "geo-quick-start", "geo-content", "geo-article-matrix"]:
    v1 = "[[" + skill + "/v1-原始/测试报告\\|测试报告]]" if (monitor_dir / skill / "v1-原始/测试报告.md").exists() else "—"
    v2_path = monitor_dir / skill / "v2-修正/测试报告.md"
    v2 = "[[" + skill + "/v2-修正/测试报告\\|测试报告]]" if v2_path.exists() else "—"
    v3 = "[[" + skill + "/v3-实战/测试报告\\|测试报告]]" if (monitor_dir / skill / "v3-实战/测试报告.md").exists() else "—"
    cmp = "[[" + skill + "/对比报告\\|对比报告]]" if (monitor_dir / skill / "对比报告.md").exists() else "—"
    lines.append(f"| `{skill}` | {v1} | {v2} | {v3} | {cmp} |")

lines.append("")
lines.append("---")
lines.append("")
lines.append("## 相关链接（项目其他位置）")
lines.append("")
lines.append("- [[../GEO-Agent/UU教育_GEO审计报告_2026-06-15]] — v3 完整报告参考")
lines.append("- [[../GEO-Agent/审计数据/uu-edu-audit-2026-06-15.json]] — 结构化 JSON")
lines.append("- [[../../00-收件箱/2026-06-15_Hermes_Audit_UU教育]] — 收件箱索引")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 文件总数")
lines.append("")
lines.append(f"- **顶层 .md**：{sum(1 for f in md_files if len(f.relative_to(monitor_dir).parts) == 1)} 个")
lines.append(f"- **GEO skill 目录内 .md**：{sum(1 for f in md_files if len(f.relative_to(monitor_dir).parts) > 1)} 个")
lines.append(f"- **总计**：{len(md_files)} 个")

output = "\n".join(lines)
out = monitor_dir / "01_目录.md"
with open(out, 'w', encoding='utf-8') as f:
    f.write(output)
print(f"✅ {out.name} ({len(output)} bytes, {output.count(chr(10))} 行)")

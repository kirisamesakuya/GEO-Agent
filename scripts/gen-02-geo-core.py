import os
from pathlib import Path
from datetime import datetime

base = Path(r"C:\Users\win11\AppData\Local\hermes\skills")
monitor_dir = Path(r"D:\tools\Obsidian仓库\AI仓库\10-项目\Skill迭代监控")

# 收集所有 GEO 相关 skill
geo_related_names = {
    "geo-platform-ranking-sampling", "geo-audit", "geo-quick-start",
    "geo-content", "geo-article-matrix", "geo-report", "geo-report-pdf",
    "geo-schema", "geo-llmstxt", "geo-technical", "geo-platform-optimizer",
    "geo-crawlers", "geo-compare", "geo-brand-mentions", "geo-prospect",
    "geo-proposal", "geo-client-deliverables", "geo-citability",
    "geo-agent-integration",
}

# 4 个核心 skill（重点监控）
core_skills = ["geo-audit", "geo-quick-start", "geo-content", "geo-article-matrix"]

geo_skills = []
for cat in sorted(base.iterdir()):
    if not cat.is_dir() or cat.name.startswith("."):
        continue
    for skill in sorted(cat.iterdir()):
        if not skill.is_dir():
            continue
        skill_md = skill / "SKILL.md"
        if not skill_md.exists():
            continue
        if cat.name != 'geo' and skill.name not in geo_related_names:
            continue
        with open(skill_md, 'r', encoding='utf-8') as f:
            content = f.read()
        fm = {}
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                for line in parts[1].splitlines():
                    if ":" in line and not line.strip().startswith("-"):
                        k, v = line.split(":", 1)
                        fm[k.strip()] = v.strip().strip('"').strip("'")
        has_en_backup = (skill / "SKILL.en.md").exists()
        is_zh = any('\u4e00' <= c <= '\u9fff' for c in content[:2000])
        geo_skills.append({
            "category": cat.name,
            "name": fm.get("name", skill.name),
            "desc": fm.get("description", "")[:120],
            "path": f"{cat.name}/{skill.name}",
            "is_this_run": has_en_backup,
            "is_bundled_zh": not has_en_backup and is_zh,
            "is_core": fm.get("name", skill.name) in core_skills,
        })

geo_skills.sort(key=lambda x: (not x['is_core'], x['path']))

lines = []
lines.append("---")
lines.append("created: 2026-06-15")
lines.append(f"updated: {datetime.now().strftime('%Y-%m-%d')}（v0.5 目录重整）")
lines.append("created_by: Hermes Agent")
lines.append("purpose: 4 个核心 GEO skill 状态 + 17 个 GEO 相关 skill 一览")
lines.append("tags: [GEO, 核心技能, 监控]")
lines.append("---")
lines.append("")
lines.append("# 02_GEO核心技能")
lines.append("")
lines.append("> **GEO 相关 skill 共 18 个**（4 个核心 + 14 个辅助）。**只关心 4 个核心**，其他了解即可。")
lines.append("> **看正文请去**：`~/AppData/Local/hermes/skills/<category>/<name>/SKILL.md`")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## ⭐ 4 个核心 skill（迭代监控对象）")
lines.append("")
lines.append("| skill | 职责 | v1 测试 | v2 状态 | 关键问题 |")
lines.append("|-------|------|---------|---------|----------|")
core_data = {
    "geo-audit": {
        "职责": "主审计入口（5 路并行子代理）",
        "v2 状态": "未开始",
        "关键问题": "缺第 6 路 AI 引擎实测",
    },
    "geo-quick-start": {
        "职责": "售前/快速检测",
        "v2 状态": "未开始",
        "关键问题": "模式 B 与 geo-audit 重复",
    },
    "geo-content": {
        "职责": "内容 E-E-A-T 评估",
        "v2 状态": "未开始",
        "关键问题": "v1 只能评估不能生产",
    },
    "geo-article-matrix": {
        "职责": "文章矩阵生产（AI 引用）",
        "v2 状态": "1/5 改动完成",
        "关键问题": "缺实例文章/监测脚本/规则 rubric",
    },
}
for s in geo_skills:
    if s['is_core']:
        v1 = "[[" + s['name'] + "/v1-原始/测试报告\\|v1 报告]]" if (monitor_dir / s['name'] / "v1-原始/测试报告.md").exists() else "—"
        data = core_data.get(s['name'], {})
        lines.append(f"| `{s['name']}` | {data.get('职责', '—')} | {v1} | {data.get('v2 状态', '—')} | {data.get('关键问题', '—')} |")

lines.append("")
lines.append("---")
lines.append("")
lines.append("## 🔧 14 个 GEO 辅助 skill（不参与迭代，了解即可）")
lines.append("")
lines.append("| skill | 核心能力 | 双语 | 位置 |")
lines.append("|-------|---------|------|------|")
for s in geo_skills:
    if not s['is_core']:
        lang = "🀄" if (s['is_this_run'] or s['is_bundled_zh']) else "🌐"
        path_short = s['path'][:50] + "..." if len(s['path']) > 50 else s['path']
        lines.append(f"| `{s['name']}` | {s['desc'][:60]} | {lang} | `~/{path_short}/SKILL.md` |")

lines.append("")
lines.append("---")
lines.append("")
lines.append("## 📊 双语状态汇总（18 个 GEO skill）")
lines.append("")
this_run_n = sum(1 for s in geo_skills if s['is_this_run'])
bundled_n = sum(1 for s in geo_skills if s['is_bundled_zh'])
en_n = sum(1 for s in geo_skills if not s['is_this_run'] and not s['is_bundled_zh'])
lines.append(f"- 本次翻译：{this_run_n} 个")
lines.append(f"- 原有中文：{bundled_n} 个")
lines.append(f"- 剩余英文：{en_n} 个")
lines.append(f"- **总计：{len(geo_skills)} 个**（4 核心 + 14 辅助）")
lines.append("")
lines.append("完整双语对照见 [[03_中英对照]]")

output = "\n".join(lines)
out = monitor_dir / "02_GEO核心技能.md"
with open(out, 'w', encoding='utf-8') as f:
    f.write(output)
print(f"✅ {out.name} ({len(output)} bytes, {output.count(chr(10))} 行)")

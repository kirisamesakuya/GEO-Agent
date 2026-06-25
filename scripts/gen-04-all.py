import os
from pathlib import Path
from datetime import datetime
from collections import defaultdict

base = Path(r"C:\Users\win11\AppData\Local\hermes\skills")
monitor_dir = Path(r"D:\tools\Obsidian仓库\AI仓库\10-项目\Skill迭代监控")

# 收集所有 skill
all_skills = []
for cat in sorted(base.iterdir()):
    if not cat.is_dir() or cat.name.startswith("."):
        continue
    for skill in sorted(cat.iterdir()):
        if not skill.is_dir():
            continue
        skill_md = skill / "SKILL.md"
        if not skill_md.exists():
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
        all_skills.append({
            "category": cat.name,
            "name": fm.get("name", skill.name),
            "path": f"{cat.name}/{skill.name}",
            "is_this_run": has_en_backup,
            "is_bundled_zh": not has_en_backup and is_zh,
        })

# 按 category 分组
by_cat = defaultdict(list)
for s in all_skills:
    by_cat[s['category']].append(s)

lines = []
lines.append("---")
lines.append("created: 2026-06-15")
lines.append(f"updated: {datetime.now().strftime('%Y-%m-%d')}（v0.5 目录重整）")
lines.append("created_by: Hermes Agent")
lines.append("purpose: 全量 104 个 skill 路径索引（按类别分组，**只列 path 不展开 desc**）")
lines.append("tags: [全量清单, skill 索引]")
lines.append("---")
lines.append("")
lines.append("# 04_全量技能清单")
lines.append("")
lines.append("> **本目录只列路径和状态**——想看正文去 `~/AppData/Local/hermes/skills/<cat>/<name>/SKILL.md`")
lines.append("> **关注重点**：[02_GEO核心技能](02_GEO核心技能.md) 里的 4 个核心 skill（其他了解即可）")
lines.append("> **图例**：🀄 本次翻译 | ⓘ 原有中文 | 空白 = 英文（暂无）")
lines.append("")
lines.append("---")
lines.append("")
lines.append(f"## 总览：{len(all_skills)} 个 skill")
lines.append("")
for cat in sorted(by_cat.keys()):
    skills_list = by_cat[cat]
    this_run_n = sum(1 for s in skills_list if s['is_this_run'])
    bundled_n = sum(1 for s in skills_list if s['is_bundled_zh'])
    en_n = len(skills_list) - this_run_n - bundled_n
    lines.append(f"### 📁 {cat}（{len(skills_list)} 个 — 🀄 {this_run_n} | ⓘ {bundled_n} | 英文 {en_n}）")
    lines.append("")
    lines.append("| 状态 | skill 路径 |")
    lines.append("|------|----------|")
    for s in sorted(skills_list, key=lambda x: x['name']):
        if s['is_this_run']:
            lang = "🀄"
        elif s['is_bundled_zh']:
            lang = "ⓘ"
        else:
            lang = " "
        lines.append(f"| {lang} | `~/{s['path']}/SKILL.md` |")
    lines.append("")

lines.append("---")
lines.append("")
lines.append("## 💡 使用说明")
lines.append("")
lines.append("```bash")
lines.append("# 看某个 skill 的中文版正文")
lines.append("cat ~/AppData/Local/hermes/skills/geo/geo-audit/SKILL.md")
lines.append("")
lines.append("# 看某个 skill 的英文备份（如果存在）")
lines.append("cat ~/AppData/Local/hermes/skills/geo/geo-audit/SKILL.en.md")
lines.append("")
lines.append("# 在 Hermes 中加载 skill")
lines.append("skill_view(name=\"geo-audit\")")
lines.append("```")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 相关索引")
lines.append("")
lines.append("- [[02_GEO核心技能]] — 4 个核心 GEO skill 详解")
lines.append("- [[03_中英对照]] — 双语状态 + 英文备份位置")
lines.append("- [[04_监控数据]] — 11 个有 use_count 的 skill")

output = "\n".join(lines)
out = monitor_dir / "04_全量技能清单.md"
with open(out, 'w', encoding='utf-8') as f:
    f.write(output)
print(f"✅ {out.name} ({len(output)} bytes, {output.count(chr(10))} 行)")

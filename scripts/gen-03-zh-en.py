import os
from pathlib import Path
from datetime import datetime

base = Path(r"C:\Users\win11\AppData\Local\hermes\skills")
monitor_dir = Path(r"D:\tools\Obsidian仓库\AI仓库\10-项目\Skill迭代监控")

# 收集所有有 SKILL.en.md 备份的 skill（即本次翻译的）
this_run_skills = []
for cat in sorted(base.iterdir()):
    if not cat.is_dir() or cat.name.startswith("."):
        continue
    for skill in sorted(cat.iterdir()):
        if not skill.is_dir():
            continue
        skill_md = skill / "SKILL.md"
        en_backup = skill / "SKILL.en.md"
        if not (skill_md.exists() and en_backup.exists()):
            continue
        with open(skill_md, 'r', encoding='utf-8') as f:
            content = f.read()
        # 提取 description
        desc = ""
        for line in content.splitlines():
            if line.strip().startswith("description:"):
                desc = line.split(":", 1)[1].strip().strip('"').strip("'")
                break
        this_run_skills.append({
            "category": cat.name,
            "name": skill.name,
            "desc": desc[:80],
            "path": f"{cat.name}/{skill.name}",
            "sk_size": skill_md.stat().st_size,
            "en_size": en_backup.stat().st_size,
        })

# 收集原有中文 skill（无 SKILL.en.md 备份但有中文）
bundled_skills = []
for cat in sorted(base.iterdir()):
    if not cat.is_dir() or cat.name.startswith("."):
        continue
    for skill in sorted(cat.iterdir()):
        if not skill.is_dir():
            continue
        skill_md = skill / "SKILL.md"
        if not skill_md.exists():
            continue
        if (skill / "SKILL.en.md").exists():
            continue
        content = skill_md.read_text(encoding='utf-8')
        if any('\u4e00' <= c <= '\u9fff' for c in content[:2000]):
            with open(skill_md, 'r', encoding='utf-8') as f:
                full_content = f.read()
            desc = ""
            for line in full_content.splitlines():
                if line.strip().startswith("description:"):
                    desc = line.split(":", 1)[1].strip().strip('"').strip("'")
                    break
            bundled_skills.append({
                "category": cat.name,
                "name": skill.name,
                "desc": desc[:80],
                "path": f"{cat.name}/{skill.name}",
            })

# 按 category 分类
from collections import defaultdict
by_cat_this = defaultdict(list)
for s in this_run_skills:
    by_cat_this[s['category']].append(s)
by_cat_bundled = defaultdict(list)
for s in bundled_skills:
    by_cat_bundled[s['category']].append(s)

lines = []
lines.append("---")
lines.append("created: 2026-06-15")
lines.append(f"updated: {datetime.now().strftime('%Y-%m-%d')}（v0.5 目录重整）")
lines.append("created_by: Hermes Agent")
lines.append("purpose: 哪些 skill 翻译了 + 英文备份位置")
lines.append("tags: [双语, SKILL.en.md, 索引]")
lines.append("---")
lines.append("")
lines.append("# 03_中英对照 — 双语状态索引")
lines.append("")
lines.append("> **只看路径和状态，不展开正文。**")
lines.append("> **正文位置**：`~/AppData/Local/hermes/skills/<cat>/<name>/SKILL.md`（中文）/ `SKILL.en.md`（英文备份）")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 📊 总览")
lines.append("")
lines.append(f"- **本次翻译**（有 SKILL.en.md 备份）：**{len(this_run_skills)} 个**")
lines.append(f"- **原有中文**（bundled，无备份）：**{len(bundled_skills)} 个**")
lines.append(f"- **总计**：{len(this_run_skills) + len(bundled_skills)} 个")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 🆕 本次翻译（74 个 — 有 SKILL.en.md 备份）")
lines.append("")
lines.append("> **翻译方法**：方案 A 替换法 —— `cp 原 SKILL.md → SKILL.en.md` 备份，**再写中文版到原 SKILL.md**。")
lines.append("> **回滚方法**：删除 `SKILL.md` 中文版，`mv SKILL.en.md SKILL.md` 还原。")
lines.append("")
lines.append("### 按类别")
lines.append("")
for cat in sorted(by_cat_this.keys()):
    skills_list = by_cat_this[cat]
    lines.append(f"#### 📁 {cat}（{len(skills_list)} 个）")
    lines.append("")
    lines.append("| skill | 中文 SKILL.md | 英文 SKILL.en.md |")
    lines.append("|-------|--------------|------------------|")
    for s in sorted(skills_list, key=lambda x: x['name']):
        lines.append(f"| `{s['name']}` | `{s['sk_size']:>5d} B` | `{s['en_size']:>5d} B` |")
    lines.append("")

lines.append("---")
lines.append("")
lines.append("## 📦 原有中文（30 个 — bundled，无备份）")
lines.append("")
lines.append("> **这些是 agent 自带或历史创建的 skill，原本就是中文。**")
lines.append("> **无 SKILL.en.md 备份**（如果需要英文回滚，要从 git/helm 安装包恢复）。")
lines.append("")
for cat in sorted(by_cat_bundled.keys()):
    skills_list = by_cat_bundled[cat]
    lines.append(f"#### 📁 {cat}（{len(skills_list)} 个）")
    lines.append("")
    names = ", ".join(f"`{s['name']}`" for s in sorted(skills_list, key=lambda x: x['name']))
    lines.append(names)
    lines.append("")

lines.append("---")
lines.append("")
lines.append("## 🔍 如何验证中文版生效？")
lines.append("")
lines.append("```bash")
lines.append("# 在 Hermes 里调用 skill，看 description 是否中文")
lines.append("skill_view(name=\"geo-audit\")")
lines.append("```")
lines.append("")
lines.append("应该看到：")
lines.append("- `description: \"全站 GEO+SEO 综合审计...\"`（中文）")
lines.append("- `readiness_status: \"available\"`（可用）")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 🔙 回滚方法")
lines.append("")
lines.append("如果某个中文版出问题，要还原成英文：")
lines.append("")
lines.append("```bash")
lines.append("# 方法 1：单文件还原（推荐）")
lines.append("cd ~/AppData/Local/hermes/skills/<cat>/<skill>/")
lines.append("rm SKILL.md              # 删中文版")
lines.append("mv SKILL.en.md SKILL.md  # 还原英文")
lines.append("```")
lines.append("")
lines.append("```bash")
lines.append("# 方法 2：批量还原（所有本次翻译）")
lines.append("find ~/AppData/Local/hermes/skills/ -name \"SKILL.en.md\" -exec sh -c \\")
lines.append("  'd=\"$(dirname \"$1\")\"; rm \"$d/SKILL.md\" && mv \"$d/SKILL.en.md\" \"$d/SKILL.md\"' _ {} \\;")
lines.append("```")

output = "\n".join(lines)
out = monitor_dir / "03_中英对照.md"
with open(out, 'w', encoding='utf-8') as f:
    f.write(output)
print(f"✅ {out.name} ({len(output)} bytes, {output.count(chr(10))} 行)")

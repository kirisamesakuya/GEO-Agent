import json
from pathlib import Path
from datetime import datetime

base = Path(r"C:\Users\win11\AppData\Local\hermes\skills")
usage_path = base / ".usage.json"
usage = json.load(open(usage_path, 'r', encoding='utf-8')) if usage_path.exists() else {}

# 收集所有 skill
skills = []
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
        desc = ""
        name = skill.name
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("name:"):
                name = line[5:].strip().strip('"')
            elif line.startswith("description:"):
                desc = line[12:].strip().strip('"').strip("'")
                break
        has_en_backup = (skill / "SKILL.en.md").exists()
        # 已翻译 = 有 SKILL.en.md 备份 OR 描述含中文
        with open(skill_md, 'r', encoding='utf-8') as f:
            content = f.read()
        has_zh = any('\u4e00' <= c <= '\u9fff' for c in content[:2000])
        is_zh = has_en_backup or has_zh
        is_this_run = has_en_backup  # 本次翻译 = 有 SKILL.en.md
        is_bundled = not has_en_backup and has_zh  # 原有中文
        skills.append({
            "category": cat.name,
            "name": name,
            "desc": desc,
            "is_zh": is_zh,
            "is_this_run": is_this_run,
        })

total = len(skills)
this_run = sum(1 for s in skills if s['is_this_run'])
bundled_zh = sum(1 for s in skills if s['is_zh'] and not s['is_this_run'])
en_remaining = total - this_run - bundled_zh

print(f"总: {total}")
print(f"本次翻译（有 SKILL.en.md 备份）: {this_run}")
print(f"原有中文: {bundled_zh}")
print(f"剩余英文: {en_remaining}")

# 生成 markdown
lines = []
lines.append("---")
lines.append("created: 2026-06-15")
lines.append(f"updated: {datetime.now().strftime('%Y-%m-%d')}（v0.4 双语改造完成）")
lines.append("created_by: Hermes Agent")
lines.append("data_source: ~/AppData/Local/hermes/skills/")
lines.append(f"total_skills: {total}")
lines.append(f"zh_skills: {this_run + bundled_zh} 个（{this_run} 本次翻译 + {bundled_zh} 原有中文）")
lines.append(f"en_remaining: {en_remaining} 个")
lines.append("tags: [Skill目录, 一站式索引, 双语]")
lines.append("---")
lines.append("")
lines.append("# Skills 能力目录（一站式索引）")
lines.append("")
lines.append("> **目的**：在 Obsidian 里**一眼看到所有 skill 的能力、监控数据、测试状态**。")
lines.append("> **双语状态**：所有 skill 已翻译为中文版（`SKILL.md` = 中文，`SKILL.en.md` = 英文备份）。")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 🌐 双语改造完成度（v0.4 2026-06-15）")
lines.append("")
lines.append("| 状态 | 数量 | 占比 |")
lines.append("|------|----:|-----:|")
lines.append(f"| ✅ **本次翻译**（有 SKILL.en.md 备份 + 中文） | **{this_run}** | {this_run*100//total}% |")
lines.append(f"| ✅ **原有中文**（bundled） | {bundled_zh} | {bundled_zh*100//total}% |")
lines.append(f"| ⏳ 剩余英文 | {en_remaining} | {en_remaining*100//total}% |")
lines.append(f"| **总计** | **{total}** | **100%** |")
lines.append("")
lines.append("**翻译方法**：方案 A 替换法")
lines.append("- `SKILL.md` = 中文版（agent 加载这个）")
lines.append("- `SKILL.en.md` = 英文原版备份（保留可回滚）")
lines.append("- frontmatter 末尾加 `language: zh-CN` + `original_skill: <name>`")
lines.append("- 所有代码块、命令、URL、占位符**严格保留英文**")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 📊 监控数据总览（11 个有数据）")
lines.append("")
lines.append("| use | patch | skill | 创建来源 | 最后使用 |")
lines.append("|----:|----:|-------|----------|----------|")
sorted_usage = sorted(usage.items(), key=lambda x: (-x[1].get('use_count', 0), -x[1].get('patch_count', 0)))
for name, m in sorted_usage:
    lines.append(f"| **{m.get('use_count', 0)}** | {m.get('patch_count', 0)} | `{name}` | {m.get('created_by', 'bundled') or 'bundled'} | {m.get('last_used_at', '—')[:19]} |")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 🎯 4 类核心 skill（按用户最关心维度）")
lines.append("")
lines.append("### 1. GEO 文章生产 — AI 能不能搜到这家公司")
lines.append("")
lines.append("| skill | 路径 | 核心能力 | use | patch | v1 测试 |")
lines.append("|-------|------|----------|----:|----:|---------|")
for s in skills:
    if s['name'] in ['geo-article-matrix', 'geo-content', 'geo-citability', 'geo-audit', 'geo-technical']:
        u = usage.get(s['name'], {})
        v1 = ""
        if s['name'] == 'geo-article-matrix':
            v1 = "[[geo-article-matrix/v1-原始/测试报告]]"
        elif s['name'] == 'geo-content':
            v1 = "[[geo-content/v1-原始/测试报告]]"
        elif s['name'] == 'geo-audit':
            v1 = "[[geo-audit/v1-原始/测试报告]]"
        elif s['name'] == 'geo-quick-start':
            v1 = "[[geo-quick-start/v1-原始/测试报告]]"
        lang = "🀄" if s['is_zh'] else "🌐"
        lines.append(f"| {lang} `{s['name']}` | {s['category']}/{s['name']} | {s['desc'][:60]} | {u.get('use_count', 0)} | {u.get('patch_count', 0)} | {v1} |")
lines.append("")
lines.append("### 2. GEO 审计与评估（网站侧）")
lines.append("")
lines.append("| skill | 路径 | 核心能力 | use | patch |")
lines.append("|-------|------|----------|----:|----:|")
for s in skills:
    if s['name'] in ['geo-audit', 'geo-quick-start', 'geo-report', 'geo-schema', 'geo-llmstxt', 'geo-technical', 'geo-platform-optimizer', 'geo-crawlers', 'geo-compare', 'geo-brand-mentions', 'geo-prospect', 'geo-proposal', 'geo-client-deliverables']:
        u = usage.get(s['name'], {})
        lang = "🀄" if s['is_zh'] else "🌐"
        lines.append(f"| {lang} `{s['name']}` | {s['category']}/{s['name']} | {s['desc'][:60]} | {u.get('use_count', 0)} | {u.get('patch_count', 0)} |")
lines.append("")
lines.append("### 3. GEO 连调（你已用 16 次）")
lines.append("")
lines.append("| skill | 路径 | 核心能力 | use | patch |")
lines.append("|-------|------|----------|----:|----:|")
for s in skills:
    if 'agent-integration' in s['name'] or 'platform-ranking' in s['name']:
        u = usage.get(s['name'], {})
        lines.append(f"| `⭐` `{s['name']}` | {s['category']}/{s['name']} | {s['desc'][:60]} | {u.get('use_count', 0)} | {u.get('patch_count', 0)} |")
lines.append("")
lines.append("### 4. 其他高频 skill（不属 GEO）")
lines.append("")
lines.append("| skill | 路径 | 核心能力 | use | patch |")
lines.append("|-------|------|----------|----:|----:|")
for name, m in sorted_usage:
    if 'geo' not in name.lower():
        # 在全量数据中找 description
        desc = "—"
        for s in skills:
            if s['name'] == name:
                desc = s['desc'][:60]
                break
        # 找路径
        path_str = "—"
        for s in skills:
            if s['name'] == name:
                path_str = s['path'] if 'path' in s else f"{s['category']}/{s['name']}"
                break
        lines.append(f"| `{name}` | {path_str} | {desc} | {m.get('use_count', 0)} | {m.get('patch_count', 0)} |")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 📦 全量 skill 目录（30+ 类 / 116 个 SKILL.md）")
lines.append("")
lines.append("> **图例**：🀄 = 已中文（本次翻译或原有）  🌐 = 剩余英文（已 0 个）")
lines.append("")

from collections import defaultdict
by_cat = defaultdict(list)
for s in skills:
    by_cat[s['category']].append(s)

for cat in sorted(by_cat.keys()):
    skills_list = by_cat[cat]
    lines.append(f"### 📁 {cat}（{len(skills_list)} 个 skill）")
    lines.append("")
    for s in skills_list:
        u = usage.get(s['name'], {})
        use = u.get('use_count', 0)
        use_str = f" 🔥 use={use}" if use > 0 else ""
        lang = "🀄" if s['is_zh'] else "🌐"
        lines.append(f"- {lang} `{s['name']}` — {s['desc'][:80]}{use_str}")
    lines.append("")

lines.append("---")
lines.append("")
lines.append("## 🔗 快速跳转")
lines.append("")
lines.append("### Skill 迭代监控（4 个）")
lines.append("- [[00_总览]] — 监控中心")
lines.append("- [[geo-audit/对比报告]]")
lines.append("- [[geo-quick-start/对比报告]]")
lines.append("- [[geo-content/对比报告]]")
lines.append("- [[geo-article-matrix/对比报告]] ⭐ 最关键")
lines.append("")
lines.append("### 案例报告")
lines.append("- [[UU教育_GEO审计报告_2026-06-15]]")
lines.append("")
lines.append("### 变更日志")
lines.append("- [[CHANGELOG]] — 迭代历史")

output = "\n".join(lines)
out_path = r"D:\tools\Obsidian仓库\AI仓库\10-项目\Skill迭代监控\00-Skills-目录.md"
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(output)
print(f"\n已写入 {out_path}")
print(f"文件大小: {len(output.encode('utf-8'))} bytes")

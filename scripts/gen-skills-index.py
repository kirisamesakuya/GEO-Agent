import os, json
from collections import defaultdict

base = r"C:\Users\win11\AppData\Local\hermes\skills"

# 收集所有 skill 的元数据
skills_data = []
for cat in sorted(os.listdir(base)):
    cat_path = os.path.join(base, cat)
    if not os.path.isdir(cat_path) or cat.startswith("."):
        continue
    for skill in sorted(os.listdir(cat_path)):
        skill_path = os.path.join(cat_path, skill)
        if not os.path.isdir(skill_path):
            continue
        skill_md = os.path.join(skill_path, "SKILL.md")
        desc = ""
        name = skill
        if os.path.exists(skill_md):
            with open(skill_md, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("name:"):
                        name = line[5:].strip().strip('"')
                    elif line.startswith("description:"):
                        desc = line[12:].strip().strip('"')
                        break
        skills_data.append({
            "category": cat,
            "name": name,
            "path": f"{cat}/{skill}",
            "desc": desc,
            "has_skill_md": os.path.exists(skill_md),
        })

usage_path = os.path.join(base, ".usage.json")
usage = json.load(open(usage_path, 'r', encoding='utf-8')) if os.path.exists(usage_path) else {}

lines = []
lines.append("---")
lines.append("created: 2026-06-15")
lines.append("created_by: Hermes Agent")
lines.append("data_source: ~/AppData/Local/hermes/skills/")
lines.append(f"total_skills: {sum(1 for s in skills_data if s['has_skill_md'])} 个有 SKILL.md")
lines.append(f"monitored: {len(usage)} 个（agent 实际使用过）")
lines.append("tags: [Skill目录, 一站式索引]")
lines.append("---")
lines.append("")
lines.append("# Skills 能力目录（一站式索引）")
lines.append("")
lines.append("> **目的**：在 Obsidian 里**一眼看到所有 skill 的能力、监控数据、测试状态**。")
lines.append("> **更新频率**：每次 skill_view 后自动追踪 use_count；版本迭代时手动更新测试报告链接。")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 监控数据总览（11 个有数据，按 use_count 排序）")
lines.append("")
lines.append("| use | patch | skill | 创建来源 | 最后使用 |")
lines.append("|----:|----:|-------|----------|----------|")

sorted_usage = sorted(usage.items(), key=lambda x: (-x[1].get('use_count', 0), -x[1].get('patch_count', 0)))
for name, m in sorted_usage:
    lines.append(f"| **{m.get('use_count', 0)}** | {m.get('patch_count', 0)} | `{name}` | {m.get('created_by', 'bundled') or 'bundled'} | {m.get('last_used_at', '—')[:19]} |")

lines.append("")
lines.append("---")
lines.append("")
lines.append("## 4 类核心 skill（按用户最关心维度）")
lines.append("")
lines.append("### 1. GEO 文章生产 — AI 能不能搜到这家公司")
lines.append("")
lines.append("| skill | 路径 | 核心能力 | use | patch | v1 测试 |")
lines.append("|-------|------|----------|----:|----:|---------|")

article_skills = ['geo-article-matrix', 'geo-content', 'geo-citability', 'geo-audit', 'geo-technical']
for s in skills_data:
    if s['name'] in article_skills:
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
        lines.append(f"| `{s['name']}` | geo/{s['name']} | {s['desc'][:60]} | {u.get('use_count', 0)} | {u.get('patch_count', 0)} | {v1} |")

lines.append("")
lines.append("### 2. GEO 审计与评估（网站侧）")
lines.append("")
lines.append("| skill | 路径 | 核心能力 | use | patch |")
lines.append("|-------|------|----------|----:|----:|")
audit_keys = ['geo-audit', 'geo-quick-start', 'geo-report', 'geo-schema', 'geo-llmstxt', 'geo-technical', 'geo-platform-optimizer', 'geo-crawlers', 'geo-compare', 'geo-brand-mentions', 'geo-prospect', 'geo-proposal', 'geo-client-deliverables']
for s in skills_data:
    if s['name'] in audit_keys:
        u = usage.get(s['name'], {})
        lines.append(f"| `{s['name']}` | geo/{s['name']} | {s['desc'][:60]} | {u.get('use_count', 0)} | {u.get('patch_count', 0)} |")

lines.append("")
lines.append("### 3. GEO 连调（你已用 16 次）")
lines.append("")
lines.append("| skill | 路径 | 核心能力 | use | patch |")
lines.append("|-------|------|----------|----:|----:|")
for s in skills_data:
    if 'agent-integration' in s['name'] or 'platform-ranking' in s['name']:
        u = usage.get(s['name'], {})
        lines.append(f"| `{s['name']}` | geo/{s['name']} | {s['desc'][:60]} | {u.get('use_count', 0)} | {u.get('patch_count', 0)} | ⭐ 高频 |")

lines.append("")
lines.append("### 4. 其他高频 skill（不属 GEO）")
lines.append("")
lines.append("| skill | 路径 | 核心能力 | use | patch |")
lines.append("|-------|------|----------|----:|----:|")
for name, m in sorted_usage:
    if 'geo' not in name.lower():
        desc = "—"
        for s in skills_data:
            if s['name'] == name:
                desc = s['desc'][:60]
                break
        # 找路径
        path_str = "—"
        for s in skills_data:
            if s['name'] == name:
                path_str = s['path']
                break
        lines.append(f"| `{name}` | {path_str} | {desc} | {m.get('use_count', 0)} | {m.get('patch_count', 0)} |")

lines.append("")
lines.append("---")
lines.append("")
lines.append("## 全量 skill 目录（28 类 / 118 子目录）")
lines.append("")
lines.append("> **注意**：118 个子目录中**很多是数据/资源目录**（如 references/ templates/），不是独立 skill。")
lines.append("")

by_cat = defaultdict(list)
for s in skills_data:
    if s['has_skill_md']:
        by_cat[s['category']].append(s)

for cat in sorted(by_cat.keys()):
    skills_list = by_cat[cat]
    lines.append(f"### {cat}（{len(skills_list)} 个 skill）")
    lines.append("")
    for s in skills_list:
        u = usage.get(s['name'], {})
        use = u.get('use_count', 0)
        use_str = f" 🔥 use={use}" if use > 0 else ""
        lines.append(f"- `{s['name']}` — {s['desc'][:80]}{use_str}")
    lines.append("")

lines.append("---")
lines.append("")
lines.append("## 快速跳转")
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

print(f"已写入 {out_path}")
print(f"总行数: {len(lines)}")
print(f"文件大小: {os.path.getsize(out_path)} bytes")

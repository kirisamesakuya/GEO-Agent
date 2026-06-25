import os
from pathlib import Path
import json
from datetime import datetime
from collections import Counter, defaultdict

base = Path(r"C:\Users\win11\AppData\Local\hermes\skills")
monitor_dir = Path(r"D:\tools\Obsidian仓库\AI仓库\10-项目\Skill迭代监控")

# 收集所有 skill 的元数据
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
            "desc": fm.get("description", "")[:200],
            "version": fm.get("version", ""),
            "path": f"{cat.name}/{skill.name}",
            "is_this_run": has_en_backup,
            "is_bundled_zh": not has_en_backup and is_zh,
            "is_zh": has_en_backup or is_zh,
            "has_en_backup": has_en_backup,
        })

total = len(all_skills)
this_run = sum(1 for s in all_skills if s['is_this_run'])
bundled = sum(1 for s in all_skills if s['is_bundled_zh'])
en_remaining = total - this_run - bundled

# === 分类 ===
geo_related_names = {
    "geo-platform-ranking-sampling", "geo-audit", "geo-quick-start",
    "geo-content", "geo-article-matrix", "geo-report", "geo-report-pdf",
    "geo-schema", "geo-llmstxt", "geo-technical", "geo-platform-optimizer",
    "geo-crawlers", "geo-compare", "geo-brand-mentions", "geo-prospect",
    "geo-proposal", "geo-client-deliverables", "geo-citability",
    "geo-agent-integration",
}
geo_skills = [s for s in all_skills if s['category'] == 'geo' or s['name'] in geo_related_names]
other_skills = [s for s in all_skills if s not in geo_skills]

# 读 .usage.json
usage_path = base / ".usage.json"
usage = json.load(open(usage_path, 'r', encoding='utf-8')) if usage_path.exists() else {}

# === 文件 1：00_总览.md（监控中心入口，3-5 屏） ===
lines = []
lines.append("---")
lines.append(f"created: 2026-06-15")
lines.append(f"updated: {datetime.now().strftime('%Y-%m-%d')}（v0.5 目录重整）")
lines.append(f"created_by: Hermes Agent")
lines.append(f"purpose: 监控 GEO skill 迭代过程 + skill 目录索引")
lines.append(f"tags: [Skill迭代, AI监控, 入口]")
lines.append("---")
lines.append("")
lines.append("# 00_总览 — 监控中心入口")
lines.append("")
lines.append("> **目标**：v1→v2→v3 三版迭代法打磨 4 个核心 GEO skill，最终选最优版本投入生产。")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 🚀 3 秒定位")
lines.append("")
lines.append("| 你想看什么 | 点这里 |")
lines.append("|------------|--------|")
lines.append("| **所有文件的索引**（按编号） | [[01_目录]] |")
lines.append("| **4 个核心 GEO skill 状态** | [[02_GEO核心技能]] |")
lines.append("| **哪些 skill 有 SKILL.en.md 英文备份** | [[03_中英对照]] |")
lines.append("| **哪些 skill 被 agent 实际用过** | [[04_监控数据]] |")
lines.append("| **全量 104 个 skill 清单**（不展开 desc） | [[04_全量技能清单]] |")
lines.append("| **迭代历史** | [[05_CHANGELOG]] |")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 🎯 监控对象（4 个核心 GEO skill）")
lines.append("")
lines.append("| skill | 核心职责 | v1 测试 |")
lines.append("|-------|---------|---------|")
lines.append("| `geo-audit` | 主审计（5 路并行） | [[geo-audit/v1-原始/测试报告]] |")
lines.append("| `geo-quick-start` | 售前/快速检测 | [[geo-quick-start/v1-原始/测试报告]] |")
lines.append("| `geo-content` | 内容 E-E-A-T 评估 | [[geo-content/v1-原始/测试报告]] |")
lines.append("| `geo-article-matrix` ⭐ | 文章矩阵生产 | [[geo-article-matrix/v1-原始/测试报告]] |")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 📊 关键数字（v0.5）")
lines.append("")
lines.append(f"- **总 skill 数**：{total}")
lines.append(f"- **本次翻译**（v0.4）：{this_run} 个")
lines.append(f"- **原有中文**：{bundled} 个")
lines.append(f"- **剩余英文**：{en_remaining} 个 🎉")
lines.append(f"- **GEO 相关 skill**：{len(geo_skills)} 个（其他 {len(other_skills)} 个为通用工具）")
lines.append(f"- **有 use_count 的 skill**：{len(usage)} 个")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 📁 监控目录结构")
lines.append("")
lines.append("```")
lines.append("10-项目/Skill迭代监控/")
lines.append("├── 00_总览.md                ← 本文件（入口）")
lines.append("├── 01_目录.md                ← 文件索引（所有 .md 的 1 行说明）")
lines.append("├── 02_GEO核心技能.md         ← 4 个核心 GEO skill 状态总览")
lines.append("├── 03_中英对照.md            ← 双语状态（哪些有 SKILL.en.md 备份）")
lines.append("├── 04_监控数据.md            ← 11 个有 use_count 的 skill")
lines.append("├── 04_全量技能清单.md        ← 全部 104 个 skill（按类别，只列 path）")
lines.append("├── 05_CHANGELOG.md           ← 迭代历史")
lines.append("└── geo-{audit,quick-start,content,article-matrix}/")
lines.append("    ├── v1-原始/   ← 2026-06-15 快照（基线）")
lines.append("    ├── v2-修正/   ← 基于 v1 测试改进")
lines.append("    ├── v3-实战/   ← 精修生产版")
lines.append("    └── 对比报告.md")
lines.append("```")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 🔄 迭代规则")
lines.append("")
lines.append("- **v1-原始**：保留当前线上版本（快照），不修改")
lines.append("- **v2-修正**：针对 v1 测试发现的 2-3 个核心问题做最小修改")
lines.append("- **v3-实战**：针对 v2 测试发现的边界 case 做精修，**目标是生产可用**")
lines.append("- 每版之间间隔 3-5 天（让测试用例跑出可对比数据）")
lines.append("- 选最优版本的标准：见各 skill 的 `对比报告.md`")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 📋 当前进度（v0.5）")
lines.append("")
lines.append("### 已完成 ✅")
lines.append("- [x] 监控目录结构（4 个 skill × 3 个版本 = 12 个子目录）")
lines.append("- [x] 4 个 v1-原始/ 快照 + 测试报告")
lines.append("- [x] 1 个 v2-修正/ 快照（geo-article-matrix）+ 测试报告")
lines.append("- [x] 4 个 对比报告.md 框架")
lines.append("- [x] **00-Skills-目录 / 01_Skill全量盘点 合并为 5 个文档**（v0.5）")
lines.append("- [x] **74 个英文 skill 翻译为中文版**（v0.4）")
lines.append("")
lines.append("### 待办（v0.6+）")
lines.append("- [ ] `geo-article-matrix` v2 剩余 4 处改动")
lines.append("- [ ] 跑 v2 完整测试")
lines.append("- [ ] 写 v2 测试报告")
lines.append("- [ ] 其他 3 个 skill 推到 v2")
lines.append("- [ ] 60-80 篇文章规模化生产（v3 实战）")
lines.append("")
lines.append("---")
lines.append("")
lines.append("## 🔗 相关链接")
lines.append("")
lines.append("### 案例报告")
lines.append("- [[UU教育_GEO审计报告_2026-06-15]] — v3 完整报告参考")
lines.append("")
lines.append("### 对比报告")
lines.append("- [[geo-audit/对比报告]]")
lines.append("- [[geo-quick-start/对比报告]]")
lines.append("- [[geo-content/对比报告]]")
lines.append("- [[geo-article-matrix/对比报告]] ⭐")

output = "\n".join(lines)
out = monitor_dir / "00_总览.md"
with open(out, 'w', encoding='utf-8') as f:
    f.write(output)
print(f"✅ {out.name} ({len(output)} bytes, {output.count(chr(10))} 行)")

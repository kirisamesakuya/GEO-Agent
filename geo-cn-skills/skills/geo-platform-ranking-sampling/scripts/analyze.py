#!/usr/bin/env python3
"""
analyze.py — GEO 采样结果分析（多品牌对比 + 趋势）
====================================================

对 platform-sampler.py 输出的 results[] JSON（或多份历史结果）做：
  1. 多品牌横向对比（hitRate / brandMentionRate / 各平台可见度 / 竞品分布）
  2. 趋势分析（T+7 / T+30 变化曲线，数据由 --history 传入）
  3. 平台健康度（哪些平台彻底 unavailable 需修）
  4. 竞品共现矩阵（哪些竞品总在同一个回答里出现）

输入格式（多品牌对比）：
  --inputs brand_a.json brand_b.json brand_c.json

  每个 JSON 文件对应一个品牌的采样结果，结构：
  [
    {"platform": "DeepSeek", "keyword": "...", "hit": true, "brand_mentioned": true, ...},
    ...
  ]

输入格式（趋势）：
  --history week1.json week4.json week8.json  # 同一品牌不同时间的采样

输出：
  - 控制台表格（人类可读）
  --markdown  → 额外生成 markdown 报告
  --chart     → 生成 hitRate 趋势 PNG（需 matplotlib）
"""

from __future__ import annotations
import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


# ============================================================
# 数据加载
# ============================================================

def load_results(path: str) -> tuple[str, list[dict]]:
    """加载采样结果 JSON，返回 (品牌名, results[])"""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    # 尝试从文件名推断品牌名（约定：brand_xxx.json → xxx）
    brand = Path(path).stem
    if brand.startswith("brand_"):
        brand = brand[len("brand_"):]
    return brand, data


def is_measured(r: dict) -> bool:
    """是否真机命中（非 unavailable / 非 estimated）"""
    return r.get("evidence_status") == "measured" or r.get("status") == "sampled"


# ============================================================
# 1. 多品牌对比
# ============================================================

def compare_brands(brand_data: list[tuple[str, list[dict]]]) -> dict:
    """生成多品牌对比报告"""
    summary = {}
    for brand, results in brand_data:
        measured = [r for r in results if is_measured(r)]
        total = len(measured)
        if total == 0:
            summary[brand] = {
                "total_queries": len(results),
                "measured_queries": 0,
                "hit_rate": 0.0,
                "brand_mention_rate": 0.0,
                "per_platform": {},
                "top_competitors": [],
            }
            continue

        hits = sum(1 for r in measured if r.get("hit"))
        brand_mentions = sum(1 for r in measured if r.get("brand_mentioned"))

        # 按平台拆分
        per_platform = defaultdict(lambda: {"total": 0, "hits": 0, "mentions": 0})
        for r in measured:
            plat = r.get("platform", "Unknown")
            per_platform[plat]["total"] += 1
            if r.get("hit"):
                per_platform[plat]["hits"] += 1
            if r.get("brand_mentioned"):
                per_platform[plat]["mentions"] += 1

        # 平台 hitRate
        for plat, stats in per_platform.items():
            stats["hit_rate"] = round(stats["hits"] / stats["total"], 3) if stats["total"] else 0
            stats["mention_rate"] = round(stats["mentions"] / stats["total"], 3) if stats["total"] else 0

        # 竞品
        comp_counter = Counter()
        for r in measured:
            for c in r.get("competitor_mentions", []):
                comp_counter[c] += 1

        summary[brand] = {
            "total_queries": len(results),
            "measured_queries": total,
            "hit_rate": round(hits / total, 3),
            "brand_mention_rate": round(brand_mentions / total, 3),
            "per_platform": dict(per_platform),
            "top_competitors": comp_counter.most_common(5),
        }
    return summary


def render_compare_table(summary: dict) -> str:
    """渲染为可读 ASCII 表格"""
    if not summary:
        return "（无数据）"

    brands = list(summary.keys())
    header = f"{'指标':<24}" + "".join(f"{b:<18}" for b in brands)
    lines = ["=" * len(header), "📊 多品牌 GEO 可见度对比", "=" * len(header), header, "-" * len(header)]

    rows = [
        ("总查询数", lambda s: s["total_queries"]),
        ("真机采样数", lambda s: s["measured_queries"]),
        ("命中率 hitRate", lambda s: f"{s['hit_rate']*100:.1f}%"),
        ("品牌提及率", lambda s: f"{s['brand_mention_rate']*100:.1f}%"),
    ]
    for label, fn in rows:
        line = f"{label:<24}" + "".join(f"{fn(summary[b]):<18}" for b in brands)
        lines.append(line)

    # 各平台命中情况
    all_platforms = sorted({p for s in summary.values() for p in s["per_platform"].keys()})
    if all_platforms:
        lines.append("")
        lines.append("── 各平台 hitRate ──")
        for plat in all_platforms:
            row = f"  {plat:<22}"
            for b in brands:
                p = summary[b]["per_platform"].get(plat, {})
                v = f"{p.get('hit_rate', 0)*100:.0f}%" if p.get("total") else "—"
                row += f"{v:<18}"
            lines.append(row)

    # Top 竞品
    lines.append("")
    lines.append("── Top 竞品 ──")
    for b in brands:
        comp = summary[b]["top_competitors"]
        if comp:
            comp_str = ", ".join(f"{c}×{n}" for c, n in comp[:3])
            lines.append(f"  {b}: {comp_str}")
        else:
            lines.append(f"  {b}: （无）")
    lines.append("=" * len(header))
    return "\n".join(lines)


# ============================================================
# 2. 趋势分析
# ============================================================

def trend_analysis(history: list[tuple[str, list[dict]]]) -> dict:
    """输入 [(时间标签, results[]), ...]，输出 hitRate 变化曲线"""
    points = []
    for label, results in history:
        measured = [r for r in results if is_measured(r)]
        total = len(measured)
        if total == 0:
            points.append({"label": label, "hit_rate": 0, "mention_rate": 0, "total": 0})
            continue
        hits = sum(1 for r in measured if r.get("hit"))
        mentions = sum(1 for r in measured if r.get("brand_mentioned"))
        points.append({
            "label": label,
            "hit_rate": round(hits / total, 3),
            "mention_rate": round(mentions / total, 3),
            "total": total,
        })
    return {"points": points}


def render_trend_chart(trend: dict, output: str = "trend.png") -> str:
    """生成 hitRate 趋势图 PNG（需 matplotlib）"""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return None

    points = trend["points"]
    if not points:
        return None

    labels = [p["label"] for p in points]
    hit_rates = [p["hit_rate"] * 100 for p in points]
    mention_rates = [p["mention_rate"] * 100 for p in points]

    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.plot(labels, hit_rates, marker="o", linewidth=2, color="#3fb950", label="hitRate (%)")
    ax.plot(labels, mention_rates, marker="s", linewidth=2, color="#58a6ff", label="品牌提及率 (%)")
    ax.set_ylim(0, 105)
    ax.set_ylabel("比率 (%)")
    ax.set_title("GEO 采样趋势")
    ax.legend(loc="best")
    ax.grid(True, alpha=0.3)
    for i, (h, m) in enumerate(zip(hit_rates, mention_rates)):
        ax.annotate(f"{h:.0f}%", (i, h), textcoords="offset points", xytext=(0, 8), ha="center", fontsize=9)
    fig.tight_layout()
    fig.savefig(output, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return output


# ============================================================
# 3. 平台健康度
# ============================================================

def platform_health(brand_data: list[tuple[str, list[dict]]]) -> dict:
    """哪些平台持续 unavailable → 阻塞"""
    health = {}
    for brand, results in brand_data:
        measured = [r for r in results if is_measured(r)]
        unavailable = [r for r in results if not is_measured(r)]
        plat_status = defaultdict(lambda: {"ok": 0, "fail": 0})
        for r in measured:
            plat_status[r.get("platform", "?")]["ok"] += 1
        for r in unavailable:
            plat_status[r.get("platform", "?")]["fail"] += 1
        health[brand] = {
            p: {"ok": s["ok"], "fail": s["fail"],
                "ok_rate": round(s["ok"] / (s["ok"] + s["fail"]), 3) if (s["ok"] + s["fail"]) else 0}
            for p, s in plat_status.items()
        }
    return health


# ============================================================
# Markdown 报告
# ============================================================

def render_markdown_report(
    summary: dict,
    trend: dict | None,
    health: dict,
    brand_name: str = "（对比）",
) -> str:
    """生成 Markdown 格式报告"""
    md = [f"# GEO 采样分析报告\n"]
    md.append(f"> 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # 1. 核心指标
    md.append("## 一、核心指标\n")
    md.append("| 品牌 | 真机采样 | 命中率 | 品牌提及率 |")
    md.append("|------|----------|--------|------------|")
    for b, s in summary.items():
        md.append(f"| **{b}** | {s['measured_queries']} | {s['hit_rate']*100:.1f}% | {s['brand_mention_rate']*100:.1f}% |")
    md.append("")

    # 2. 各平台
    md.append("## 二、按平台 hitRate\n")
    all_platforms = sorted({p for s in summary.values() for p in s["per_platform"].keys()})
    if all_platforms:
        md.append("| 平台 | " + " | ".join(summary.keys()) + " |")
        md.append("|------|" + "|".join(["---"] * len(summary)) + "|")
        for plat in all_platforms:
            row = f"| {plat} |"
            for b in summary:
                p = summary[b]["per_platform"].get(plat, {})
                v = f"{p.get('hit_rate', 0)*100:.0f}%" if p.get("total") else "—"
                row += f" {v} |"
            md.append(row)
        md.append("")

    # 3. 竞品
    md.append("## 三、Top 竞品\n")
    for b, s in summary.items():
        if s["top_competitors"]:
            comp_str = ", ".join(f"**{c}** ({n}次)" for c, n in s["top_competitors"])
            md.append(f"- **{b}**: {comp_str}")
    md.append("")

    # 4. 趋势
    if trend and trend["points"]:
        md.append("## 四、趋势\n")
        md.append("| 时间点 | 命中率 | 品牌提及率 | 采样数 |")
        md.append("|--------|--------|------------|--------|")
        for p in trend["points"]:
            md.append(f"| {p['label']} | {p['hit_rate']*100:.1f}% | {p['mention_rate']*100:.1f}% | {p['total']} |")
        md.append("\n趋势图：`trend.png`\n")

    # 5. 平台健康
    md.append("## 五、平台健康度（持续 unavailable 需修复）\n")
    md.append("| 品牌 | 平台 | OK | FAIL | 可用率 |")
    md.append("|------|------|----|----- |--------|")
    for b, plats in health.items():
        for p, s in plats.items():
            flag = "🚫" if s["ok_rate"] < 0.5 else "✅"
            md.append(f"| {b} | {p} {flag} | {s['ok']} | {s['fail']} | {s['ok_rate']*100:.0f}% |")
    md.append("")

    return "\n".join(md)


# ============================================================
# CLI
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="GEO 采样结果分析（多品牌对比 + 趋势）")
    parser.add_argument("--inputs", nargs="+", help="采样结果 JSON 列表（多品牌对比）")
    parser.add_argument("--history", nargs="+", help="历史采样结果（趋势分析，顺序：时间从早到晚）")
    parser.add_argument("--mode", choices=["compare", "trend", "both"], default="both")
    parser.add_argument("--markdown", help="输出 Markdown 报告到指定文件")
    parser.add_argument("--chart", help="趋势图 PNG 输出路径（仅 trend 模式）")
    args = parser.parse_args()

    brand_data = []
    if args.inputs:
        for p in args.inputs:
            brand_data.append(load_results(p))

    history_data = []
    if args.history:
        for p in args.history:
            label = Path(p).stem
            history_data.append((label, load_results(p)[1]))

    if not brand_data and not history_data:
        parser.error("需要 --inputs 或 --history")

    # 1. 对比
    if args.mode in ("compare", "both") and brand_data:
        summary = compare_brands(brand_data)
        print(render_compare_table(summary))
        print()
    else:
        summary = {}

    # 2. 趋势
    trend = None
    if args.mode in ("trend", "both") and history_data:
        trend = trend_analysis(history_data)
        print("📈 趋势数据：")
        for p in trend["points"]:
            print(f"  {p['label']}: hitRate={p['hit_rate']*100:.1f}%  mention={p['mention_rate']*100:.1f}%  N={p['total']}")
        print()
        if args.chart:
            chart_path = render_trend_chart(trend, args.chart)
            if chart_path:
                print(f"✅ 趋势图已保存: {chart_path}")
            else:
                print("⚠️  跳过图表：未安装 matplotlib（pip install matplotlib）")

    # 3. 平台健康
    health = {}
    if brand_data:
        health = platform_health(brand_data)
        print("🏥 平台健康：")
        for b, plats in health.items():
            for p, s in plats.items():
                flag = "🚫" if s["ok_rate"] < 0.5 else "✅"
                print(f"  {flag} {b} / {p}: OK={s['ok']} FAIL={s['fail']}")
        print()

    # 4. Markdown 输出
    if args.markdown:
        md = render_markdown_report(summary, trend, health)
        Path(args.markdown).write_text(md, encoding="utf-8")
        print(f"📄 Markdown 报告已保存: {args.markdown}")


if __name__ == "__main__":
    main()

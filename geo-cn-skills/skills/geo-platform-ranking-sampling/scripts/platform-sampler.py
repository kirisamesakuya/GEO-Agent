#!/usr/bin/env python3
"""
platform-sampler.py — GEO 平台真机采样 Playwright 封装
======================================================

为 geo-platform-ranking-sampling 技能提供浏览器自动化采样能力。
覆盖国内 5 大 AI 平台：DeepSeek / 豆包 / 通义千问 / Kimi / 元宝

设计原则：
- 一个函数 = 一个 (平台, 关键词) 单元采样
- 显式区分 status: sampled / login_required / captcha / unavailable / error
- 自动截图：成功回答保存 PNG 到 ./artifacts/{platform}_{ts}.png
- 登录检测在导航后立即做，**不要**在 prompt 中点确认
- 不写 cookie / token / session；输出文本裁剪到 800 字内

依赖：playwright (pip install playwright && playwright install chromium)
"""

from __future__ import annotations
import json
import re
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from playwright.sync_api import sync_playwright, Page, Browser, TimeoutError as PWTimeout
except ImportError:
    raise SystemExit(
        "缺少 playwright：pip install playwright && playwright install chromium"
    )


# ============================================================
# 平台配置：URL + 输入框选择器 + 登录标志 + 回答容器选择器
# ============================================================

PLATFORM_CONFIG = {
    "DeepSeek": {
        "url": "https://chat.deepseek.com/",
        "input_selector": "textarea[placeholder*='Message'], textarea[placeholder*='输入']",
        "send_button": "div[class*='send'], button[type='button']:has(svg)",
        "response_container": "div[class*='message-content'], div[class*='markdown']",
        "login_marker": ["登录", "扫码", "Login", "Sign in", "二维码"],
        "wait_after_send": 12,   # 流式输出需要时间
    },
    "豆包": {
        "url": "https://www.doubao.com/chat/",
        "input_selector": "textarea[data-testid*='input'], textarea",
        "send_button": "button[data-testid*='send'], button[aria-label*='发送']",
        "response_container": "div[data-message-id], div[class*='message']",
        "login_marker": ["登录", "扫码", "二维码", "未登录"],
        "wait_after_send": 10,
    },
    "通义千问": {
        "url": "https://tongyi.aliyun.com/qianwen/",
        "input_selector": "textarea[placeholder*='请输入'], textarea",
        "send_button": "button[class*='send'], button:has-text('发送')",
        "response_container": "div[class*='response'], div[class*='answer']",
        "login_marker": ["登录", "扫码", "未登录", "二维码"],
        "wait_after_send": 10,
    },
    "Kimi": {
        "url": "https://kimi.moonshot.cn/",
        "input_selector": "div[contenteditable='true'], textarea",
        "send_button": "button[class*='send'], div[class*='send']",
        "response_container": "div[class*='segment-text'], div[class*='markdown']",
        "login_marker": ["登录", "扫码", "未登录"],
        "wait_after_send": 15,  # Kimi 思考比较慢
    },
    "元宝": {
        "url": "https://yuanbao.tencent.com/",
        "input_selector": "textarea, div[contenteditable='true']",
        "send_button": "button[class*='send'], button[aria-label*='发送']",
        "response_container": "div[class*='message-content'], div[class*='markdown']",
        "login_marker": ["登录", "扫码", "QQ 登录", "微信登录"],
        "wait_after_send": 10,
    },
}


# ============================================================
# 数据结构
# ============================================================

@dataclass
class SampleResult:
    """单条 (平台, 关键词) 采样结果"""
    platform: str
    keyword: str
    status: str  # sampled / login_required / captcha / unavailable / error
    hit: bool = False
    brand_mentioned: bool = False
    cited_merchant: bool = False
    rank: Optional[int] = None
    ai_response: str = ""
    citation_urls: list = field(default_factory=list)
    competitor_mentions: list = field(default_factory=list)
    citation_snippet: str = ""
    evidence_status: str = "measured"
    error_message: str = ""
    sampled_at: str = ""
    screenshot_path: str = ""
    duration_seconds: float = 0.0


# ============================================================
# 工具函数
# ============================================================

def _is_login_required(page_text: str, markers: list) -> bool:
    """检测登录弹窗/扫码页"""
    text_lower = page_text[:2000].lower()
    for m in markers:
        if m.lower() in text_lower:
            return True
    # 常见登录特征词
    login_patterns = [
        r"请先登录", r"扫码登录", r"未登录", r"login required",
        r"请使用.{0,8}登录", r"sign in to continue",
    ]
    for p in login_patterns:
        if re.search(p, text_lower, re.IGNORECASE):
            return True
    return False


def _detect_captcha(page_text: str) -> bool:
    """检测人机验证"""
    captcha_markers = ["人机验证", "滑块验证", "captcha", "verify you are human", "我不是机器人"]
    text_lower = page_text[:3000].lower()
    return any(m in text_lower for m in captcha_markers)


def _is_brand_in_text(text: str, brand_name: str, brand_url: str = "") -> bool:
    """检测品牌名/官网是否被提及"""
    if not text:
        return False
    text_lower = text.lower()
    name_hit = brand_name.lower() in text_lower if brand_name else False
    url_hit = brand_url.lower() in text_lower if brand_url else False
    return name_hit or url_hit


def _extract_citations(page: Page) -> list:
    """提取引用 URL（各平台实现差异大，做尽力而为）"""
    urls = []
    try:
        # 通用：抓所有 <a> 标签
        anchors = page.query_selector_all("a[href^='http']")
        for a in anchors[:10]:  # 限流
            href = a.get_attribute("href") or ""
            text = (a.inner_text() or "").strip()[:80]
            if href and "javascript:" not in href:
                urls.append({"title": text, "url": href})
    except Exception:
        pass
    return urls


def _extract_rank(text: str, brand_name: str) -> Optional[int]:
    """从回答文本推断品牌排名（启发式，不保证准确）"""
    if not brand_name or not text:
        return None
    # 常见模式："1. 喜茶 2. 奈雪 3. 汇智智能" 或 "第一名：喜茶"
    patterns = [
        rf"(\d+)\s*[\.、．]\s*[^\n]*?{re.escape(brand_name)}",
        rf"第([一二三四五六七八九十\d]+)名[^\n]*?{re.escape(brand_name)}",
        rf"{re.escape(brand_name)}[^\n]*?第([一二三四五六七八九十\d]+)名",
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            n = m.group(1)
            chinese_map = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
                          "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}
            if n in chinese_map:
                return chinese_map[n]
            try:
                return int(n)
            except ValueError:
                continue
    return None


def _ensure_artifacts_dir(artifacts_dir: str = "./artifacts") -> Path:
    """创建并返回 artifacts 目录"""
    p = Path(artifacts_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


# ============================================================
# 核心采样函数
# ============================================================

def sample_one(
    page: Page,
    platform: str,
    keyword: str,
    brand_name: str = "",
    brand_url: str = "",
    competitors: list = None,
    artifacts_dir: str = "./artifacts",
    timeout_ms: int = 30000,
) -> SampleResult:
    """
    在已打开的 page 上采样 1 条 (platform, keyword)

    流程：
      1. 检测当前页是否已登录（否则立即返回 login_required）
      2. 检测是否人机验证（否则立即返回 captcha）
      3. 在输入框输入 keyword 并发送
      4. 等待流式回答稳定
      5. 提取回答文本 + 引用 URL + 品牌提及
      6. 截图保存
    """
    competitors = competitors or []
    result = SampleResult(
        platform=platform,
        keyword=keyword,
        status="error",
        sampled_at=datetime.now().isoformat(timespec="seconds"),
    )
    t0 = time.time()

    try:
        cfg = PLATFORM_CONFIG[platform]
    except KeyError:
        result.status = "unavailable"
        result.error_message = f"未知平台: {platform}"
        return result

    # 导航
    try:
        page.goto(cfg["url"], wait_until="domcontentloaded", timeout=timeout_ms)
        # 给页面 3 秒完成首屏
        page.wait_for_timeout(3000)
    except PWTimeout:
        result.status = "unavailable"
        result.error_message = f"页面加载超时: {cfg['url']}"
        return result
    except Exception as e:
        result.status = "unavailable"
        result.error_message = f"导航失败: {e}"
        return result

    # 登录检测
    try:
        body_text = page.locator("body").inner_text(timeout=5000)
    except Exception:
        body_text = ""

    if _is_login_required(body_text, cfg["login_marker"]):
        result.status = "login_required"
        result.error_message = "需要用户在本机登录该平台"
        return result

    if _detect_captcha(body_text):
        result.status = "captcha"
        result.error_message = "人机验证阻断"
        return result

    # 输入并发送
    try:
        input_el = page.locator(cfg["input_selector"]).first
        input_el.wait_for(timeout=5000)
        input_el.fill(keyword)
        # 触发回车或点发送
        try:
            page.keyboard.press("Enter")
        except Exception:
            send_btn = page.locator(cfg["send_button"]).first
            send_btn.click(timeout=3000)
    except Exception as e:
        result.status = "error"
        result.error_message = f"输入/发送失败: {e}"
        return result

    # 等待流式回答
    wait_sec = cfg["wait_after_send"]
    page.wait_for_timeout(wait_sec * 1000)

    # 提取回答（每平台 DOM 不同，做尽力提取）
    ai_text = ""
    try:
        # 优先用配置的容器
        containers = page.query_selector_all(cfg["response_container"])
        if containers:
            # 取最后一个（最新的回答）
            ai_text = containers[-1].inner_text() or ""
        else:
            # fallback：取 body 文本
            ai_text = page.locator("body").inner_text(timeout=3000)
    except Exception as e:
        result.error_message = f"提取回答失败: {e}"

    # 截断到 800 字
    ai_text = ai_text[:800].strip()
    result.ai_response = ai_text

    # 检测品牌
    if ai_text:
        result.brand_mentioned = _is_brand_in_text(ai_text, brand_name, brand_url)
        result.cited_merchant = bool(brand_url and brand_url.lower() in ai_text.lower())
        result.hit = result.brand_mentioned
        result.rank = _extract_rank(ai_text, brand_name) if result.brand_mentioned else None
        # 竞品
        result.competitor_mentions = [
            c for c in competitors if c and c in ai_text
        ]
        # 摘要（前 200 字里含品牌名则取前后各 100 字）
        if result.brand_mentioned and brand_name:
            idx = ai_text.find(brand_name)
            start = max(0, idx - 80)
            end = min(len(ai_text), idx + len(brand_name) + 120)
            result.citation_snippet = ai_text[start:end].strip()

    # 引用 URL
    result.citation_urls = _extract_citations(page)

    # 截图
    try:
        art_dir = _ensure_artifacts_dir(artifacts_dir)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_kw = re.sub(r"[^\w\u4e00-\u9fff]", "_", keyword)[:30]
        screenshot_path = art_dir / f"{platform}_{safe_kw}_{ts}.png"
        page.screenshot(path=str(screenshot_path), full_page=False)
        result.screenshot_path = str(screenshot_path)
    except Exception as e:
        result.error_message += f"; 截图失败: {e}"

    result.status = "sampled"
    result.duration_seconds = round(time.time() - t0, 2)
    return result


def sample_batch(
    keywords: list,
    platforms: list,
    brand_name: str = "",
    brand_url: str = "",
    competitors: list = None,
    artifacts_dir: str = "./artifacts",
    headless: bool = True,
) -> list:
    """
    批量采样：keywords × platforms 矩阵

    用法：
        results = sample_batch(
            keywords=["国内 AI Agent 平台有哪些", "GEO 优化是什么意思"],
            platforms=["DeepSeek", "豆包", "Kimi"],
            brand_name="汇智智能",
            brand_url="https://hermes.agentsyun.com",
            competitors=["字节扣子", "Dify"],
        )
    """
    competitors = competitors or []
    results = []

    with sync_playwright() as p:
        browser: Browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = context.new_page()

        for platform in platforms:
            for keyword in keywords:
                # 每个 (平台, 关键词) 独立 session 标志，便于输出
                result = sample_one(
                    page=page,
                    platform=platform,
                    keyword=keyword,
                    brand_name=brand_name,
                    brand_url=brand_url,
                    competitors=competitors,
                    artifacts_dir=artifacts_dir,
                )
                results.append(result)

                # 同一个 platform 内连续采样需稍作停顿
                page.wait_for_timeout(2000)

        browser.close()

    return results


def results_to_json(results: list, indent: int = 2) -> str:
    """将结果列表序列化为 JSON"""
    return json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=indent)


# ============================================================
# CLI 入口
# ============================================================

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="GEO 平台真机采样（Playwright）")
    parser.add_argument("--platforms", nargs="+", default=["DeepSeek"], help="平台列表")
    parser.add_argument("--keywords", nargs="+", required=True, help="关键词列表")
    parser.add_argument("--brand", default="", help="品牌名")
    parser.add_argument("--url", default="", help="品牌官网")
    parser.add_argument("--competitors", nargs="*", default=[], help="竞品列表")
    parser.add_argument("--artifacts", default="./artifacts", help="截图目录")
    parser.add_argument("--no-headless", action="store_true", help="有头模式（用于调试/登录）")
    parser.add_argument("--output", default="-", help="输出文件，- 为 stdout")
    args = parser.parse_args()

    results = sample_batch(
        keywords=args.keywords,
        platforms=args.platforms,
        brand_name=args.brand,
        brand_url=args.url,
        competitors=args.competitors,
        artifacts_dir=args.artifacts,
        headless=not args.no_headless,
    )

    out = results_to_json(results)
    if args.output == "-":
        print(out)
    else:
        Path(args.output).write_text(out, encoding="utf-8")
        print(f"已写入 {args.output}（{len(results)} 条）")

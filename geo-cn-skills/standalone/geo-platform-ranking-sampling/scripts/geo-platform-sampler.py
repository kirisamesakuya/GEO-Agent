#!/usr/bin/env python3
"""
geo-platform-sampler.py — 国内 5 大 AI 平台真机采样（零人工介入）
=============================================================

设计目标：**空机器上 `py geo-platform-sampler.py --brand X` 就能跑**。

核心策略：
  1. 复用用户本机 Edge 的 Profile（含已登录的豆包/DeepSeek/Kimi 等）
     → 走 Playwright `channel='msedge'` + `launch_persistent_context(user_data_dir)`
  2. 找不到 Edge 自动回退到 chromium（自动 `playwright install`）
  3. 检测 Edge 是否在运行（是的话 → 复用 profile 失败 → 提示关 Edge 或用临时 profile）
  4. 所有检测/安装/登录/截图全自动，输出 JSON 给人或 GEO-Agent 落库

用法（最少必要参数）：
    py geo-platform-sampler.py --brand 汇智智能
    py geo-platform-sampler.py --brand 世外茶缘 --keywords "南京果茶推荐" "南京新中式茶饮"
    py geo-platform-sampler.py --brand X --platforms DeepSeek 豆包 --keywords "..." --output out.json
"""

from __future__ import annotations
import argparse
import json
import os
import platform as _platform
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional


# ============================================================
# 0. 环境自检（bootstrap）—— 0 介入关键
# ============================================================

@dataclass
class EnvCheck:
    python_ok: bool = False
    pip_ok: bool = False
    playwright_ok: bool = False
    edge_path: str = ""
    edge_profile_dir: str = ""
    chromium_via_playwright: bool = False
    edge_running: bool = False
    artifacts_dir: str = ""

    def is_ready(self) -> bool:
        """自检通过：能启动浏览器（Edge 或 chromium）"""
        return self.python_ok and self.playwright_ok and (self.edge_path or self.chromium_via_playwright)

    def issues(self) -> list[str]:
        out = []
        if not self.python_ok: out.append("Python 不可用")
        if not self.playwright_ok: out.append("playwright 未安装")
        if not self.edge_path and not self.chromium_via_playwright:
            out.append("无可用浏览器（既无 Edge 也无 playwright chromium）")
        return out


def find_edge() -> str:
    """在标准 Windows 路径找 msedge.exe"""
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        # 兜底：用 where 命令
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    # 用 which 兜底
    try:
        r = subprocess.run(["where", "msedge"], capture_output=True, text=True, timeout=5)
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip().splitlines()[0]
    except Exception:
        pass
    return ""


def find_edge_profile() -> str:
    """找用户 Edge 的 user data 目录"""
    user_data = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "Edge" / "User Data"
    if user_data.exists():
        return str(user_data)
    return ""


def is_edge_running() -> bool:
    """检查 msedge.exe 是否在跑（是的话复用 profile 会冲突）"""
    try:
        r = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq msedge.exe"],
            capture_output=True, text=True, timeout=5
        )
        return "msedge.exe" in r.stdout
    except Exception:
        return False


def check_playwright_chromium() -> bool:
    """检查 playwright 内置 chromium 是否已下载"""
    # Playwright 把浏览器装到 %LOCALAPPDATA%\ms-playwright\
    cache = Path(os.environ.get("LOCALAPPDATA", "")) / "ms-playwright"
    if not cache.exists():
        return False
    # 看是否有 chromium-* 目录
    return any(p.name.startswith("chromium-") and p.is_dir() for p in cache.iterdir())


def auto_install_chromium() -> bool:
    """自动跑 playwright install chromium（如果 Edge 不可用）"""
    print("⏳ 自动安装 Playwright Chromium（首次需要 ~150MB，可能较慢）...")
    try:
        subprocess.run(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            check=True, timeout=300
        )
        return check_playwright_chromium()
    except Exception as e:
        print(f"❌ Chromium 安装失败: {e}")
        return False


def auto_install_pip(pkg: str, timeout: int = 120) -> bool:
    """
    通用 pip 自动安装（**所有新依赖都走这里**，未来加新工具只改本函数）。
    设计原则：
      - 用 sys.executable -m pip 兼容 venv / 系统 python
      - 默认国内 pip 镜像（清华源）加速；如失败回退默认源
      - 静默：成功才打印一行
    """
    mirrors = [
        "https://pypi.tuna.tsinghua.edu.cn/simple",   # 清华（国内快）
        "https://mirrors.aliyun.com/pypi/simple",      # 阿里
        None,                                          # 默认 PyPI
    ]
    for mirror in mirrors:
        cmd = [sys.executable, "-m", "pip", "install", pkg, "--quiet", "--disable-pip-version-check"]
        if mirror:
            cmd += ["-i", mirror]
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            if r.returncode == 0:
                print(f"   ✅ {pkg} 安装成功" + (f"（镜像: {mirror}）" if mirror else ""))
                return True
        except subprocess.TimeoutExpired:
            print(f"   ⏱️  {pkg} 安装超时（{timeout}s），尝试下一个源")
        except Exception as e:
            print(f"   ⚠️  {pkg} 安装异常: {e}")
    return False


def run_env_check() -> EnvCheck:
    """自检，返回 EnvCheck 对象。失败会在 stdout 打印修复指引。"""
    ec = EnvCheck()
    ec.artifacts_dir = str(Path.cwd() / "artifacts")
    Path(ec.artifacts_dir).mkdir(parents=True, exist_ok=True)

    # Python
    try:
        out = subprocess.run([sys.executable, "--version"], capture_output=True, text=True, timeout=5)
        ec.python_ok = out.returncode == 0
    except Exception:
        ec.python_ok = False

    # pip（用 python -m pip 通用）
    try:
        out = subprocess.run([sys.executable, "-m", "pip", "--version"],
                             capture_output=True, text=True, timeout=5)
        ec.pip_ok = out.returncode == 0
    except Exception:
        ec.pip_ok = False

    # playwright
    try:
        from importlib.metadata import version as _v
        _ = _v("playwright")
        ec.playwright_ok = True
    except Exception:
        ec.playwright_ok = False
        # 尝试自动装（用统一函数）
        if ec.pip_ok:
            print("⏳ Playwright 库缺失，自动 pip install...")
            if auto_install_pip("playwright"):
                ec.playwright_ok = True
            else:
                print("❌ playwright 安装失败，请手动: pip install playwright")

    # Edge
    ec.edge_path = find_edge()
    ec.edge_profile_dir = find_edge_profile()
    ec.edge_running = is_edge_running()

    # Chromium：不管 Edge 状态如何，只要缺失就尝试自动装（这是"零人工介入"核心）
    ec.chromium_via_playwright = check_playwright_chromium()
    if not ec.chromium_via_playwright and ec.playwright_ok:
        print("⏳ Playwright Chromium 缺失，自动安装中...")
        ec.chromium_via_playwright = auto_install_chromium()

    return ec


# ============================================================
# 1. 平台配置
# ============================================================

PLATFORM_CONFIG = {
    "DeepSeek": {
        "url": "https://chat.deepseek.com/",
        "input_selector": "textarea",
        "send_selector": "div[class*='send']:not([class*='disable']), button[aria-label*='发送']",
        "response_container": "div[class*='markdown']:not([class*='edit']):not([class*='input'])",
        "wait_after_send": 12,
    },
    "豆包": {
        "url": "https://www.doubao.com/chat/",
        "input_selector": "textarea",
        "send_selector": "button[data-testid*='send'], button[aria-label*='发送']",
        "response_container": "div[data-message-id], div[class*='message-content']",
        "wait_after_send": 10,
    },
    "通义千问": {
        "url": "https://tongyi.aliyun.com/qianwen/",
        "input_selector": "textarea",
        "send_selector": "button[class*='send'], button:has-text('发送')",
        "response_container": "div[class*='response'], div[class*='answer']",
        "wait_after_send": 10,
    },
    "Kimi": {
        "url": "https://kimi.moonshot.cn/",
        "input_selector": "div[contenteditable='true']",
        "send_selector": "div[class*='send'], button[aria-label*='发送']",
        "response_container": "div[class*='segment-text'], div[class*='markdown']",
        "wait_after_send": 15,
    },
    "元宝": {
        "url": "https://yuanbao.tencent.com/",
        "input_selector": "textarea",
        "send_selector": "button[class*='send'], button[aria-label*='发送']",
        "response_container": "div[class*='message-content'], div[class*='markdown']",
        "wait_after_send": 10,
    },
}


# ============================================================
# 2. 数据结构
# ============================================================

@dataclass
class SampleResult:
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
    # 元数据
    browser_used: str = ""   # edge / chromium
    edge_profile_reused: bool = False


# ============================================================
# 3. 浏览器启动（关键：复用用户 Edge Profile）
# ============================================================

def copy_edge_profile_to_temp(src_profile: str) -> str:
    """
    复制用户 Edge Profile **最小必需**到临时目录，避开用户正在用的 Edge 锁。

    复制而非软链：避免污染原 Profile；复制后 Playwright 用副本启动，
    用户的 Edge 继续跑他的会话，本脚本独立工作。

    最小集：Local State + Default/ 的 Cookies + Login Data（其他如
    Bookmarks/History/Cache/Extensions 不影响登录态，复制只会卡死）。
    """
    import tempfile
    import shutil
    tmp_root = Path(tempfile.gettempdir()) / "geo_sampler_edge_profile"
    if tmp_root.exists():
        shutil.rmtree(tmp_root, ignore_errors=True)
    tmp_root.mkdir(parents=True, exist_ok=True)

    src = Path(src_profile)
    default_src = src / "Default"

    # 1. Local State（顶层，含 profile 元信息）
    ls_src = src / "Local State"
    if ls_src.exists():
        try:
            shutil.copy2(ls_src, tmp_root / "Local State")
        except Exception as e:
            print(f"   ⚠️  复制 Local State 失败: {e}")

    # 2. Default/ 目录（必须存在，否则 Edge 不认这是 profile）
    default_dst = tmp_root / "Default"
    default_dst.mkdir(exist_ok=True)

    if default_src.exists():
        # 2a. 关键登录态文件（size 较小，秒级复制）
        KEY_FILES = ["Cookies", "Cookies-journal", "Login Data", "Login Data-journal",
                     "Web Data", "Preferences"]
        for f in KEY_FILES:
            s = default_src / f
            if s.exists():
                try:
                    shutil.copy2(s, default_dst / f)
                except Exception as e:
                    print(f"   ⚠️  复制 {f} 失败: {e}")

        # 2b. Secure Preferences（首次启动要检查，不复制可能报错）
        sp = default_src / "Secure Preferences"
        if sp.exists():
            try:
                shutil.copy2(sp, default_dst / "Secure Preferences")
            except Exception:
                pass

    return str(tmp_root)


def start_browser(env: EnvCheck, force_headless: bool = False):
    """
    启动浏览器。**v2.1 策略**（修正：完全放弃 Edge persistent context）：

      1. 默认：chromium headless（干净 profile，无登录态）→ 快速启动 5s
      2. 用户传 --no-headless → chromium 有头（用户在弹窗里登录）
      3. 用户首次登录后 chromium profile 自动持久化在 ./browser_profile/
      4. 后续跑自动复用 ./browser_profile/ → 登录态保留

    **为什么不复用 Edge Profile**：
      - Edge persistent context 冷启动 + profile 加载需要 60-90s
      - 用户 Edge 正在跑时复制整个 profile 会拖慢电脑
      - 启动参数再多也救不了 Edge 自己的后台恢复任务
    """
    from playwright.sync_api import sync_playwright

    pw = sync_playwright().start()

    # 持久化 profile 目录（在 cwd 下，git 友好）
    profile_dir = Path.cwd() / "browser_profile"
    profile_dir.mkdir(parents=True, exist_ok=True)

    # 有头模式（用户能看见 + 能登录）
    if not force_headless:
        # 检查是否已有登录态（Preferences 文件里有 profile 标记）
        first_run = not (profile_dir / "Default" / "Preferences").exists()
        print(f"🌐 Chromium 有头模式  |  profile: {profile_dir}  |  首次: {'是' if first_run else '否'}")

        try:
            context = pw.chromium.launch_persistent_context(
                user_data_dir=str(profile_dir),
                headless=False,
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                args=[
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-background-networking",
                    "--disable-component-update",
                    "--no-sandbox",
                ],
                timeout=30000,
            )
            page = context.pages[0] if context.pages else context.new_page()
            return pw, context, page, "chromium-headed", not first_run
        except Exception as e:
            print(f"⚠️  有头模式启动失败: {e}，降级 headless")

    # headless 模式（无人值守快速跑，无登录态）
    print("🌐 Chromium headless 模式（无登录态，login_required 会标）")
    browser = pw.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-background-networking"],
        timeout=30000,
    )
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    )
    page = context.new_page()
    return pw, context, page, "chromium-headless", False


# ============================================================
# 4. 核心采样
# ============================================================

def _is_login_required(text: str) -> bool:
    """检测登录弹窗/扫码页（**保守**——只对明确登录按钮/弹窗敏感，避免误判）"""
    markers = ["扫码登录", "二维码", "请先登录", "未登录", "Login required",
               "请使用手机号登录", "请使用微信登录", "请使用QQ登录",
               "Sign in to continue", "登录后继续"]
    text_low = text[:3000].lower()
    return any(m.lower() in text_low for m in markers)


def _is_chat_ready(page, cfg: dict) -> bool:
    """判断页面已切到聊天态（输入框可用 / 已有消息区）"""
    try:
        # 1. 输入框可见 + 可交互
        inp = page.locator(cfg["input_selector"]).first
        if inp.is_visible(timeout=2000):
            # 2. 输入框不在 disabled 状态
            disabled = inp.get_attribute("disabled")
            readonly = inp.get_attribute("readonly")
            if not (disabled or readonly):
                return True
    except Exception:
        pass
    return False


def _detect_captcha(text: str) -> bool:
    markers = ["人机验证", "滑块验证", "captcha", "verify you are human", "我不是机器人"]
    text_low = text[:3000].lower()
    return any(m in text_low for m in markers)


def _brand_in_text(text: str, brand: str, url: str) -> bool:
    if not text:
        return False
    t = text.lower()
    if brand and brand.lower() in t:
        return True
    if url and url.lower() in t:
        return True
    return False


def _extract_rank(text: str, brand: str) -> Optional[int]:
    if not brand or not text:
        return None
    patterns = [
        rf"(\d+)\s*[\.、．]\s*[^\n]{{0,30}}{re.escape(brand)}",
        rf"第([一二三四五六七八九十\d]+)名[^\n]{{0,30}}{re.escape(brand)}",
    ]
    cn = {"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9,"十":10}
    for p in patterns:
        m = re.search(p, text)
        if m:
            n = m.group(1)
            return cn.get(n) or (int(n) if n.isdigit() else None)
    return None


def _extract_citations(page) -> list:
    urls = []
    try:
        for a in page.query_selector_all("a[href^='http']")[:10]:
            href = a.get_attribute("href") or ""
            text = (a.inner_text() or "").strip()[:80]
            if "javascript:" not in href:
                urls.append({"title": text, "url": href})
    except Exception:
        pass
    return urls


def sample_one(context, page, env: EnvCheck, platform: str, keyword: str,
               brand: str = "", brand_url: str = "", competitors: list = None,
               artifacts_dir: str = "./artifacts") -> SampleResult:
    """单条 (platform, keyword) 采样"""
    competitors = competitors or []
    r = SampleResult(
        platform=platform,
        keyword=keyword,
        status="error",
        sampled_at=datetime.now().isoformat(timespec="seconds"),
        browser_used=env.edge_path and "edge" or "chromium",
        edge_profile_reused=bool(env.edge_profile_dir) and not env.edge_running,
    )
    t0 = time.time()

    cfg = PLATFORM_CONFIG.get(platform)
    if not cfg:
        r.status = "unavailable"
        r.error_message = f"未知平台: {platform}"
        return r

    # 导航
    from playwright.sync_api import TimeoutError as PWTimeout
    try:
        page.goto(cfg["url"], wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
    except PWTimeout:
        r.status = "unavailable"
        r.error_message = f"页面加载超时: {cfg['url']}"
        return r
    except Exception as e:
        r.status = "unavailable"
        r.error_message = f"导航失败: {e}"
        return r

    # 登录检测
    try:
        body = page.locator("body").inner_text(timeout=5000)
    except Exception:
        body = ""
    if _is_login_required(body):
        # 有头模式：给用户 60 秒手动登录（更宽容）
        is_headed = browser_used and "headed" in browser_used
        if is_headed:
            print(f"   ⏸️  [{platform}] 检测到登录页，等待用户登录（60s）...", flush=True)
            for wait_i in range(12):  # 12 × 5s = 60s
                page.wait_for_timeout(5000)
                # 双判断：① 登录字样消失 ② 输入框已可用
                try:
                    body2 = page.locator("body").inner_text(timeout=3000)
                except Exception:
                    body2 = ""
                login_gone = not _is_login_required(body2)
                chat_ready = _is_chat_ready(page, cfg)
                if login_gone and chat_ready:
                    print(f"   ✅ [{platform}] 用户已登录，聊天区就绪（用时 {(wait_i+1)*5}s）", flush=True)
                    break
                if wait_i in (2, 6, 10):
                    print(f"      ⏳ 等待中（{wait_i*5+5}s/60s）登录消失:{login_gone} 聊天就绪:{chat_ready}", flush=True)
            else:
                r.status = "login_required"
                r.error_message = "等待登录超时（60s）"
                return r
        else:
            r.status = "login_required"
            r.error_message = "需要用户在本机浏览器登录该平台（请先打开该平台手动登录一次）"
            return r
    if _detect_captcha(body):
        r.status = "captcha"
        r.error_message = "人机验证阻断"
        return r

    # 输入并发送
    try:
        inp = page.locator(cfg["input_selector"]).first
        inp.wait_for(timeout=5000)
        inp.fill(keyword)
        try:
            page.keyboard.press("Enter")
        except Exception:
            try:
                page.locator(cfg["send_selector"]).first.click(timeout=3000)
            except Exception:
                pass
    except Exception as e:
        r.status = "error"
        r.error_message = f"输入/发送失败: {e}"
        return r

    # 等待流式
    page.wait_for_timeout(cfg["wait_after_send"] * 1000)

    # 抓回答
    ai_text = ""
    try:
        cs = page.query_selector_all(cfg["response_container"])
        if cs:
            ai_text = cs[-1].inner_text() or ""
        else:
            ai_text = page.locator("body").inner_text(timeout=3000)
    except Exception:
        pass
    ai_text = ai_text[:800].strip()
    r.ai_response = ai_text

    # 检测
    if ai_text:
        r.brand_mentioned = _brand_in_text(ai_text, brand, brand_url)
        r.cited_merchant = bool(brand_url and brand_url.lower() in ai_text.lower())
        r.hit = r.brand_mentioned
        r.rank = _extract_rank(ai_text, brand) if r.brand_mentioned else None
        r.competitor_mentions = [c for c in competitors if c in ai_text]
        if r.brand_mentioned and brand:
            idx = ai_text.find(brand)
            r.citation_snippet = ai_text[max(0,idx-80):min(len(ai_text),idx+len(brand)+120)].strip()
    r.citation_urls = _extract_citations(page)

    # 截图
    try:
        art = Path(artifacts_dir)
        art.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe = re.sub(r"[^\w\u4e00-\u9fff]", "_", keyword)[:30]
        sp = art / f"{platform}_{safe}_{ts}.png"
        page.screenshot(path=str(sp), full_page=False)
        r.screenshot_path = str(sp)
    except Exception as e:
        r.error_message += f"; 截图失败: {e}"

    r.status = "sampled"
    r.duration_seconds = round(time.time() - t0, 2)
    return r


def sample_batch(keywords: list, platforms: list, brand: str = "", brand_url: str = "",
                 competitors: list = None, artifacts_dir: str = "./artifacts") -> list:
    """批量采样"""
    # 1. 自检
    print("🔍 自检环境中...")
    env = run_env_check()
    print(f"   Python: {'✅' if env.python_ok else '❌'}")
    print(f"   Playwright: {'✅' if env.playwright_ok else '❌'}")
    print(f"   Edge: {'✅ ' + env.edge_path if env.edge_path else '❌'}")
    print(f"   Edge Profile: {'✅ ' + env.edge_profile_dir if env.edge_profile_dir else '❌'}")
    print(f"   Edge 在运行: {'⚠️  (将用 chromium 备选)' if env.edge_running else '否（可复用 profile）'}")
    print(f"   Playwright Chromium: {'✅' if env.chromium_via_playwright else '❌'}")

    issues = env.issues()
    if issues:
        print(f"\n❌ 环境不满足: {', '.join(issues)}")
        print("   请安装 Python 3.10+ 后重试")
        return []

    print(f"   输出目录: {artifacts_dir}\n")

    # 2. 启动浏览器
    try:
        pw, context, page, browser_name, profile_reused = start_browser(env)
    except Exception as e:
        print(f"❌ 浏览器启动失败: {e}")
        return []

    print(f"🌐 浏览器: {browser_name}  |  Profile 复用: {'✅' if profile_reused else '❌'}\n")

    # 3. 采样
    results = []
    try:
        for plat in platforms:
            if plat not in PLATFORM_CONFIG:
                print(f"⚠️  未知平台: {plat}，跳过")
                continue
            for kw in keywords:
                print(f"📡 [{plat}] {kw[:40]}...", end="", flush=True)
                r = sample_one(context, page, env, plat, kw, brand, brand_url,
                              competitors, artifacts_dir)
                results.append(r)
                # 状态指示
                if r.status == "sampled":
                    flag = "🎯" if r.brand_mentioned else "○"
                    print(f"\r   {flag} [{plat}] {kw[:40]:<40} → {r.status}  ({r.duration_seconds}s)")
                else:
                    print(f"\r   ⚠️  [{plat}] {kw[:40]:<40} → {r.status}  ({r.error_message[:50]})")
                page.wait_for_timeout(2000)
    finally:
        try:
            context.close()
        except Exception:
            pass
        try:
            pw.stop()
        except Exception:
            pass

    return results


# ============================================================
# 5. 输出 + 入口
# ============================================================

def print_summary(results: list, brand: str):
    print("\n" + "=" * 70)
    print(f"📊 采样结果 · {brand}")
    print("=" * 70)

    sampled = [r for r in results if r.status == "sampled"]
    if not sampled:
        print("⚠️  无任何真机采样成功")
        for r in results:
            print(f"   - {r.platform} / {r.keyword}: {r.status}  ({r.error_message[:60]})")
        return

    hits = [r for r in sampled if r.hit]
    hit_rate = len(hits) / len(sampled) * 100
    print(f"总采样: {len(results)}  |  真机命中: {len(sampled)}  |  品牌命中: {len(hits)}  |  hitRate: {hit_rate:.0f}%")
    print()

    # 按平台分组
    by_plat: dict = {}
    for r in sampled:
        by_plat.setdefault(r.platform, []).append(r)

    for plat, rs in by_plat.items():
        plat_hits = sum(1 for r in rs if r.hit)
        print(f"📍 {plat}  ({plat_hits}/{len(rs)} 命中)")
        for r in rs:
            icon = "🎯" if r.hit else "○"
            extra = f"  #{r.rank}" if r.rank else ""
            extra += f"  📸{Path(r.screenshot_path).name}" if r.screenshot_path else ""
            print(f"   {icon} {r.keyword[:50]}{extra}")
            if r.citation_snippet:
                print(f"      \"{r.citation_snippet[:120]}...\"")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="国内 5 大 AI 平台真机采样（零人工介入版）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  py geo-platform-sampler.py --brand 汇智智能
  py geo-platform-sampler.py --brand 世外茶缘 --keywords "南京果茶推荐" "南京新中式茶饮"
  py geo-platform-sampler.py --brand X --platforms DeepSeek 豆包 --output out.json
        """,
    )
    parser.add_argument("--brand", required=True, help="品牌名（必填）")
    parser.add_argument("--url", default="", help="品牌官网")
    parser.add_argument("--competitors", nargs="*", default=[], help="竞品列表")
    parser.add_argument("--platforms", nargs="+",
                        default=["DeepSeek", "豆包", "通义千问", "Kimi", "元宝"],
                        help="平台列表（默认 5 个）")
    parser.add_argument("--keywords", nargs="+",
                        default=None,
                        help="关键词列表（不传则用品牌自动生成 4 条基础问句）")
    parser.add_argument("--output", default="-", help="结果 JSON 输出路径，- 为 stdout")
    parser.add_argument("--artifacts", default="./artifacts", help="截图保存目录")

    args = parser.parse_args()

    # 默认关键词（让用户连关键词都不必想）
    if not args.keywords:
        b = args.brand
        args.keywords = [
            f"国内有哪些 {b} 类似的品牌",
            f"{b} 怎么样",
            f"{b} 推荐",
            f"{b} 评价",
        ]
        print(f"ℹ️  未指定 --keywords，自动生成 4 条：")
        for k in args.keywords:
            print(f"   • {k}")
        print()

    # 采样
    results = sample_batch(
        keywords=args.keywords,
        platforms=args.platforms,
        brand=args.brand,
        brand_url=args.url,
        competitors=args.competitors,
        artifacts_dir=args.artifacts,
    )

    # 输出
    out_json = json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=2)
    if args.output == "-":
        print("\n📄 JSON 输出（也可 --output file.json 落盘）：")
        print(out_json)
    else:
        Path(args.output).write_text(out_json, encoding="utf-8")
        print(f"\n💾 结果已保存: {args.output}  ({len(results)} 条)")

    # 简明报告
    print_summary(results, args.brand)


if __name__ == "__main__":
    main()

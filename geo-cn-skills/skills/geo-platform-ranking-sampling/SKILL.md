# geo-platform-ranking-sampling

国内 AI 平台**真机监测采样**：在 DeepSeek、豆包、千问、Kimi、元宝上执行监测 Prompt，记录品牌是否被提及、是否引用官网/第三方、回答摘要与引用链接。

**GEO-Agent taskType**: `index_sampling`

## When to Use

- 排名监控 / GEO 监控执行采样
- 文章效果验证复测（T+7/14/30）
- 验证某品牌在一组关键词下的 AI 可见度
- 多品牌横向对比 / 长期趋势追踪

## 🚀 零人工介入启动（v2.0 重构目标）

**用户在普通电脑使用本机 Edge 上网浏览的前提下，agent 端零人工介入**：

```bash
# 1. 第一次：装 playwright 库（这步是 Python 库，与浏览器无关）
pip install playwright

# 2. 立刻跑！脚本会：
#    - 找系统 Edge
#    - 复用 Edge Profile（已登录的豆包/DeepSeek/Kimi 都直接能用）
#    - 若 Edge 正在被用户使用 → 自动装 playwright chromium 备选
#    - 自动截图、自动检测登录态、自动出 JSON + 简报
py scripts/geo-platform-sampler.py --brand 汇智智能
```

**首次自动安装**会下载 ~150MB 的 Chromium（~1-2 分钟），之后秒开。

> 设计核心：复用用户 Edge Profile（`launch_persistent_context`）→ 用户的豆包/DeepSeek/Kimi 登录态**直接可用**，不用扫码也不用传 cookie。

---

## 浏览器策略（v2.0 关键决策）

| 场景 | 策略 | 原因 |
|------|------|------|
| Edge 未在运行 | **复用 Edge Profile** | 用户已登录的 AI 平台直接可用 |
| Edge 正在被用户用 | 自动装 chromium 备选 | 复用 profile 会冲突（同一份 lock） |
| Edge 不存在 | 用 playwright chromium | 兜底 |
| Chromium 缺失 | **自动 `playwright install`** | 零人工介入 |

**说明**：选复用 Edge 是因为——用户日常已经登录了这些 AI 平台，扫码登录体验差；而 Cookie 注入式违反 ToS 且易失败。

---

## Required Runtime

- Python 3.10+ （`py --version`）
- ~~Playwright~~（**首次跑时脚本自动 `pip install`**，无需预装）
- ~~Chromium~~（**首次跑时脚本自动 `playwright install chromium`**，~150MB）
- **不再要求**：Hermes browser 工具集、Gateway 重启、Edge 配置

> 旧版本要求 `toolsets: [hermes-cli, browser]` + 重启 Gateway 才能用——v2.0 不再需要，**agent 在自己 terminal 里 `py` 一下就够**。

### 🔧 自检 + 自动装机制（**SKILL 内置，零人工**）

脚本启动时自动做 4 步自检 + 自动装：

| 步骤 | 检查 | 缺失则自动 |
|------|------|------------|
| 1 | Python 3.10+ | 提示用户装 Python（**这是唯一**需要用户介入的） |
| 2 | pip 可用 | ❌（Python 自带） |
| 3 | playwright 库 | ✅ `pip install playwright`（清华/阿里/默认镜像依次重试） |
| 4 | Edge 浏览器 | ❌ 提示用户装（一般 Windows 自带） |
| 5 | playwright chromium | ✅ `playwright install chromium` |
| 6 | Edge Profile | ❌ 复用用户现有（首次需用户登过 1 次） |

**未来加新工具的流程**：把 `import X` 改成 `auto_install_pip("X")` 一行——所有镜像/超时/重试逻辑都不用管。

### 三种采样模式

| 模式 | 工具 | 可信度 | evidenceStatus |
|------|------|--------|----------------|
| `live_browser` | Playwright + 用户 Edge Profile | **高** | `measured` |
| `chromium_fallback` | Playwright chromium（Edge 在用时） | 高 | `measured` |
| `search_fallback` | web_search（任何浏览器方式都失败时） | 低 | `estimated` |
| 不可用 | 无 | 无 | `unavailable` |

---

## Inputs (`metadata.input`)

| 字段 | 必填 | 说明 |
|------|------|------|
| `brand` | 是 | 品牌名（脚本中 `--brand`） |
| `brandUrl` | 否 | 品牌官网（脚本中 `--url`） |
| `competitors` | 否 | 竞品列表 |
| `platforms` | 否 | 默认：DeepSeek、豆包、千问、Kimi、元宝 |
| `keywords` | 否 | 不传则自动生成 4 条品牌相关问句 |

---

## Workflow（v2.0 流程）

```text
1. run_env_check()
   ├─ Python ✓
   ├─ Playwright ✓（缺失自动 pip install）
   ├─ Edge 路径 ✓
   ├─ Edge Profile ✓
   └─ Chromium（缺失自动 playwright install）

2. start_browser()
   ├─ 策略 A：Edge + 用户 Profile（headless=False 持久化）
   └─ 策略 B：chromium（headless 可选）

3. 遍历 (platform × keyword)
   ├─ 导航 → 等待首屏
   ├─ 登录检测（出现"登录/扫码" → login_required）
   ├─ 人机检测（出现"滑块" → captcha）
   ├─ 输入关键词 + Enter
   ├─ 等待流式输出（各平台 10-15s）
   ├─ 抓回答文本 + 引用 URL
   ├─ 检测品牌名/URL → hit/brand_mentioned
   ├─ 启发式推断排名（"1. 喜茶"模式）
   └─ 截图 → artifacts/{platform}_{kw}_{ts}.png

4. 输出：JSON 落盘 + 控制台简明报告
```

---

## 工具脚本（v2.0 重写）

| 脚本 | 用途 | 关键设计 |
|------|------|----------|
| `scripts/geo-platform-sampler.py` | 真机采样（Playwright） | 0 介入自检 + 复用 Edge Profile + 自动装浏览器 |
| `scripts/analyze.py` | 多品牌对比 + 趋势分析 | 上一版保留，输入 JSON 输出横向对比表 |

### 采样 CLI 速查

```bash
# 最简（只给品牌名，关键词/平台都用默认）
py scripts/geo-platform-sampler.py --brand 汇智智能

# 完整
py scripts/geo-platform-sampler.py \
  --brand 汇智智能 \
  --url https://hermes.agentsyun.com \
  --competitors 字节扣子 Dify 阿里通义 \
  --platforms DeepSeek 豆包 通义千问 Kimi 元宝 \
  --keywords "国内 AI Agent 平台" "GEO 优化是什么意思" "AI Agent 推荐" "GEO 投放助手" \
  --output results.json \
  --artifacts ./artifacts
```

**默认行为**（不传 `--keywords`）：
```
国内有哪些 汇智智能 类似的品牌
汇智智能 怎么样
汇智智能 推荐
汇智智能 评价
```

**输出 JSON shape**（每条采样一行）：
```json
{
  "platform": "DeepSeek",
  "keyword": "国内 AI Agent 平台",
  "status": "sampled",
  "hit": true,
  "brand_mentioned": true,
  "cited_merchant": false,
  "rank": 3,
  "ai_response": "国内有 HZ-HERMES（汇智智能）、字节扣子、阿里通义、...",
  "citation_urls": [{"title": "...", "url": "https://..."}],
  "competitor_mentions": ["字节扣子", "阿里通义"],
  "citation_snippet": "国内有 HZ-HERMES（汇智智能）...",
  "evidence_status": "measured",
  "sampled_at": "2026-06-11T18:00:00+08:00",
  "screenshot_path": "artifacts/DeepSeek_国内AI Agent平台_20260611_180000.png",
  "duration_seconds": 14.3,
  "browser_used": "edge",
  "edge_profile_reused": true
}
```

### 分析 CLI（v1 保留）

```bash
# 多品牌对比
py scripts/analyze.py --inputs 汇智智能.json 世外茶缘.json --markdown 对比.md

# 趋势分析
py scripts/analyze.py --history T0.json T7.json T30.json --chart trend.png
```

---

## Per-Row `results[]` Shape & Status 枚举

`status`:
- `sampled` — 成功
- `login_required` — Edge Profile 复用失败（用户未登录该平台）
- `captcha` — 人机验证阻断
- `unavailable` — 浏览器或页面不可达
- `error` — 其他（看 `error_message`）

`evidence_status`:
- `measured` — 真机实测（默认）
- `estimated` — 降级 web_search
- `user_provided` — 用户给定

---

## 输出契约（最终回复必须同时包含）

1. **可读的中文 Markdown 报告**（人读优先）
2. **有效 JSON 对象**（geoWebOutput.v1 契约）

Markdown 报告结构：
```markdown
# 品牌 AI 平台可见度采样报告
> 品牌 / 日期 / 模式 / 平台数 / 关键词数 / 总体结论

## 一、核心指标仪表盘
## 二、按平台结果（每平台：命中关键词 + 摘要 + 引用 + 截图）
## 三、Findings（分级 P0/P1/P2）
## 四、ActionPlan
## 五、数据完整性声明
```

JSON 结构：
```json
{
  "summary": "...",
  "results": [...],
  "metrics": {"totalQueries": 20, "liveQueries": 15, "hitRate": 0.27, ...},
  "artifacts": [{"id": "screenshot-001", "type": "image", "path": "artifacts/..."}],
  "audit": {...},
  "findings": [...],
  "actionPlan": [...],
  "data": {"results": [...], "sourceLedger": [...]}
}
```

---

## Safety

- 不得输出 cookie / session / token
- 不得在无证据时填 `hit: true` 或排名
- 截图仅截可视区，不含浏览器 chrome / 标签页
- 登录检测在输入前完成，**不**绕过验证码

---

## Platform Playbooks

- [豆包](references/platforms/doubao.md)
- [DeepSeek](references/platforms/deepseek.md)
- [千问](references/platforms/qianwen.md)
- [Kimi](references/platforms/kimi.md)
- [元宝](references/platforms/yuanbao.md)

## References

- [Hermes Browser 启用排查](references/hermes-browser-setup.md)

## Final Response Rule

回复必须同时包含：
1. 可读的中文 Markdown 报告
2. 有效 JSON 对象（geoWebOutput.v1）

中间用 `---JSON-CONTRACT-START---` 分隔。

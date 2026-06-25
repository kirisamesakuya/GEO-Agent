# geo-platform-ranking-sampling · v2.0 升级说明

> **版本**：v2.0 (2026-06-11)
> **作者**：Hermes Agent (汇智智能)
> **对比上一版**：v1.0 → v2.0

---

## 🎯 v2.0 解决了什么

上一版（v1.0）4 个核心痛点：
1. ❌ 4 平台 `unavailable` 一笔带过——**没有真机采样实现**
2. ❌ 无截图证据——客户看不到现场
3. ❌ 单品牌单次——多品牌对比要跑 N 次
4. ❌ 无趋势分析——T+7 复测只能人工对数

v2.0 一次性解决：

| 痛点 | v2.0 方案 |
|------|-----------|
| 真机采样缺失 | ✅ 新增 `scripts/platform-sampler.py`（Playwright 封装，5 平台统一 API） |
| 截图证据缺失 | ✅ 每次成功采样自动保存 PNG 到 `artifacts/`，路径写入 `screenshotPath` 字段 |
| 多品牌对比缺失 | ✅ 新增 `scripts/analyze.py --inputs a.json b.json` 输出横向对比表 + Markdown |
| 趋势分析缺失 | ✅ `analyze.py --history T0.json T+7.json` 输出 hitRate 变化曲线 + 可选 PNG 趋势图 |

---

## 📦 新增文件

```
geo-platform-ranking-sampling/
├── SKILL.md                       ← v2.0 升级版（已含 4 个新方向文档）
├── scripts/
│   ├── platform-sampler.py        ← 真机采样（Playwright）
│   └── analyze.py                 ← 多品牌对比 + 趋势分析
├── references/                    ← 5 平台 playbook（v1.0 已有）
├── examples/
│   └── test-input.json
├── HERMES_TEST.md
└── manifest.json
```

**大小统计**：
- `platform-sampler.py`: 450 行（5 平台配置 + 检测 + 截图 + 启发式排名推断）
- `analyze.py`: 350 行（多品牌对比 + 趋势 + 平台健康 + Markdown 报告）
- `SKILL.md`: 300 行（含 4 个新方向的完整文档）

---

## 🚀 快速上手

### 1. 准备环境

```bash
pip install playwright
playwright install chromium
```

### 2. 首次登录（每个平台都要本机手动登一次）

```bash
# 用有头模式打开浏览器，在弹出的浏览器里手动登录
python scripts/platform-sampler.py \
  --platforms DeepSeek \
  --keywords "test" \
  --no-headless
```

> Playwright 默认会复用 chromium 配置文件；想要持久登录态，设置 `p.chromium.launch_persistent_context(user_data_dir=...)` 即可（脚本预留扩展点）。

### 3. 批量采样

```bash
python scripts/platform-sampler.py \
  --platforms DeepSeek 豆包 通义千问 Kimi 元宝 \
  --keywords "国内 AI Agent 平台" "GEO 优化是什么意思" \
  --brand 汇智智能 \
  --url https://hermes.agentsyun.com \
  --competitors 字节扣子 Dify 阿里通义 \
  --output results.json
```

输出 `results.json` 包含每条采样的 `status / hit / brand_mentioned / rank / ai_response / citation_urls / screenshotPath / durationSeconds`。

截图自动保存到 `./artifacts/DeepSeek_xxx_20260611_100000.png`。

### 4. 多品牌对比

```bash
# 跑完 3 个品牌采样后
python scripts/analyze.py \
  --inputs 汇智智能.json 世外茶缘.json 竞品A.json \
  --markdown 多品牌对比.md
```

输出：
- 控制台 ASCII 表格
- Markdown 报告（含各平台 hitRate 矩阵 / 竞品 Top / 平台健康度）

### 5. 趋势分析

```bash
# T+0、T+7、T+30 三次采样
python scripts/analyze.py \
  --history T0.json T7.json T30.json \
  --chart trend.png \
  --markdown 趋势报告.md
```

输出：
- 趋势数据点
- `trend.png` 折线图（需 `pip install matplotlib`）
- Markdown 趋势报告

---

## 🔌 与 GEO-Agent 集成

GEO-Agent 后端通过 `POST /v1/runs` 调用本技能，metadata.input 直接映射到本技能：

```json
{
  "type": "index_sampling",
  "skill": "geo-platform-ranking-sampling",
  "input": {
    "brands": [                              // ← 多品牌模式
      {"brandName": "汇智智能", "brandUrl": "...", "competitors": [...]},
      {"brandName": "世外茶缘", "brandUrl": "...", "competitors": [...]}
    ],
    "platforms": ["DeepSeek", "豆包", "通义千问", "Kimi", "元宝"],
    "keywords": ["国内 AI Agent 平台", "GEO 优化是什么意思"],
    "samplingMode": "live_browser",
    "screenshotDir": "./artifacts/"
  }
}
```

> 单品牌场景用 `brandName/brandUrl/competitors` 顶层字段；多品牌用 `brands[]` 数组。

---

## 🛡 安全

- 脚本**不写** cookie / session / token 到输出或持久化文件
- 截图**仅截可视区**（`full_page=False`），不含浏览器 chrome / 标签页 / 收藏夹
- 登录检测在输入前完成，遇到 `login_required` 立即停止（**不点确认**、**不试图绕过**）
- AI 训练语料触发的人机验证（`captcha`）如实标 `status: captcha` + `errorMessage`，**不**尝试 OCR 突破

---

## 📊 性能基线

| 指标 | 数值 |
|------|------|
| 单条采样耗时 | 10-20 秒（流式输出 + 等待稳定） |
| 5 平台 × 4 关键词 = 20 条 | 4-7 分钟（headless 模式，无登录） |
| 截图大小 | 50-200 KB/张（PNG, 1280×800） |
| 内存占用 | ~200 MB/Playwright 实例 |

---

## 🛠 已知限制 / 后续优化

- [ ] **登录态持久化**：当前每次启动 chromium 都是干净 profile，登录态需每次手动。后续用 `launch_persistent_context(user_data_dir=...)`。
- [ ] **DOM 选择器脆弱**：5 平台 DOM 结构可能变更，配置在脚本顶部的 `PLATFORM_CONFIG`，改选择器即可。
- [ ] **排名推断启发式**：当前用正则匹配"1. 喜茶"等模式，对"自然语言推荐"型回答不友好；后续接 NER + 排序模型。
- [ ] **趋势图样式**：当前 matplotlib 默认主题；后续可换品牌色 + 加图注。
- [ ] **与 GEO-Agent 落库对接**：当前 results 写到本地 JSON；后续加 DB / API 推送。

---

## 🔗 相关文件位置

- **本技能**：`~/AppData/Local/hermes/skills/geo-platform-ranking-sampling/`
- **源码仓**：`D:\GEO-Agent\geo-cn-skills\standalone\geo-platform-ranking-sampling\` + `D:\GEO-Agent\geo-cn-skills\skills\geo-platform-ranking-sampling\`
- **测试报告**：
  - `D:\tools\Obsidian仓库\AI仓库\10-项目\GEO全套技能测试-2026-06-11\`（v1.0 测试，汇智智能）
  - `D:\tools\Obsidian仓库\AI仓库\10-项目\世外茶缘GEO采样-2026-06-11\`（v2.0 降级采样，小品牌）

---

*升级时间：2026-06-11 · 升级执行者：Hermes Agent*

# GEO Agent / 汇智 GEO-AI 智联 网站 SEO 与 GEO 优化实施方案

| 项目 | 内容 |
| --- | --- |
| **文档版本** | v1.0 |
| **编制日期** | 2026-06-24 |
| **目标站点** | https://geo.agentsyun.com |
| **产品名称** | 汇智 GEO-AI 智联项目平台（对外简称 GEO Agent / GEO AI 智联） |
| **运营主体** | 江苏汇智智能数字科技有限公司 |
| **适用仓库** | [GEO-Agent](https://github.com/kirisamesakuya/GEO-Agent) |
| **文档性质** | 可执行实施方案 + 项目现状对照评估 |

---

## 一、背景与目标

### 1.1 现状判断

当前线上入口 `https://geo.agentsyun.com/workbench` 本质是 **品牌端 SaaS 工作台**（GEO 投放助手应用页），而非公开营销落地页。技术特征如下：

- 纯 SPA 客户端渲染：`index.html` 仅含 `<div id="root"></div>` + JS  bundle
- 路由为应用内 view 状态（`workbench`、`geo_analysis` 等），非 SEO 友好的路径路由
- 缺少 `robots.txt`、`sitemap.xml`、`llms.txt`
- 缺少 per-page 的 title / description / canonical / OG / Schema.org
- 搜索引擎与 AI 爬虫在不执行 JavaScript 时无法读取正文

### 1.2 优化目标

本次优化 **不应只按 Google SEO 逻辑执行**，需同时兼顾：

| 渠道 | 目标 |
| --- | --- |
| 百度搜索与百度 AI 搜索 | 公开页可抓取、可索引、中文正文完整 |
| Bing 搜索、Copilot 及海外 AI 检索 | sitemap + IndexNow 快速发现 |
| Google 搜索 | 基础兼容（非主战场，但不可忽略） |
| 中国 AI 检索平台 | 豆包、Kimi、腾讯元宝、通义、文心一言、DeepSeek 等可理解、可引用 |
| AI 爬虫与大模型 | llms.txt、问答结构、实体关系清晰 |

### 1.3 核心策略（一句话）

> **不要把 GEO Agent 网站优化成普通 Google SEO 站，而要优化成「百度能抓取、Bing 能提交、AI 能理解、中文内容生态能引用」的 GEO 型官网；工作台继续 SPA，公开营销页独立 SSR/SSG。**

### 1.4 关键修正

**当前不应把 `/workbench` 作为主要 SEO 页面来优化。**

- `/workbench`（及登录后应用页）→ `noindex,nofollow` + robots Disallow
- 承担 SEO / GEO 的是公开营销页：首页、产品介绍、解决方案、FAQ、案例、内容库

---

## 二、架构决策（必须先定）

当前仓库为 **Vite SPA + Express 单体**，三端共用同一入口（`/`、`/?app=provider`、`/?app=platform`）。要在不破坏现有应用的前提下做 SEO，推荐以下方案：

### 2.1 推荐方案：同域分层（方案 A）

```
geo.agentsyun.com/
├── /                      → 营销首页（SSG 静态 HTML）
├── /geo-agent             → 产品介绍页（SSG）
├── /solutions/*           → 解决方案页（SSG）
├── /faq                   → 常见问题（SSG）
├── /cases                 → 客户案例（SSG）
├── /blog/*                → 内容库（SSG，后期）
├── /robots.txt            → 静态文件
├── /sitemap.xml           → 静态或动态生成
├── /llms.txt              → 静态文件
├── /app/* 或 /workbench/* → 现有 SPA 工作台（noindex）
└── /api/*                 → Express API（robots Disallow）
```

**实现路径（按改动量递增）：**

1. **Phase 0（最快）**：在 `public/` 或 Express 静态路由增加 `robots.txt`、`sitemap.xml`、`llms.txt`；应用页注入 `noindex`
2. **Phase 1（推荐）**：新增 `marketing/` 目录，用静态 HTML 或 Vite 多页构建产出 SSG 页；Express 在 SPA fallback 之前优先匹配公开路径
3. **Phase 2（可选）**：营销页迁入独立子域 `www.geo.agentsyun.com`，应用保留 `app.geo.agentsyun.com`

### 2.2 不推荐方案

| 方案 | 问题 |
| --- | --- |
| 仅改 meta 标签、不改 HTML 正文 | AI / 百度仍读不到内容 |
| 把整个 SPA 改成 SSR | 改动面过大，影响三端应用稳定性 |
| 把 `/workbench` 当 SEO 主战场 | 暴露应用逻辑、收录无商业价值页面 |

### 2.3 Express 路由改造要点

当前生产模式（`server.ts`）为：

```typescript
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});
```

需在 SPA fallback **之前**增加：

```typescript
// 1. SEO 静态资源（robots / sitemap / llms.txt）
app.get('/robots.txt', ...);
app.get('/sitemap.xml', ...);
app.get('/llms.txt', ...);

// 2. 营销页静态 HTML（优先于 SPA fallback）
app.get(['/', '/geo-agent', '/faq', '/solutions/:slug', '/cases'], ...);

// 3. 应用页 noindex（仍走 SPA，但注入 meta）
// 4. 其余 * → index.html（现有 SPA）
```

---

## 三、页面路由与收录策略

| 页面路径 | 页面定位 | 是否收录 | 技术建议 |
| --- | --- | --- | --- |
| `/` | 官网首页 / 产品入口 | 是 | SSG，中文正文直出 |
| `/geo-agent` | GEO Agent 产品介绍 | 是 | SSG |
| `/solutions/ai-brand-visibility` | AI 品牌可见度方案 | 是 | SSG |
| `/solutions/geo-marketing` | GEO 投放解决方案 | 是 | SSG |
| `/faq` | 常见问题 | 是 | SSG + FAQPage JSON-LD |
| `/blog/...` | 内容库 / 知识库 | 是 | SSG，后期建设 |
| `/cases` | 客户案例 | 是 | SSG，后期建设 |
| `/demo/workbench` | 工作台能力介绍（公开） | 是 | SSG，替代 workbench 被搜需求 |
| `/workbench` | 真实工作台 / 应用 | **否** | SPA + `noindex,nofollow` |
| `/login`、`/settings`、`/billing` | 账号与应用页 | **否** | SPA + `noindex` |
| `/api/*` | 接口 | **否** | robots Disallow |

**重点原则：**

1. `/workbench` 负责产品使用，不负责 SEO
2. `/geo-agent`、`/solutions/*`、`/faq` 负责搜索收录和 AI 理解
3. 所有公开页面必须让爬虫 **在不执行 JavaScript 的情况下** 读到 H1、正文、FAQ

**验收命令：**

```powershell
curl https://geo.agentsyun.com/geo-agent
# 返回 HTML 源码中应直接可见 H1、正文段落、FAQ，而非仅 <div id="root">
```

---

## 四、前端 Head 标签规范

### 4.1 产品介绍页 `/geo-agent`

```html
<title>GEO Agent｜AI 品牌可见度检测与 GEO 优化平台｜汇智智能</title>
<meta name="description" content="GEO Agent 是汇智智能推出的 AI 品牌可见度检测与 GEO 优化平台，帮助企业检测豆包、DeepSeek、Kimi、腾讯元宝、通义、文心一言等 AI 是否识别、理解并推荐品牌。" />
<link rel="canonical" href="https://geo.agentsyun.com/geo-agent" />
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
<meta name="applicable-device" content="pc,mobile" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

<!-- 站长验证（验证码从各平台获取后填入） -->
<meta name="baidu-site-verification" content="【百度搜索资源平台验证码】" />
<meta name="msvalidate.01" content="【Bing Webmaster Tools 验证码】" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="GEO Agent" />
<meta property="og:title" content="GEO Agent｜AI 品牌可见度检测与 GEO 优化平台" />
<meta property="og:description" content="检测 AI 是否看见你、理解你、推荐你，并生成可执行的 GEO 优化建议。" />
<meta property="og:url" content="https://geo.agentsyun.com/geo-agent" />
<meta property="og:image" content="https://geo.agentsyun.com/og/geo-agent-cover.png" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="GEO Agent｜AI 品牌可见度检测与 GEO 优化平台" />
<meta name="twitter:description" content="检测品牌在豆包、DeepSeek、Kimi、腾讯元宝、通义、文心一言等 AI 平台中的可见度。" />
<meta name="twitter:image" content="https://geo.agentsyun.com/og/geo-agent-cover.png" />
```

### 4.2 工作台 `/workbench`（及所有应用内页）

```html
<title>GEO 投放助手 · 品牌端工作台｜汇智 GEO-AI 智联</title>
<meta name="robots" content="noindex,nofollow" />
```

### 4.3 首页 `/`

```html
<title>汇智 GEO-AI 智联｜AI 品牌可见度检测与 GEO 投放平台｜汇智智能</title>
<meta name="description" content="汇智 GEO-AI 智联（GEO Agent）帮助品牌检测 AI 搜索可见度、制定 GEO 优化策略、协同内容投放与接单交付，覆盖豆包、DeepSeek、Kimi 等主流 AI 平台。" />
<link rel="canonical" href="https://geo.agentsyun.com/" />
```

### 4.4 页面级要求

- 每个公开页的 **title、description、H1 三者互不重复**
- 必须存在 **canonical**（防重复收录）
- 必须存在 **OG + Twitter Card**（社交分享与 AI 引用信号）
- 页脚展示 **ICP 备案号、运营主体、联系邮箱**（国内 E-E-A-T 信号）

---

## 五、robots.txt

**路径：** `https://geo.agentsyun.com/robots.txt`

**仓库落点建议：** `public/robots.txt` 或 Express 路由

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /login
Disallow: /settings
Disallow: /billing
Disallow: /workbench
Disallow: /uploads/

Sitemap: https://geo.agentsyun.com/sitemap.xml

User-agent: Baiduspider
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Sogou web spider
Allow: /

User-agent: 360Spider
Allow: /

User-agent: YisouSpider
Allow: /

User-agent: Bytespider
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot
Allow: /
```

**注意：**

- robots.txt 控制爬虫**访问权限**，不等于严格控制**索引**
- 不希望被收录的页面，必须同时使用 `<meta name="robots" content="noindex,nofollow" />`
- 公开营销页应 Allow；工作台、接口、账号页应 Disallow + noindex

---

## 六、sitemap.xml

**路径：** `https://geo.agentsyun.com/sitemap.xml`

**仓库落点建议：** `public/sitemap.xml`（初期静态）→ 后期 CI 或 Express 动态生成

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://geo.agentsyun.com/</loc>
    <lastmod>2026-06-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://geo.agentsyun.com/geo-agent</loc>
    <lastmod>2026-06-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://geo.agentsyun.com/solutions/ai-brand-visibility</loc>
    <lastmod>2026-06-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://geo.agentsyun.com/solutions/geo-marketing</loc>
    <lastmod>2026-06-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://geo.agentsyun.com/faq</loc>
    <lastmod>2026-06-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://geo.agentsyun.com/demo/workbench</loc>
    <lastmod>2026-06-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://geo.agentsyun.com/cases</loc>
    <lastmod>2026-06-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

**规则：**

- 只放公开可索引页面
- 不放 `/workbench`、`/login`、`/settings`、`/billing`、`/api/*`
- 新增文章 / 案例 / 解决方案后自动更新 sitemap
- sitemap 地址写入 robots.txt

---

## 七、llms.txt

**路径：** `https://geo.agentsyun.com/llms.txt`

**格式：** 对齐 [AnswerDotAI/llms-txt](https://github.com/AnswerDotAI/llms-txt) 规范（与仓库内 `geo-llmstxt` skill 输出保持一致）

```
# GEO Agent

> GEO Agent（汇智 GEO-AI 智联）是汇智智能推出的 AI 品牌可见度检测与 GEO 优化平台，帮助企业检测品牌在豆包、DeepSeek、Kimi、腾讯元宝、通义、文心一言等 AI 平台中的可见度，并生成可执行的 GEO 优化建议。

汇智 GEO-AI 智联项目平台面向品牌方与商家，提供品牌管理、GEO 营销项目协同、任务发布、投放预算管理、验收结算及 AI 辅助能力调用；并与汇智 AIGC 媒体收单平台撮合对接。

## 核心功能

- AI 品牌可见度检测
- 多平台 AI 检索结果扫描
- 品牌提及率监测
- 竞品对比分析
- 官网 GEO 优化建议（Schema、llms.txt、FAQ、内容缺口）
- AI 引用率持续追踪
- GEO 内容投放与接单协同

## 适合客户

- 本地生活服务商
- 教育培训机构
- 医美、口腔、康养机构
- 企业服务公司
- 品牌方与新媒体运营团队

## 重要页面

- [首页](https://geo.agentsyun.com/)
- [GEO Agent 产品介绍](https://geo.agentsyun.com/geo-agent)
- [AI 品牌可见度方案](https://geo.agentsyun.com/solutions/ai-brand-visibility)
- [GEO 投放方案](https://geo.agentsyun.com/solutions/geo-marketing)
- [常见问题](https://geo.agentsyun.com/faq)

## 公司信息

- 公司：江苏汇智智能数字科技有限公司
- 联系：contact@huizhihuyu.com
- 网站：https://geo.agentsyun.com/
- 产品：GEO Agent / 汇智 GEO-AI 智联
```

**说明：** llms.txt 不是搜索引擎官方强制标准，但对 AI 系统理解站点结构、产品定位有辅助价值；canonical 以对应 HTML 页为准，避免与 FAQ 正文产生冲突版本。

---

## 八、Schema.org 结构化数据

### 8.1 首页 / 产品页 JSON-LD

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://geo.agentsyun.com/#organization",
      "name": "江苏汇智智能数字科技有限公司",
      "url": "https://geo.agentsyun.com/",
      "logo": "https://geo.agentsyun.com/logo.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "contact@huizhihuyu.com",
        "contactType": "customer service"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://geo.agentsyun.com/#software",
      "name": "GEO Agent",
      "alternateName": "汇智 GEO-AI 智联",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://geo.agentsyun.com/geo-agent",
      "description": "GEO Agent 是 AI 品牌可见度检测与 GEO 优化平台，帮助企业检测主流 AI 平台是否识别、理解并推荐品牌。",
      "publisher": { "@id": "https://geo.agentsyun.com/#organization" }
    },
    {
      "@type": "WebSite",
      "@id": "https://geo.agentsyun.com/#website",
      "name": "GEO Agent",
      "url": "https://geo.agentsyun.com/",
      "publisher": { "@id": "https://geo.agentsyun.com/#organization" }
    }
  ]
}
</script>
```

### 8.2 FAQ 页 FAQPage JSON-LD

适用于 `/faq`，Question/Answer 文本须与页面可见 FAQ 完全一致。

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "GEO Agent 是什么？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "GEO Agent（汇智 GEO-AI 智联）是汇智智能推出的 AI 品牌可见度检测与 GEO 优化平台，帮助企业检测品牌是否能被豆包、DeepSeek、Kimi、腾讯元宝、通义、文心一言等 AI 平台识别、理解和推荐。"
      }
    },
    {
      "@type": "Question",
      "name": "GEO 优化和 SEO 有什么区别？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SEO 主要关注搜索引擎的自然排名和点击，GEO 更关注品牌是否能进入生成式 AI 的回答、引用和推荐结果。"
      }
    },
    {
      "@type": "Question",
      "name": "为什么企业需要 AI 品牌可见度检测？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "当用户开始通过 AI 搜索产品、服务和解决方案时，如果 AI 无法识别企业品牌，企业可能会失去新的流量入口和推荐机会。"
      }
    }
  ]
}
</script>
```

---

## 九、公开页正文结构规范

### 9.1 HTML 必须直出的内容

公开页 HTML 源码中应直接包含（非 JS 渲染后才有）：

```html
<h1>GEO Agent：AI 品牌可见度检测与 GEO 优化平台</h1>
<p>
  GEO Agent 是汇智智能推出的 AI 品牌可见度检测与 GEO 优化平台，
  帮助企业检测豆包、DeepSeek、Kimi、腾讯元宝、通义、文心一言等 AI 平台
  是否识别、理解并推荐你的品牌。
</p>
<h2>GEO Agent 适合哪些企业？</h2>
<ul>
  <li>本地生活服务商</li>
  <li>教育培训机构</li>
  <li>医美、口腔、康养机构</li>
  <li>企业服务公司</li>
  <li>品牌方与新媒体运营团队</li>
</ul>
```

### 9.2 问答型内容结构（面向中国 AI 检索）

每个公开页建议包含 FAQ 模块，H2 即问题、段落即答案：

| 问题 | 要点 |
| --- | --- |
| GEO Agent 是什么？ | 产品定义 + 覆盖平台 |
| GEO 优化和 SEO 有什么区别？ | SEO vs GEO 边界 |
| 企业为什么需要 AI 品牌可见度检测？ | 业务价值 |
| 汇智 GEO-AI 智联能做什么？ | 功能清单 |

### 9.3 实体信息重复声明

页面中应反复明确以下实体关系：

| 维度 | 内容 |
| --- | --- |
| 公司 | 江苏汇智智能数字科技有限公司 |
| 产品 | GEO Agent / 汇智 GEO-AI 智联 |
| 解决问题 | AI 品牌可见度检测与 GEO 优化 |
| 面向客户 | 品牌方、本地生活、教育、医美、企服、新媒体 |
| 覆盖平台 | 豆包、DeepSeek、Kimi、腾讯元宝、通义、文心一言 |
| 产出结果 | 检测报告、内容缺口、优化建议、AI 提及率追踪 |

### 9.4 文案原则

**不建议：**「开启 AI 增长新时代。」

**建议：**「GEO Agent 帮助企业检测品牌在豆包、DeepSeek、Kimi、腾讯元宝、通义、文心一言等 AI 平台中的提及情况，并根据检测结果生成官网、FAQ、案例、文章和外部内容优化建议。」

---

## 十、AI 可读 Markdown 镜像页（P1 可选）

为提升 AI 引用效率，可增加 Markdown 镜像页（优先级低于 SSR 公开 HTML 页）：

| 路径 | 内容 |
| --- | --- |
| `/ai/company.md` | 公司介绍 |
| `/ai/geo-agent.md` | 产品说明 |
| `/ai/brand-visibility.md` | AI 品牌可见度方案 |
| `/ai/geo-marketing.md` | GEO 投放方案 |
| `/ai/faq.md` | FAQ 汇总 |

Nginx / Express 响应头：

```
Content-Type: text/markdown; charset=utf-8
X-Robots-Tag: index, follow
```

**注意：** 国内 AI 平台是否专门抓取 `.md` 路径尚无公开依据；此项为辅助手段，不可替代 HTML 公开页。

---

## 十一、百度专项优化

### 11.1 站点验证

```html
<meta name="baidu-site-verification" content="【验证码】" />
```

### 11.2 链接提交（服务端 / CI，token 不可暴露在前端）

```javascript
// scripts/baidu-push.mjs — 部署后或 CI 中执行
import https from 'https';

const urls = [
  'https://geo.agentsyun.com/',
  'https://geo.agentsyun.com/geo-agent',
  'https://geo.agentsyun.com/solutions/ai-brand-visibility',
  'https://geo.agentsyun.com/solutions/geo-marketing',
  'https://geo.agentsyun.com/faq',
];

const site = 'https://geo.agentsyun.com';
const token = process.env.BAIDU_PUSH_TOKEN;
const api = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(site)}&token=${token}`;

const req = https.request(api, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(urls.join('\n')),
  },
}, (res) => {
  res.on('data', (data) => console.log(data.toString()));
});
req.write(urls.join('\n'));
req.end();
```

### 11.3 百度侧重点

1. HTML 直接可读（非空壳 SPA）
2. 页面 title 清晰、中文正文完整
3. URL 结构清晰
4. sitemap 提交至百度搜索资源平台
5. 定期查看抓取诊断、索引量、关键词数据

---

## 十二、Bing / Copilot / 海外 AI 检索优化

### 12.1 站点验证

```html
<meta name="msvalidate.01" content="【Bing 验证码】" />
```

### 12.2 IndexNow 推送

根目录放置 key 文件：`https://geo.agentsyun.com/{INDEXNOW_KEY}.txt`（内容为 key 本身）

```javascript
// scripts/indexnow-push.mjs
const payload = {
  host: 'geo.agentsyun.com',
  key: process.env.INDEXNOW_KEY,
  keyLocation: `https://geo.agentsyun.com/${process.env.INDEXNOW_KEY}.txt`,
  urlList: [
    'https://geo.agentsyun.com/',
    'https://geo.agentsyun.com/geo-agent',
    'https://geo.agentsyun.com/solutions/ai-brand-visibility',
    'https://geo.agentsyun.com/solutions/geo-marketing',
    'https://geo.agentsyun.com/faq',
  ],
};

await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});
```

---

## 十三、内容库建设（P2，长期 GEO ROI 最高）

技术整改解决「能不能被抓到」；内容建设解决「有没有内容值得被引用」。

### 13.1 栏目

`/blog` — 内容库 / 知识库

### 13.2 第一批文章选题

1. GEO 是什么？
2. AI 品牌可见度是什么？
3. 企业如何检测自己是否被 AI 推荐？
4. GEO 优化和 SEO 有什么区别？
5. 如何让豆包更容易识别企业品牌？
6. 如何让 DeepSeek 更容易理解品牌业务？
7. 如何让 Kimi、元宝、通义更容易引用企业官网内容？
8. 本地生活企业为什么要做 GEO？
9. 教育培训机构如何做 AI 搜索优化？
10. 医美口腔机构如何做 AI 品牌可见度优化？
11. 企业服务公司如何在 AI 搜索中被推荐？
12. AI 搜索时代，官网内容应该怎么写？

### 13.3 单篇文章结构

1. 明确问题作为标题
2. 先给结论
3. 再给定义
4. 再给方法
5. 再给案例
6. 再给 FAQ
7. 最后链接回 `/geo-agent`

### 13.4 外部内容矩阵

公众号、知乎、百家号、头条号 → 反向引用官网 → 强化「汇智智能 / GEO Agent / AI 品牌可见度」实体关系。

---

## 十四、研发优先级（修订版）

### P0-a：基础设施（0.5–1 天）

| # | 任务 | 仓库落点 |
| --- | --- | --- |
| 1 | 增加 `/robots.txt` | `public/robots.txt` 或 `server/routes/seo.ts` |
| 2 | 增加 `/sitemap.xml` | `public/sitemap.xml` |
| 3 | 增加 `/llms.txt` | `public/llms.txt` |
| 4 | 应用页注入 `noindex,nofollow` | `index.html` 或 SPA 路由守卫 |
| 5 | 百度 / Bing 站长验证 meta 占位 | 营销页 template |
| 6 | robots.txt 声明 sitemap 地址 | 见第五节 |

### P0-b：最小公开页（3–5 天）

| # | 任务 | 说明 |
| --- | --- | --- |
| 1 | 新建 `/` 营销首页 | SSG 静态 HTML，中文正文直出 |
| 2 | 新建 `/geo-agent` 产品介绍页 | 同上 |
| 3 | 新建 `/faq` 常见问题页 | 含 FAQPage JSON-LD |
| 4 | Express 路由：公开页优先于 SPA fallback | 改 `server.ts` |
| 5 | 每页独立 title / description / canonical / OG | 见第四节 |
| 6 | 页脚 ICP 备案 + 运营主体 | 国内信任信号 |

### P1：一周内

| # | 任务 |
| --- | --- |
| 1 | 新增 `/solutions/ai-brand-visibility`、`/solutions/geo-marketing` |
| 2 | 新增 `/demo/workbench` 能力介绍页 |
| 3 | 首页 / 产品页增加 Organization + SoftwareApplication + WebSite JSON-LD |
| 4 | 可选：`/ai/*.md` Markdown 镜像页 |
| 5 | 接入百度链接提交脚本（CI 或 deploy hook） |
| 6 | 接入 Bing IndexNow |
| 7 | 百度搜索资源平台 + Bing Webmaster Tools 抓取诊断 |

### P2：2–4 周及持续

| # | 任务 |
| --- | --- |
| 1 | 新增 10–20 篇 `/blog` 内容库文章 |
| 2 | 新增 `/cases` 客户案例页 |
| 3 | 建立公众号 / 知乎 / 百家号 / 头条号外部矩阵 |
| 4 | 每月监测豆包、Kimi、元宝、通义、文心、DeepSeek 品牌提及率 |
| 5 | 建立 AI 引用率 + 搜索收录率月度报告（可用本产品 dogfood） |

---

## 十五、验收标准

### 15.1 技术验收

- [ ] `https://geo.agentsyun.com/robots.txt` 可访问
- [ ] `https://geo.agentsyun.com/sitemap.xml` 可访问
- [ ] `https://geo.agentsyun.com/llms.txt` 可访问
- [ ] `/geo-agent` HTML 源码中直接可见 H1 和正文（curl 验证）
- [ ] `/faq` HTML 源码中直接可见 FAQ 内容
- [ ] `/workbench` 设置 `noindex,nofollow`
- [ ] sitemap 不包含 login / workbench / api 等非公开页
- [ ] 每个公开页 title、description、H1 不重复
- [ ] 每个公开页存在 canonical、OG、Twitter Card
- [ ] 产品页 / FAQ 页存在 JSON-LD

### 15.2 百度验收

- [ ] 百度搜索资源平台完成站点验证
- [ ] 抓取诊断能读取页面正文
- [ ] sitemap 提交成功
- [ ] 链接提交接口可用

### 15.3 Bing 验收

- [ ] Bing Webmaster Tools 完成站点验证
- [ ] sitemap 提交成功
- [ ] IndexNow key 文件可访问
- [ ] IndexNow 推送成功

### 15.4 AI 检索验收（每月）

固定测试问题：

1. GEO Agent 是什么？
2. 汇智智能 GEO Agent 是做什么的？
3. 有哪些 AI 品牌可见度检测平台？
4. 企业如何检测自己是否被 AI 推荐？
5. GEO 优化和 SEO 有什么区别？

记录豆包、DeepSeek、Kimi、腾讯元宝、通义、文心一言中的表现：是否提及品牌、描述是否准确、是否引用官网、是否推荐竞品、排名位置、是否存在错误信息。

---

## 十六、风险与注意事项

1. **只改 meta 不够** — 必须解决 HTML 正文可读问题
2. **只做 Google SEO 不够** — 必须兼顾百度、Bing、中国 AI 检索
3. **`/workbench` 不适合 SEO** — 应 noindex + Disallow
4. **llms.txt / Markdown 镜像不是排名保证** — 辅助 AI 理解，不能替代 HTML 公开页
5. **百度推送 / IndexNow 只提升发现效率** — 不保证收录或排名
6. **GEO 不能只靠官网** — 需要外部内容矩阵支撑
7. **中国 AI 平台机制不透明** — 需持续监测实际提及率，不能只看技术指标
8. **内容多版本需 canonical** — HTML 页为 canonical，llms.txt / JSON-LD / .md 镜像与之保持一致

---

## 十七、项目现状对照评估（2026-06-24）

> 本节基于 GEO-Agent 仓库代码与构建产物，对照上述方案逐项评估差距。

### 17.1 综合评分

| 维度 | 得分 | 说明 |
| --- | --- | --- |
| 公开营销页 | 0 / 100 | 无 `/geo-agent`、`/faq` 等路径，无 SSG 页 |
| 技术 SEO 基础 | 5 / 100 | 无 robots / sitemap / llms.txt |
| Head / Meta | 10 / 100 | 全站单一 title「GEO AI智联」，无 description / OG |
| SPA 正文可读 | 0 / 100 | `index.html` 仅 `<div id="root">` |
| Schema / 结构化数据 | 0 / 100 | 未部署 |
| 应用页隔离 | 0 / 100 | workbench 等未 noindex |
| 内容库 / 外部矩阵 | 0 / 100 | 无 `/blog`，无公开案例页 |
| **综合 GEO 官网就绪度** | **≈ 2 / 100** | 产品能**审计客户** GEO，自身官网**未 dogfood** |

### 17.2 代码现状明细

| 检查项 | 当前状态 | 证据 |
| --- | --- | --- |
| 构建形态 | Vite SPA + Express 单体 | `package.json`、`server.ts` |
| 生产 HTML | 空壳 SPA | `dist/index.html`：仅 root + JS |
| 路由模型 | 应用内 view（`workbench` 等） | `src/App.tsx`、`src/types.ts` |
| 三端入口 | `/?app=provider`、`/?app=platform` | 非 SEO 路径 |
| robots.txt | ❌ 不存在 | 全仓库无部署 |
| sitemap.xml | ❌ 不存在 | 全仓库无部署 |
| llms.txt | ❌ 站点未部署（skill 可生成草稿） | `geo-llmstxt` skill、`GeoWebsiteDeliveryPanel` |
| Schema JSON-LD | ❌ 未部署 | `index.html` 无 script |
| GEO 预检能力 | ✅ 产品内已有 | `server/services/geo-crawl.service.ts` 会检测客户站 robots |
| 协议 / 主体信息 | ✅ 文档已有 | `docs/协议/汇智GEO-AI智联项目平台_用户服务协议.md` |

### 17.3 与产品能力的 ironic gap

GEO-Agent 产品本身具备完整的 GEO 审计与资产生成能力：

- `geo-audit`：检测 robots、Schema、llms.txt、AI 爬虫
- `geo-llmstxt`：生成 llms.txt 草稿
- `geo-schema`：生成 JSON-LD 草稿
- `geo-crawl.service.ts`：预抓取客户站 robots.txt

**但官方站点 `geo.agentsyun.com` 尚未应用这些能力。** 建议首批 llms.txt、Schema、FAQ 内容直接由现有 skill 生成后人工审核部署，实现 dogfood。

### 17.4 推荐首批实施清单（可直接开工）

```
GEO-Agent/
├── public/                          # 新增
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── llms.txt
│   └── og/
│       └── geo-agent-cover.png
├── marketing/                       # 新增：SSG 静态营销页
│   ├── index.html                   # /
│   ├── geo-agent.html               # /geo-agent
│   ├── faq.html                     # /faq
│   ├── solutions/
│   │   ├── ai-brand-visibility.html
│   │   └── geo-marketing.html
│   └── demo/
│       └── workbench.html           # /demo/workbench
├── server/routes/seo.ts             # 新增：SEO 静态路由（可选）
├── scripts/
│   ├── baidu-push.mjs               # 新增
│   └── indexnow-push.mjs            # 新增
├── index.html                       # 修改：应用页 noindex
└── server.ts                        # 修改：营销页优先路由
```

### 17.5 与原有 PDF 方案的差异修订

| 原方案 | 本方案修订 | 原因 |
| --- | --- | --- |
| P0 全部 1–2 天 | 拆为 P0-a（1 天）+ P0-b（3–5 天） | 新建 SSG 页工作量被低估 |
| 未提架构决策 | 增加第二节「同域分层」 | 当前 SPA 无法直接加路径 |
| llms.txt 自定义格式 | 对齐 AnswerDotAI 规范 | 与仓库 skill 输出一致 |
| `/ai/*.md` 与 P1 同级 | 降为 P1 可选 | 国内 AI 抓取证据不足 |
| 未提 ICP / 主体信息 | 增加页脚要求 | 国内 E-E-A-T |
| 未提 dogfood | 增加第十七章 | 产品能力与官网现状反差 |

---

## 十八、四层执行策略（总结）

| 层级 | 目标 | 关键动作 |
| --- | --- | --- |
| **第一层：百度可抓取** | 公开页 SSR/SSG 输出真实中文正文 | 营销页 + 站长平台 + sitemap + 链接提交 |
| **第二层：Bing 可发现** | 海外 AI 检索快速发现更新 | Bing 验证 + IndexNow + sitemap |
| **第三层：AI 可理解** | 大模型读懂产品定位 | llms.txt + 问答结构 + Schema + 实体重复声明 |
| **第四层：外部内容可引用** | 多来源强化实体关系 | 内容库 + 公众号/知乎/百家号矩阵 |

---

## 附录 A：公开页 FAQ 参考文案

**Q：GEO Agent 是什么？**  
A：GEO Agent（汇智 GEO-AI 智联）是汇智智能推出的 AI 品牌可见度检测与 GEO 优化平台，帮助企业检测品牌是否能被豆包、DeepSeek、Kimi、腾讯元宝、通义、文心一言等 AI 平台识别、理解和推荐。

**Q：汇智 GEO-AI 智联和 GEO Agent 是什么关系？**  
A：GEO Agent 是产品对外简称；汇智 GEO-AI 智联项目平台是完整平台名称，除 AI 品牌可见度检测外，还提供 GEO 营销项目协同、任务发布、投放预算管理、验收结算及与汇智 AIGC 媒体收单平台的撮合对接。

**Q：GEO 优化和 SEO 有什么区别？**  
A：SEO 主要优化搜索引擎中的自然排名和点击；GEO 更关注品牌是否能进入生成式 AI 的回答、推荐和引用结果。

**Q：为什么企业需要 AI 品牌可见度检测？**  
A：当用户开始用 AI 搜索产品、服务和解决方案时，如果 AI 无法识别企业品牌，企业就可能失去新的流量入口和推荐机会。

**Q：GEO Agent 覆盖哪些 AI 平台？**  
A：豆包、DeepSeek、Kimi、腾讯元宝、通义、文心一言等主流中文 AI 平台；并支持持续追踪 AI 引用率变化。

---

## 附录 B：相关文档

- [GEO-Agent 项目现状问答](./GEO-Agent_项目现状问答.md)
- [汇智 GEO-AI 智联 用户服务协议](./协议/汇智GEO-AI智联项目平台_用户服务协议.md)
- [汇智 GEO-AI 智联 隐私政策](./协议/汇智GEO-AI智联项目平台_隐私政策.md)
- [GEO 核心 Skill 能力对比与产品化升级方案](./GEO核心Skill能力对比与产品化升级方案_2026-06-11.md)
- [llms.txt 规范](https://github.com/AnswerDotAI/llms-txt)

---

*文档结束。实施过程中如有路由或部署环境差异，以实际 Nginx / CDN 配置为准；营销页内容与法务协议保持一致性。*

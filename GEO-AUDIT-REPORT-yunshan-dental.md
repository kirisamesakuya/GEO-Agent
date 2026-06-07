# GEO 技术审计报告: yunshan-dental.cn（云杉牙科）

**审计日期:** 2026-06-06  
**URL:** https://www.yunshan-dental.cn  
**业务类型:** 牙科诊所 / 线下医疗服务  
**关联品牌:** 汇智智能 (HZ Intelligence)  
**执行引擎:** Hermes Agent  
**审计基线:** 网站 DNS 解析完全失败，当前评分 0/100  

---

## 诊断摘要

| 诊断项 | 状态 | 说明 |
|--------|------|------|
| DNS A记录解析 | FAIL | 所有DNS查询超时，nslookup/dig均无响应 |
| DNS NS记录 | FAIL | 无法获取权威名称服务器 |
| HTTPS (443) 访问 | FAIL | curl: Could not resolve host |
| HTTP (80) 访问 | FAIL | curl: Could not resolve host |
| 搜索引擎收录 | FAIL 0条 | site:yunshan-dental.cn 无任何索引 |
| WHOIS 信息 | PENDING | .cn域名需通过CNNIC查询 |

**根因分析:** 域名 yunshan-dental.cn 未在DNS系统中正确配置，或域名未注册/已过期/被暂停。这是最底层的阻断性问题。

---

## 综合技术评分

| 维度 | 得分 | 满分 | 权重 | 加权分 | 说明 |
|------|------|------|------|--------|------|
| DNS / 域名可达性 | 0 | 100 | x0.25 | 0.0 | DNS完全失败 |
| HTTPS/SSL 配置 | 0 | 100 | x0.15 | 0.0 | 无服务器可达 |
| 渲染方式 / AI爬虫友好 | 0 | 100 | x0.15 | 0.0 | 无页面可评估 |
| robots.txt / Sitemap | 0 | 100 | x0.15 | 0.0 | 无站点可抓取 |
| Core Web Vitals | 0 | 100 | x0.15 | 0.0 | 无页面可测量 |
| 域名 / URL 结构 | 10 | 100 | x0.15 | 1.5 | 域名名称可接受，但不可解析 |

### 当前技术评分: 1.5 / 100（严重故障 CRITICAL）

```
████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1.5%

状态: CRITICAL — 网站在互联网上完全不存在
```

---

# 详细技术审计

## 1. DNS / 域名状态分析

### 1.1 当前实测

```
$ nslookup www.yunshan-dental.cn
DNS request timed out. timeout was 2 seconds.
-> 无法解析

$ nslookup yunshan-dental.cn
DNS request timed out. timeout was 2 seconds.
-> 裸域同样无法解析

$ curl -v https://www.yunshan-dental.cn
Could not resolve host: www.yunshan-dental.cn
-> HTTP/HTTPS 均不可达
```

### 1.2 牙科诊所 DNS 配置标准（应达到的目标）

| 记录类型 | 名称 | 推荐值 | 用途 |
|----------|------|--------|------|
| **A** | @ (裸域) | 服务器 IPv4 | 必须指向Web服务器 |
| **A** | www | 服务器IPv4或CNAME | 与裸域一致或重定向 |
| **AAAA** | @ / www | 服务器IPv6 | 支持IPv6用户（加分项） |
| **CNAME** | www | 裸域或CDN端点 | 推荐统一到一个权威来源 |
| **MX** | @ | 邮件服务器 | 诊所邮箱 (hello@yunshan-dental.cn) |
| **TXT** | @ | SPF/DKIM/DMARC | 邮件安全 + 域名验证(Search Console) |
| **NS** | -- | 注册商/DNS托管商 | 推荐阿里云DNS / DNSPod / Cloudflare |

### 1.3 故障原因（按概率排序）

1. **域名未注册** -- 检查CNNIC WHOIS确认注册状态
2. **域名已过期** -- .cn域名到期后未续费，进入redemptionPeriod
3. **DNS托管服务未配置** -- 域名已注册但未在DNS控制台添加解析记录
4. **注册商暂停解析** -- 因实名认证/备案问题被注册商停止解析（中国.cn域名特有风险）
5. **NS记录错误** -- 指向了不存在的名称服务器

### 1.4 修复步骤

| 步骤 | 操作 | 验证方式 |
|------|------|----------|
| 1 | 到CNNIC/阿里云/腾讯云WHOIS查询域名状态 | whois yunshan-dental.cn |
| 2 | 如未注册 -> 立即注册（.cn需实名认证） | 推荐阿里云万网/腾讯云 |
| 3 | 如已过期 -> 续费并等待DNS传播 (<48h) | dig +trace yunshan-dental.cn |
| 4 | 添加A记录指向Web服务器IP | nslookup yunshan-dental.cn |
| 5 | 配置www -> 裸域CNAME或重定向 | curl -I http://yunshan-dental.cn |
| 6 | ICP备案（中国大陆服务器必需） | https://beian.miit.gov.cn |

---

## 2. HTTPS / SSL 配置要求

### 2.1 牙科诊所网站 HTTPS 最低标准

牙科诊所处理患者预约信息、联系方式，HTTPS是**最低安全基线**：

| 配置项 | 要求 | 优先级 |
|--------|------|:---:|
| **TLS版本** | 至少TLS 1.2，推荐TLS 1.3 | P0 |
| **证书类型** | Let's Encrypt（免费）或商业DV/OV证书 | P0 |
| **HTTP->HTTPS** | 301永久重定向 | P0 |
| **HSTS** | Strict-Transport-Security: max-age=31536000; includeSubDomains; preload | P1 |
| **证书覆盖** | 同时覆盖裸域和www子域（多SAN或通配符） | P0 |
| **自动续期** | Certbot / acme.sh 自动续期 | P1 |

### 2.2 推荐Nginx配置

```nginx
server {
    listen 80;
    server_name yunshan-dental.cn www.yunshan-dental.cn;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yunshan-dental.cn www.yunshan-dental.cn;
    ssl_certificate     /etc/ssl/yunshan-dental.crt;
    ssl_certificate_key /etc/ssl/yunshan-dental.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
```

### 2.3 当前状态

| 项 | 状态 |
|----|------|
| TLS证书部署 | 0% -- 无服务器可达 |
| HTTP->HTTPS重定向 | 0% -- 同上 |
| HSTS | 0% -- 同上 |
| SSL Labs评级 | N/A -- 不可测 |

---

## 3. robots.txt 和 Sitemap 部署计划

### 3.1 robots.txt 推荐配置

```
# https://www.yunshan-dental.cn/robots.txt

User-agent: *
Allow: /

# GEO核心：显式允许AI搜索引擎爬取
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Anthropic-AI
Allow: /

# 禁止爬取管理后台和敏感路径
User-agent: *
Disallow: /admin/
Disallow: /wp-admin/
Disallow: /api/private/
Disallow: /patient-records/

# Sitemap位置
Sitemap: https://www.yunshan-dental.cn/sitemap.xml
```

### 3.2 Sitemap 多索引架构

```xml
<!-- sitemap-index.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.yunshan-dental.cn/sitemap-pages.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.yunshan-dental.cn/sitemap-services.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.yunshan-dental.cn/sitemap-doctors.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.yunshan-dental.cn/sitemap-blog.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://www.yunshan-dental.cn/sitemap-images.xml</loc>
  </sitemap>
</sitemapindex>
```

### 3.3 每条URL的元数据规范

```xml
<url>
  <loc>https://www.yunshan-dental.cn/services/dental-implants</loc>
  <lastmod>2026-06-01</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

### 3.4 GEO特别注意事项

- **AI爬虫策略必须显式声明Allow**：GPTBot、Claude-Web、PerplexityBot等
- **避免无心屏蔽**：默认 User-agent: * Disallow: / 会同时屏蔽AI爬虫
- **Sitemap提交渠道**：Google Search Console + Bing Webmaster Tools + 百度站长平台
- 可直接ping：GET /ping?sitemap=https://www.yunshan-dental.cn/sitemap.xml

---

## 4. 渲染方式对 AI 爬虫影响

### 4.1 渲染方式对比

| 渲染方式 | AI爬虫友好度 | GEO得分影响 | 说明 |
|----------|:---:|:---:|------|
| **SSR (服务端渲染)** | 5星 | +25% | 首字节即含完整HTML，所有爬虫可消费 |
| **SSG (静态生成)** | 5星 | +25% | 构建时生成HTML，效果近似SSR |
| **ISR (增量静态再生)** | 4星 | +20% | Next.js ISR，兼顾静态速度与动态新鲜度 |
| **CSR (客户端渲染)** | 2星 | -30% | React/Vue SPA，多数AI爬虫不执行JS |
| **纯HTML** | 4星 | +15% | 简单可靠，但缺少动态能力 |

### 4.2 推荐架构：Next.js (SSR/SSG/ISR 混用)

```
+-------------------------------------------+
| 首页、服务页、医生介绍、诊所信息            |
| -> SSG (构建时静态生成，CDN分发)             |
+-------------------------------------------+
| 博客文章、科普内容、新闻                    |
| -> ISR (revalidate: 3600，每小时更新)       |
+-------------------------------------------+
| 预约表单、搜索、患者门户                    |
| -> SSR (服务端按需渲染)                     |
+-------------------------------------------+
```

### 4.3 核心原则

> **任何AI爬虫能读到的内容，必须在服务端HTML响应中直接存在。**
> 不要依赖JavaScript来渲染诊所名称、地址、服务列表、医生信息、联系方式和预约链接。

### 4.4 验证方法

```bash
# 模拟AI爬虫视角（不执行JS）
curl https://www.yunshan-dental.cn | grep -i "牙科|dental|种植|矫正"

# Google富结果测试工具
# https://search.google.com/test/rich-results

# Google缓存版本检查
# cache:https://www.yunshan-dental.cn
```

---

## 5. Core Web Vitals 优化建议

### 5.1 目标指标

| 指标 | 目标值(Good) | 测量工具 |
|------|:---:|------|
| **LCP** (最大内容绘制) | <= 2.5s | PageSpeed Insights / Lighthouse |
| **INP** (交互到下次绘制) | <= 200ms | Chrome UX Report / Search Console |
| **CLS** (累计布局偏移) | <= 0.1 | PageSpeed Insights / Lighthouse |
| **TTFB** (首字节时间) | <= 800ms | WebPageTest |
| **FCP** (首次内容绘制) | <= 1.8s | Lighthouse |

### 5.2 牙科网站特有优化项

#### A. 图片优化（最大痛点）

牙科诊所网站通常有大量高清照片：诊所环境、设备、医生肖像、治疗对比图。

```html
<!-- 推荐做法 -->
<picture>
  <source srcset="/images/clinic.webp" type="image/webp">
  <source srcset="/images/clinic.avif" type="image/avif">
  <img src="/images/clinic.jpg"
       alt="云杉牙科诊所前台"
       loading="lazy"
       width="1200" height="800"
       decoding="async">
</picture>
```

关键措施：
- WebP/AVIF格式（比JPEG小30-50%）
- 响应式图片：srcset + sizes
- 懒加载：loading="lazy" + decoding="async"
- 首屏大图预加载：link rel="preload" as="image" href="hero.webp"

#### B. 字体优化

```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap; /* 防止FOIT/CLS */
}
```

#### C. 第三方脚本管控

牙科网站常见第三方：在线预约系统、百度统计/GA、在线客服IM、百度地图/高德。

原则：async关键脚本，defer非关键脚本。使用facade模式延迟加载第三方组件。

#### D. 服务器与CDN

- 国内CDN：阿里云CDN / 腾讯云CDN / 又拍云
- 静态资源长缓存：Cache-Control: public, max-age=31536000, immutable
- HTML短缓存：Cache-Control: public, max-age=3600
- 启用Brotli压缩

---

## 6. 域名和 URL 结构

### 6.1 域名评估

| 评估维度 | 评分 | 说明 |
|----------|:---:|------|
| **品牌匹配度** | 4/5 | yunshan-dental直译"云杉牙科"，匹配度高 |
| **拼写难度** | 4/5 | 英文拼音组合，海外用户也易理解 |
| **长度** | 3/5 | 含连字符，18字符偏长但可接受 |
| **TLD选择** | 4/5 | .cn适合中国本土诊所定位 |
| **可记忆性** | 3/5 | "yun-shan-dental"三段式，连字符降低直接输入率 |

### 6.2 域名改进建议

| 优先级 | 建议 | 说明 |
|--------|------|------|
| P1 | 注册 yunshandental.cn (无连字符版) | 避免用户漏打连字符导致丢失 |
| P2 | 注册 yunshandental.com / yunshan-dental.com | 国际化品牌保护 |
| P2 | 注册 云杉牙科.cn / 云杉牙科.com | 中文域名直达 |

### 6.3 推荐 URL 结构

```
/                                       首页
/services/                              服务项目
  /services/dental-implants/            种植牙
  /services/orthodontics/               牙齿矫正
  /services/teeth-whitening/            牙齿美白
  /services/pediatric-dentistry/        儿童牙科
  /services/periodontics/               牙周治疗
  /services/root-canal/                 根管治疗
/doctors/                               医生团队
  /doctors/dr-zhang-san/                医生详情
/about/                                 关于我们
  /about/gallery/                       诊所环境
  /about/equipment/                     设备介绍
/blog/                                  科普文章
  /blog/teeth-whitening-guide/          文章详情
/appointment/                           预约
/contact/                               联系方式
/faq/                                   常见问题
```

### 6.4 URL 设计原则

1. **全部小写，单词用连字符**：/dental-implants/ OK；/DentalImplants/ NG
2. **URL反映内容层级**，但不超过3级深度
3. **中文页面使用拼音URL**或独立的/zh/路径前缀
4. **避免URL参数** ?id=123，使用语义化slug
5. **301重定向处理**旧URL（如有）

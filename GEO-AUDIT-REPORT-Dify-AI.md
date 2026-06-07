# GEO Audit Report: Dify.AI

**审计日期:** 2026-06-06
**URL:** https://dify.ai
**业务类型:** AI SaaS (Agentic Workflow Platform)
**执行引擎:** Hermes Agent (nous_hermes)

---

## 综合评分

| 维度 | 得分 | 满分 | 加权分 |
|------|------|------|--------|
| AI 引用就绪度 | 36 | 100 | 9.0 |
| 品牌权威 | 75 | 100 | 15.0 |
| 内容 E-E-A-T | 65 | 100 | 13.0 |
| 技术 GEO | 78 | 100 | 11.7 |
| Schema & 结构化数据 | 0 | 100 | 0.0 |
| 平台优化 | 55 | 100 | 5.5 |

**综合 GEO 评分: 54/100（中等偏弱）**

---

## 🔴 关键问题 (P0 - 立即修复)

1. **Schema.org JSON-LD 完全缺失** — Organization/SoftwareApplication/Article 均无标记
   - 影响: AI crawler 无法结构化理解品牌实体
   - 修复: 在首页添加 Organization + SoftwareApplication JSON-LD
   
2. **Open Graph / Twitter Card 缺失** — 所有社交分享无富媒体预览
   - 影响: 降低社交传播点击率，削弱 AI 引用信号
   - 修复: 全站添加 og:title/og:description/og:image/twitter:card

3. **robots.txt 可访问性存疑** — 部分代理报告 WAF/CDN 阻断
   - 影响: 可能导致 AI crawler 无法合规抓取
   - 修复: 确认 /robots.txt 返回 200，显式声明 AI bot 策略

## 🟠 高优先级 (P1)

4. **Sitemap 缺少 lastmod/priority/changefreq** — 搜索引擎无法高效判断内容新鲜度
5. **安全响应头几乎空白** — 缺少 X-Frame-Options/CSP/HSTS
6. **首页视频负载过重** — 多个 MP4 文件影响 LCP

---

## 30 天行动计划

**Week 1:** 部署 Schema.org JSON-LD + Open Graph 标签
**Week 2:** 修复 robots.txt + 增强 Sitemap 元数据
**Week 3:** 补齐安全响应头 + HSTS
**Week 4:** 首页性能优化 + 多语言 Schema 覆盖

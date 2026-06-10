import type { CrawlSnapshot, RuleFinding, RuleScorePreview } from './geo-crawl-snapshot.js';

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function mkFinding(
  id: string,
  level: RuleFinding['level'],
  category: RuleFinding['category'],
  title: string,
  impact: string,
  suggestion: string,
  evidence: string
): RuleFinding {
  return { id, level, category, title, impact, suggestion, evidence, source: 'rule' };
}

/** Deterministic rule-based scoring from pre-crawl snapshot. */
export function scoreFromCrawlSnapshot(snapshot: CrawlSnapshot): RuleScorePreview {
  const findings: RuleFinding[] = [];
  let technicalGeo = 100;
  let schema = 100;
  let crawlerAccess = 100;

  const home = snapshot.homepage;
  const meta = snapshot.htmlMeta;
  const robots = snapshot.robotsTxt;

  if (home.error || home.status == null) {
    technicalGeo -= 40;
    findings.push(
      mkFinding(
        'rule-home-unreachable',
        'critical',
        'technical',
        '官网无法访问',
        '搜索引擎与 AI 爬虫无法获取页面内容',
        '检查域名解析、HTTPS 证书与服务器可用性',
        `URL=${snapshot.brandUrl}；错误=${home.error ?? 'unknown'}`
      )
    );
  } else if (home.status >= 400) {
    technicalGeo -= 30;
    findings.push(
      mkFinding(
        'rule-home-http-error',
        'high',
        'technical',
        `官网返回 HTTP ${home.status}`,
        '页面无法正常展示，影响收录与 AI 引用',
        '修复服务器错误码或重定向配置',
        `URL=${snapshot.brandUrl}；HTTP=${home.status}；耗时=${home.responseTimeMs}ms`
      )
    );
  }

  if (meta && !meta.hasHttps) {
    technicalGeo -= 15;
    findings.push(
      mkFinding(
        'rule-no-https',
        'medium',
        'technical',
        '官网未使用 HTTPS',
        '降低信任信号，部分 AI 数据源偏好安全站点',
        '配置 SSL 证书并强制 HTTPS 跳转',
        `URL=${snapshot.brandUrl}；protocol=http`
      )
    );
  }

  if (!meta) {
    schema -= 35;
    technicalGeo -= 20;
    findings.push(
      mkFinding(
        'rule-no-html-meta',
        'high',
        'technical',
        '未能解析页面 HTML 元信息',
        '无法评估标题、描述与结构化数据',
        '确认 URL 返回可解析的 HTML 页面',
        `URL=${snapshot.brandUrl}；contentType=${home.contentType ?? 'unknown'}`
      )
    );
  } else {
    if (!meta.title) {
      technicalGeo -= 12;
      findings.push(
        mkFinding(
          'rule-missing-title',
          'medium',
          'technical',
          '页面缺少 title 标签',
          '影响搜索与 AI 对页面主题的理解',
          '为首页添加描述品牌与服务的 <title>',
          `URL=${snapshot.brandUrl}；title=缺失`
        )
      );
    }
    if (!meta.h1) {
      technicalGeo -= 8;
      findings.push(
        mkFinding(
          'rule-missing-h1',
          'low',
          'technical',
          '页面缺少 H1 标题',
          '主标题缺失会降低内容结构清晰度',
          '在首页添加明确的 H1，概括核心业务',
          `URL=${snapshot.brandUrl}；h1=缺失`
        )
      );
    }
    if (!meta.metaDescription) {
      technicalGeo -= 6;
      findings.push(
        mkFinding(
          'rule-missing-meta-desc',
          'low',
          'content_quality',
          '缺少 meta description',
          '摘要缺失时 AI 可能自行截取不准确片段',
          '补充 80–160 字的 meta description',
          `URL=${snapshot.brandUrl}；metaDescription=缺失`
        )
      );
    }
    if (meta.jsonLdCount === 0) {
      schema -= 45;
      findings.push(
        mkFinding(
          'rule-no-jsonld',
          'high',
          'schema',
          '未检测到 JSON-LD 结构化数据',
          'AI 与搜索引擎难以准确识别机构/服务实体',
          '在 <head> 嵌入 Organization/LocalBusiness 等 JSON-LD',
          `URL=${snapshot.brandUrl}；jsonLdCount=0`
        )
      );
    } else if (meta.jsonLdCount < 2) {
      schema -= 15;
      findings.push(
        mkFinding(
          'rule-sparse-jsonld',
          'medium',
          'schema',
          '结构化数据较少',
          '建议补充服务、FAQ 等 Schema 类型',
          '增加 Service、FAQPage 等 JSON-LD 块',
          `URL=${snapshot.brandUrl}；jsonLdCount=${meta.jsonLdCount}`
        )
      );
    }
  }

  if (robots.blockedBots.length > 0) {
    crawlerAccess -= 25 * Math.min(robots.blockedBots.length, 3);
    findings.push(
      mkFinding(
        'rule-robots-block-ai',
        'high',
        'crawlers',
        'robots.txt 可能拦截 AI 爬虫',
        '被拦截的爬虫无法抓取站点内容供 AI 训练/引用',
        '检查 robots.txt，对 AI 爬虫使用 Allow 或移除全局 Disallow',
        `robotsUrl=${robots.url}；blocked=${robots.blockedBots.join(', ')}`
      )
    );
  } else if (!robots.fetched || robots.error) {
    crawlerAccess -= 10;
    findings.push(
      mkFinding(
        'rule-robots-unverified',
        'low',
        'crawlers',
        '未能验证 robots.txt',
        '无法确认 AI 爬虫访问策略',
        '确保 /robots.txt 可公开访问',
        `robotsUrl=${robots.url}；error=${robots.error ?? 'not fetched'}`
      )
    );
  }

  if (home.responseTimeMs > 3000) {
    technicalGeo -= 10;
    findings.push(
      mkFinding(
        'rule-slow-response',
        'medium',
        'technical',
        '首页响应较慢',
        '慢速页面降低爬虫抓取效率与用户体验',
        '优化 TTFB、CDN 与静态资源加载',
        `URL=${snapshot.brandUrl}；responseTimeMs=${home.responseTimeMs}`
      )
    );
  }

  technicalGeo = clamp(technicalGeo);
  schema = clamp(schema);
  crawlerAccess = clamp(crawlerAccess);

  const scores: Record<string, number> = {
    technicalGeo,
    schema,
    crawlerAccessScore: crawlerAccess,
    technicalScore: technicalGeo,
  };

  const totalScore = clamp(technicalGeo * 0.45 + schema * 0.35 + crawlerAccess * 0.2);

  return {
    scores,
    totalScore,
    findings,
    scoringSource: 'rule',
  };
}

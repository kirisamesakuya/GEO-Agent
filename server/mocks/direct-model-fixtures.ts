/** direct_model 任务 Mock 输出生成器 */
import { buildIndexSamplePayload } from '../../lib/index-result-payload.js';
import { CAMPAIGN_PLAN_PLATFORM_LABELS } from '../../lib/media-platforms.js';

export function asStringArray(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)).filter(Boolean) : fallback;
}

export function mockKeywordMining(input: Record<string, unknown>) {
  const brand = String(input.brand ?? input.brandName ?? '品牌');
  const industry = String(input.industry ?? '本地服务');
  return {
    suggestions: [
      { term: `${brand} 怎么样`, group: 'brand' },
      { term: `${brand} 推荐`, group: 'brand' },
      { term: `${industry} 哪家好`, group: 'industry' },
      { term: `${industry} 价格`, group: 'industry' },
      { term: `${brand} 用户评价`, group: 'longtail' },
      { term: `${brand} 附近门店`, group: 'geo' },
      { term: `${industry} 真实案例`, group: 'longtail' },
      { term: `${brand} FAQ`, group: 'geo' },
      { term: `${industry} 避坑`, group: 'longtail' },
      { term: `${brand} 和竞品对比`, group: 'competitor' },
    ],
    source: 'mock_ai',
  };
}

export function mockKnowledgeExtract(input: Record<string, unknown>) {
  const brand = String(input.brand ?? input.brandName ?? '品牌');
  const industry = String(input.industry ?? '本地服务');
  return {
    entries: [
      {
        category: 'intro',
        title: `${brand}企业介绍`,
        body: `${brand}专注${industry}，为本地客户提供可验证的专业服务与透明报价。`,
      },
      {
        category: 'product',
        title: '核心服务',
        body: `主打${industry}相关核心项目，支持预约咨询、到店体验与售后跟进。`,
      },
      {
        category: 'faq',
        title: '常见问题',
        body: `Q：${brand}适合哪些客户？A：有${industry}需求、重视服务品质的用户。`,
      },
      {
        category: 'credential',
        title: '资质与背书',
        body: '请补充真实证照与授权信息后再用于对外发布（当前为 AI 草稿）。',
      },
    ],
    source: 'mock_ai',
  };
}

export function mockIndexSampling(input: Record<string, unknown>) {
  const keywords = asStringArray(input.keywords, ['品牌推荐', '服务价格']);
  const platforms = asStringArray(input.platforms, ['豆包', '元宝']);
  const brandName = String(input.brand ?? input.brandName ?? '目标品牌');
  return {
    results: keywords.flatMap((keyword, keywordIndex) =>
      platforms.map((platform, platformIndex) => {
        const hit = (keywordIndex + platformIndex) % 2 === 0;
        const citedMerchant = keywordIndex % 2 === 0;
        const payload = buildIndexSamplePayload({
          keyword,
          platform,
          hit,
          citedMerchant,
          brandName,
        });
        return {
          keyword,
          platform,
          hit,
          citedMerchant,
          citationSnippet: payload.citationSnippet,
          aiResponse: payload.aiResponse,
          citationUrls: payload.citationUrls,
        };
      })
    ),
    samplingMethod: 'mock_ai',
  };
}

export function mockCampaignPlan(input: Record<string, unknown>) {
  const brand = String(input.brand ?? input.brandName ?? '品牌');
  const goal = String(input.goal ?? '提升品牌 GEO 可见度');
  const source = String(input.source ?? (input.geoReportId ? 'geo_report' : 'brand_profile'));
  const fromGeo = source === 'geo_report' || Boolean(input.geoReportId);
  const fromIndex = source === 'indexing_result';
  const gaps = Number(input.gapsFound ?? 5);
  const budgetMin = Number(input.budgetMin ?? 5000);
  const budgetMax = Number(input.budgetMax ?? 20000);
  const totalBudget = Math.round((budgetMin + budgetMax) / 2);
  const platforms = asStringArray(input.platforms, [...CAMPAIGN_PLAN_PLATFORM_LABELS]);
  const opt = String(input.optimizationSuggestions ?? '').slice(0, 80);
  const contextNote = fromGeo
    ? opt || '覆盖 GEO 报告缺口关键词与问答场景'
    : fromIndex
      ? '针对排名缺口问答补位，提升品牌提及与引用'
      : goal.slice(0, 80);

  const buildPkg = (pkg: {
    name: string;
    platform: string;
    payeeType: string;
    quantity: number;
    totalBudget: number;
    deliverable: string;
    acceptance: string;
  }) => {
    const quantity = Math.max(1, pkg.quantity);
    const unitPrice = Math.max(100, Math.round(pkg.totalBudget / quantity));
    return {
      name: pkg.name,
      platform: pkg.platform,
      payeeType: pkg.payeeType,
      quantity,
      unitPrice,
      budget: unitPrice * quantity,
      deliverable: pkg.deliverable,
      acceptance: pkg.acceptance,
    };
  };

  const articlePlatforms = platforms.filter((p) => p !== '网站');
  const packages: Array<Record<string, unknown>> = [];
  const perPlatformBudget = Math.round(totalBudget / Math.max(articlePlatforms.length, 1));

  articlePlatforms.forEach((platform, index) => {
    const weight = index === 0 ? 1.15 : index === 1 ? 1.05 : 0.9;
    const quantity = fromGeo
      ? Math.max(2, Math.min(5, Math.ceil(gaps / Math.max(articlePlatforms.length, 1))))
      : index < 2
        ? 3
        : index < 4
          ? 2
          : 1;
    const payeeType = platform === '小红书' || platform === '抖音' ? '达人' : '内容写手';
    packages.push(
      buildPkg({
        name: `${brand} · ${platform} · 内容投放`,
        platform,
        payeeType,
        quantity,
        totalBudget: Math.round(perPlatformBudget * weight),
        deliverable: `${quantity} 篇${platform}内容：${contextNote}`,
        acceptance: '符合品牌调性，含核心关键词，提交发布链接与截图',
      })
    );
  });

  if (platforms.includes('网站')) {
    packages.push(
      buildPkg({
        name: `${brand} · 官网 GEO 优化`,
        platform: '网站',
        payeeType: '网页设计师',
        quantity: 1,
        totalBudget: Math.round(totalBudget * 0.12),
        deliverable: '官网落地页结构化优化，提升 AI 可引用性',
        acceptance: '交付可部署页面与预览链接',
      })
    );
  }

  return { goal, packages, source: fromGeo ? 'mock_ai_geo' : 'mock_ai' };
}

export function mockWebsitePreview(input: Record<string, unknown>) {
  const brand = String(input.brand ?? input.brandName ?? '品牌');
  const pageType = String(input.pageType ?? '品牌介绍页');
  const goal = String(input.goal ?? '提升品牌页面转化与 GEO 可见度');
  const referenceUrl = String(input.referenceUrl ?? '').trim();
  const modules = asStringArray(input.modules, [
    'Hero 首屏',
    '服务介绍',
    '案例背书',
    'FAQ',
    '联系转化',
  ]);
  const attachments = Array.isArray(input.attachments) ? input.attachments : [];
  const moduleHtml = modules
    .map(
      (mod) =>
        `<section class="mod"><h2>${mod}</h2><p>${brand} · ${pageType} — ${mod} 模块文案草稿（Mock）。围绕「${goal.slice(0, 40)}」组织内容。</p></section>`
    )
    .join('');
  const refBlock = referenceUrl
    ? `<p class="ref">参考页面：<a href="${referenceUrl}">${referenceUrl}</a></p>`
    : '';
  const attachBlock =
    attachments.length > 0
      ? `<p class="meta">已附 ${attachments.length} 份参考材料（Logo/截图/文档）</p>`
      : '';

  return {
    modules,
    headline: `${brand} · ${pageType}`,
    deliverable: `完整 ${pageType} HTML 结构稿、模块文案与预览链接`,
    acceptance: '发布方确认预览结构后，网页设计师交付可部署页面文件',
    payeeType: '网页设计师',
    previewHtml: `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${brand} · ${pageType}</title><style>
      body{font-family:system-ui,-apple-system,sans-serif;margin:0;background:#f4f6f8;color:#1a1a1a}
      .wrap{max-width:960px;margin:0 auto;padding:24px}
      header,section,footer{background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
      h1{margin:0 0 8px;font-size:28px} h2{margin:0 0 8px;font-size:18px;color:#333}
      .tag{display:inline-block;font-size:12px;padding:2px 8px;border-radius:6px;background:#e8f4ff;color:#1677ff;margin-right:6px}
      .ref,.meta{font-size:13px;color:#666}
    </style></head><body><div class="wrap">
      <header><span class="tag">网页改装预览</span><span class="tag">${pageType}</span><h1>${brand}</h1><p>${goal}</p>${refBlock}${attachBlock}</header>
      ${moduleHtml}
      <footer><h2>交付说明</h2><p>本预览为 HTML 结构稿，确认后将创建「网页设计师」接单任务，非文章写作单。</p></footer>
    </div></body></html>`,
    source: 'mock_ai',
  };
}

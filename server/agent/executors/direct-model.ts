import type { AgentExecutor, AgentTask } from '../types.js';
import { taskRequiresHermesExecutor, allowsDirectModelGeoFixtureMock } from '../../lib/agent-status.js';
import {
  buildMockAccountVerifyOutput,
  buildMockHermesPublishOutput,
} from '../../lib/hermes-publish-mock.js';
import { fixtureForGeoTaskType } from '../../lib/geo-skill-fixtures.js';

const MOCK_MODEL_LABEL = 'Mock AI（未调用 MiniMax）';

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)).filter(Boolean) : fallback;
}


function mineKeywords(input: Record<string, unknown>) {
  const brand = String(input.brand ?? '品牌');
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

function extractKnowledge(input: Record<string, unknown>) {
  const brand = String(input.brand ?? '品牌');
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

function sampleIndex(input: Record<string, unknown>) {
  const keywords = asStringArray(input.keywords, ['品牌推荐', '服务价格']);
  const platforms = asStringArray(input.platforms, ['豆包', '元宝']);
  return {
    results: keywords.flatMap((keyword, keywordIndex) =>
      platforms.map((platform, platformIndex) => ({
        keyword,
        platform,
        hit: (keywordIndex + platformIndex) % 2 === 0,
        citedMerchant: keywordIndex % 2 === 0,
        citationSnippet: `${platform} 对“${keyword}”的 mock 收录采样片段。`,
      }))
    ),
    samplingMethod: 'mock_ai',
  };
}

function generateCampaignPlan(input: Record<string, unknown>) {
  const brand = String(input.brand ?? '品牌');
  const goal = String(input.goal ?? '提升品牌曝光');
  const fromGeo = Boolean(input.geoReportId ?? input.source === 'geo_report');
  const gaps = Number(input.gapsFound ?? 5);
  const budgetMin = Number(input.budgetMin ?? 3000);
  const budgetMax = Number(input.budgetMax ?? 15000);
  const mid = Math.round((budgetMin + budgetMax) / 2);
  const platforms = asStringArray(input.platforms, ['小红书', '知乎']);
  const opt = String(input.optimizationSuggestions ?? '').slice(0, 80);

  const buildPkg = (input: {
    name: string;
    platform: string;
    payeeType: string;
    quantity: number;
    totalBudget: number;
    deliverable: string;
    acceptance: string;
  }) => {
    const quantity = Math.max(1, input.quantity);
    const unitPrice = Math.round(input.totalBudget / quantity);
    return {
      name: input.name,
      platform: input.platform,
      payeeType: input.payeeType,
      quantity,
      unitPrice,
      budget: unitPrice * quantity,
      deliverable: input.deliverable,
      acceptance: input.acceptance,
    };
  };

  const packages: Array<Record<string, unknown>> = [];

  if (fromGeo) {
    const p0 = platforms[0] ?? '小红书';
    const p1 = platforms[1] ?? '知乎';
    packages.push(
      buildPkg({
        name: `${brand} · GEO 补缺 · ${p0}种草`,
        platform: p0,
        payeeType: '达人',
        quantity: 4,
        totalBudget: Math.round(mid * 0.45),
        deliverable: `4 条${p0}笔记，覆盖 GEO 缺口关键词`,
        acceptance: `对齐报告建议：${opt || goal}；回传链接与数据截图`,
      }),
      buildPkg({
        name: `${brand} · GEO 补缺 · ${p1}问答覆盖`,
        platform: p1,
        payeeType: 'GEO 顾问',
        quantity: 3,
        totalBudget: Math.round(mid * 0.35),
        deliverable: `3 条${p1}问答/长文，可被 AI 引用`,
        acceptance: '含品牌实体与可验证案例，提交链接截图',
      })
    );
    if (gaps >= 6) {
      packages.push(
        buildPkg({
          name: `${brand} · GEO 综合投放补强`,
          platform: p0,
          payeeType: '综合投放',
          quantity: 1,
          totalBudget: Math.round(mid * 0.2),
          deliverable: '跨平台内容分发与效果复盘',
          acceptance: '提交投放清单、链接汇总与简要数据说明',
        })
      );
    }
  } else {
    packages.push(
      buildPkg({
        name: `${brand} 小红书种草任务包`,
        platform: '小红书',
        payeeType: '达人',
        quantity: 1,
        totalBudget: 2000,
        deliverable: '1 篇图文笔记 + 发布截图',
        acceptance: `围绕“${goal}”完成发布并回传链接`,
      }),
      buildPkg({
        name: `${brand} 知乎问答覆盖任务包`,
        platform: '知乎',
        payeeType: '内容写手',
        quantity: 2,
        totalBudget: 1500,
        deliverable: '2 条问答内容',
        acceptance: '内容包含品牌关键词与链接截图',
      })
    );
  }

  return { goal, packages, source: fromGeo ? 'mock_ai_geo' : 'mock_ai' };
}

function generateWebsitePreview(input: Record<string, unknown>) {
  const brand = String(input.brand ?? '品牌');
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

function hermesRequiredFailure(task: AgentTask) {
  return {
    status: 'failed' as const,
    progress: 0,
    errorMessage: `任务类型 ${task.type} 需本机 Hermes 执行`,
    userErrorMessage:
      '该任务已禁用 Mock。请启动 Hermes Gateway（8642）并设置 HERMES_EXECUTOR=nous_hermes',
    log: {
      level: 'error' as const,
      message: '已禁用 Mock：GEO/Hermes 任务仅支持本机 Hermes 执行',
    },
  };
}

export class DirectModelExecutor implements AgentExecutor {
  async submit(_task: AgentTask) {
    return {};
  }

  async poll(task: AgentTask) {
    if (taskRequiresHermesExecutor(task.type, task.input)) {
      return hermesRequiredFailure(task);
    }

    if (allowsDirectModelGeoFixtureMock(task)) {
      const output = fixtureForGeoTaskType(task.type, {
        ...task.input,
        brandName: task.brandName ?? task.input.brandName,
        brand: task.brandName ?? task.input.brand,
      });
      return {
        status: 'succeeded' as const,
        progress: 100,
        output,
        log: {
          level: 'info' as const,
          message: `Mock GEO 技能完成：${task.type}`,
        },
      };
    }

    switch (task.type) {
      case 'article_generation':
      case 'article_rewrite': {
        const { executeArticleGenerationTask } = await import(
          '../../services/article-generation.service.js'
        );
        const output = await executeArticleGenerationTask(task);
        const count = (output.articles as unknown[]).length;
        const qc = output.qualityChecks as { forbiddenWords?: { passed?: boolean } } | undefined;
        const qcNote = qc?.forbiddenWords?.passed === false ? '（含禁用词风险）' : '';
        return {
          status: 'succeeded' as const,
          progress: 100,
          output,
          log: {
            level: 'info' as const,
            message: `Web AI 写作完成：${count} 篇${qcNote}`,
          },
        };
      }
      case 'campaign_plan': {
        const output = generateCampaignPlan(task.input);
        return { status: 'succeeded' as const, progress: 100, output, log: { level: 'info' as const, message: 'Mock 数据生成：投放计划任务包已生成' } };
      }
      case 'website_preview': {
        const output = generateWebsitePreview(task.input);
        return { status: 'succeeded' as const, progress: 100, output, log: { level: 'info' as const, message: 'Mock 数据生成：网页预览已生成' } };
      }
      case 'account_verify': {
        const result = buildMockAccountVerifyOutput(task);
        if (result.status === 'failed') {
          return {
            status: 'failed' as const,
            progress: 100,
            output: result.output,
            errorMessage: result.errorMessage,
            userErrorMessage: result.userErrorMessage,
            log: { level: 'error' as const, message: result.userErrorMessage ?? '账号校验失败' },
          };
        }
        return {
          status: 'succeeded' as const,
          progress: 100,
          output: result.output,
          log: { level: 'info' as const, message: result.logMessage ?? '账号校验通过' },
        };
      }
      case 'keyword_mining': {
        const output = mineKeywords({ ...task.input, brand: task.brandName ?? task.input.brand });
        return { status: 'succeeded' as const, progress: 100, output, log: { level: 'info' as const, message: `Mock 数据生成：已挖掘 ${(output.suggestions as unknown[]).length} 个关键词建议` } };
      }
      case 'knowledge_extract': {
        const output = extractKnowledge({ ...task.input, brand: task.brandName ?? task.input.brand });
        return { status: 'succeeded' as const, progress: 100, output, log: { level: 'info' as const, message: `Mock 数据生成：已抽取 ${(output.entries as unknown[]).length} 条知识库条目` } };
      }
      case 'index_sampling': {
        const output = sampleIndex({ ...task.input, brand: task.brandName ?? task.input.brand });
        return { status: 'succeeded' as const, progress: 100, output, log: { level: 'info' as const, message: `Mock 数据生成：收录采样完成 ${(output.results as unknown[]).length} 条` } };
      }
      case 'hermes_publish': {
        if (!task.input.userConfirmed) {
          return {
            status: 'failed' as const,
            progress: 0,
            errorMessage: '缺少用户发布确认',
            userErrorMessage: '请先确认后再执行自动发布',
          };
        }
        const mock = buildMockHermesPublishOutput(task);
        return {
          status: mock.status,
          progress: 100,
          output: mock.output,
          errorMessage: mock.errorMessage,
          userErrorMessage: mock.userErrorMessage,
          log: { level: mock.status === 'succeeded' ? 'info' as const : 'warn' as const, message: mock.logMessage },
        };
      }
      default:
        return { status: 'failed' as const, progress: 0, errorMessage: `Unsupported: ${task.type}`, userErrorMessage: '暂不支持该任务类型' };
    }
  }

  async cancel(_task: AgentTask) {}
}

export function getActiveModelLabel(): string {
  return MOCK_MODEL_LABEL;
}

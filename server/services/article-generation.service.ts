import type { AgentTask } from '../agent/types.js';
import { generateJson, getActiveModelLabel } from '../lib/ai.js';
import { loadMinimaxConfig } from '../lib/minimax.js';
import { getBrandProfile } from './brand.service.js';
import { getGeoReport } from './campaign.service.js';
import {
  buildEffectBaselineFromResults,
  getIndexResultsByIds,
  type EffectBaseline,
} from './article-effect.service.js';
import { listKnowledge, knowledgeCategoryLabel, type KnowledgeCategory } from './knowledge.service.js';

const VALID_KNOWLEDGE_CATS: KnowledgeCategory[] = [
  'intro',
  'product',
  'faq',
  'case',
  'credential',
  'contact',
];

export interface ArticleQualityChecks {
  forbiddenWords: { passed: boolean; hits: string[] };
  factCoverage: { passed: boolean; missing: string[] };
  geoCitability: { score: number; suggestions: string[] };
}

export interface GeneratedArticle {
  title: string;
  platform: string;
  previewText: string;
  fullContent: string;
  structure: string;
  generationMeta?: Record<string, unknown>;
  qualityChecks?: ArticleQualityChecks;
  effectBaselineJson?: string;
}

export interface ArticleGenerationPreview {
  brandName: string;
  sourceType: 'brand_profile' | 'geo_report' | 'indexing_result';
  geoReportId: string | null;
  geoReportTitle: string | null;
  targetPlatform: string;
  contentDirection: string;
  tone: string;
  marketingIntensity: number;
  quantity: number;
  wordCount: number;
  keywords: string[];
  negativeKeywords: string[];
  knowledgeCategories: string[];
  knowledgeEntries: Array<{ category: string; categoryLabel: string; title: string; excerpt: string }>;
  knowledgeWarning: string | null;
  reportSummary: {
    gapsFound: number | null;
    contentGap: string;
    topFindings: string[];
    actionPlan: string[];
    optimizationSuggestions: string;
  } | null;
  promptOutline: string[];
  modelLabel: string;
  indexingGapSummary: {
    targetQuestions: string[];
    targetPlatforms: string[];
    brandMentionRate: number;
    competitorMentions: string[];
    scheduleDays: number[];
  } | null;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)).filter(Boolean) : fallback;
}

function recommendDirectionFromGap(hit: boolean, cited: boolean): string {
  if (!hit && !cited) return 'FAQ';
  if (hit && !cited) return '问答';
  return '案例';
}

function normalizeInput(input: Record<string, unknown>, brandName: string) {
  const sourceRaw = String(input.source ?? 'brand_profile');
  let sourceType: 'brand_profile' | 'geo_report' | 'indexing_result' = 'brand_profile';
  if (sourceRaw === 'indexing_result' || input.sourceIndexPlanId) sourceType = 'indexing_result';
  else if (sourceRaw === 'geo_report' || input.geoReportId) sourceType = 'geo_report';

  const effectVerification = (input.effectVerification ?? {}) as Record<string, unknown>;
  const scheduleRaw = effectVerification.scheduleDays;
  const effectScheduleDays = Array.isArray(scheduleRaw)
    ? scheduleRaw.map((d) => Number(d)).filter((n) => Number.isFinite(n) && n > 0)
    : [7, 14, 30];
  return {
    sourceType,
    geoReportId: input.geoReportId ? String(input.geoReportId) : null,
    sourceIndexPlanId: input.sourceIndexPlanId ? String(input.sourceIndexPlanId) : null,
    sourceIndexResultIds: asStringArray(input.sourceIndexResultIds),
    targetQuestions: asStringArray(input.targetQuestions),
    targetPlatforms: asStringArray(input.targetPlatforms),
    effectVerificationEnabled: effectVerification.enabled !== false,
    effectScheduleDays: effectScheduleDays.length ? effectScheduleDays : [7, 14, 30],
    targetPlatform: String(input.targetPlatform ?? '小红书'),
    contentDirection: String(input.contentDirection ?? '种草'),
    tone: String(input.tone ?? '自然'),
    marketingIntensity: Number(input.marketingIntensity ?? 25),
    keywords: asStringArray(input.keywords),
    negativeKeywords: asStringArray(input.negativeKeywords),
    knowledgeCategories: asStringArray(input.knowledgeCategories, ['intro', 'product', 'faq']).filter(
      (c): c is KnowledgeCategory => VALID_KNOWLEDGE_CATS.includes(c as KnowledgeCategory)
    ),
    quantity: Math.max(1, Math.min(5, Number(input.quantity ?? 3))),
    wordCount: Math.max(300, Math.min(3000, Number(input.wordCount ?? 800))),
    templateType: String(input.templateType ?? 'geo'),
    titleLevels: Number(input.titleLevels ?? 2),
    referenceText: String(input.referenceText ?? ''),
    brandName,
  };
}

function extractTopFindings(findings: unknown[]): string[] {
  return findings
    .slice(0, 5)
    .map((f) => {
      if (typeof f === 'string') return f;
      if (f && typeof f === 'object') {
        const o = f as Record<string, unknown>;
        return String(o.title ?? o.summary ?? o.issue ?? o.message ?? '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

function extractActionPlan(actionPlan: unknown[]): string[] {
  return actionPlan
    .slice(0, 5)
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a && typeof a === 'object') {
        const o = a as Record<string, unknown>;
        return String(o.action ?? o.title ?? o.summary ?? '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

export async function buildArticleGenerationContext(
  brandName: string,
  rawInput: Record<string, unknown>
) {
  const input = normalizeInput(rawInput, brandName);
  const profile = await getBrandProfile(brandName);
  if (!profile) throw new Error('品牌资料不存在');

  const allKnowledge = await listKnowledge(brandName);
  const knowledgeEntries = allKnowledge
    .filter((k) => input.knowledgeCategories.includes(k.category))
    .slice(0, 12)
    .map((k) => ({
      category: k.category,
      categoryLabel: knowledgeCategoryLabel(k.category),
      title: k.title,
      excerpt: k.body.slice(0, 400),
      body: k.body,
    }));

  const keywords =
    input.keywords.length > 0 ? input.keywords : profile.keywords.slice(0, 8);
  const negativeKeywords =
    input.negativeKeywords.length > 0
      ? input.negativeKeywords
      : profile.forbiddenWords;

  let report: Awaited<ReturnType<typeof getGeoReport>> = null;
  if (input.sourceType === 'geo_report' && input.geoReportId) {
    report = await getGeoReport(input.geoReportId);
    if (!report) throw new Error('GEO 报告不存在');
    if (report.brandName !== brandName) throw new Error('报告与当前品牌不匹配');
  }

  let effectBaseline: EffectBaseline | null = null;
  if (input.sourceType === 'indexing_result' && input.sourceIndexResultIds.length) {
    const rows = await getIndexResultsByIds(input.sourceIndexResultIds);
    if (!rows.length) throw new Error('排名采样结果不存在');
    const planId = input.sourceIndexPlanId ?? rows[0]?.planId ?? '';
    effectBaseline = buildEffectBaselineFromResults(planId, rows);
    if (!input.targetQuestions.length) {
      input.targetQuestions = effectBaseline.targetQuestions;
    }
    if (!input.targetPlatforms.length) {
      input.targetPlatforms = effectBaseline.targetPlatforms;
    }
    if (input.keywords.length === 0) {
      input.keywords = effectBaseline.targetQuestions.slice(0, 5);
    }
    if (input.contentDirection === '种草' && rows.some((r) => !r.hit)) {
      const sample = rows.find((r) => !r.hit) ?? rows[0];
      input.contentDirection = recommendDirectionFromGap(sample.hit, sample.citedMerchant);
    }
  }

  return { input, profile, knowledgeEntries, keywords, negativeKeywords, report, effectBaseline };
}

export async function previewArticleGenerationInput(
  brandName: string,
  rawInput: Record<string, unknown>
): Promise<ArticleGenerationPreview> {
  const { input, profile, knowledgeEntries, keywords, negativeKeywords, report, effectBaseline } =
    await buildArticleGenerationContext(brandName, rawInput);

  const knowledgeWarning =
    knowledgeEntries.length === 0
      ? '所选知识库分类暂无条目，文章可能较泛，建议先补充企业知识库'
      : null;

  const promptOutline = [
    `品牌：${profile.name}（${profile.industry} · ${profile.city}）`,
    `平台：${input.targetPlatform} · 方向：${input.contentDirection} · 语气：${input.tone}`,
    `关键词：${keywords.join('、') || '（未选）'}`,
    `知识库：${knowledgeEntries.map((k) => k.categoryLabel).join('、') || '无'}`,
    report
      ? `报告驱动：${report.title}`
      : input.sourceType === 'indexing_result'
        ? `排名缺口：${input.targetQuestions.join('、') || '未指定问题'}`
        : '来源：品牌资料（无 GEO 报告）',
    `禁用词：${negativeKeywords.length} 个`,
    `生成 ${input.quantity} 篇，约 ${input.wordCount} 字/篇`,
    input.sourceType === 'indexing_result'
      ? `发布后复测：${input.effectScheduleDays.map((d) => `T+${d}`).join(' / ')}`
      : '',
  ].filter(Boolean);

  return {
    brandName: profile.name,
    sourceType: input.sourceType,
    geoReportId: report?.id ?? null,
    geoReportTitle: report?.title ?? null,
    targetPlatform: input.targetPlatform,
    contentDirection: input.contentDirection,
    tone: input.tone,
    marketingIntensity: input.marketingIntensity,
    quantity: input.quantity,
    wordCount: input.wordCount,
    keywords,
    negativeKeywords,
    knowledgeCategories: input.knowledgeCategories,
    knowledgeEntries: knowledgeEntries.map((k) => ({
      category: k.category,
      categoryLabel: k.categoryLabel,
      title: k.title,
      excerpt: k.excerpt,
    })),
    knowledgeWarning,
    reportSummary: report
      ? {
          gapsFound: report.gapsFound,
          contentGap: String(report.contentGap ?? '').slice(0, 500),
          topFindings: extractTopFindings(report.findings ?? []),
          actionPlan: extractActionPlan(report.actionPlan ?? []),
          optimizationSuggestions: String(report.optimizationSuggestions ?? '').slice(0, 400),
        }
      : null,
    promptOutline,
    modelLabel: getActiveModelLabel(),
    indexingGapSummary: effectBaseline
      ? {
          targetQuestions: effectBaseline.targetQuestions,
          targetPlatforms: effectBaseline.targetPlatforms,
          brandMentionRate: effectBaseline.brandMentionRate,
          competitorMentions: effectBaseline.competitorMentions,
          scheduleDays: input.effectScheduleDays,
        }
      : null,
  };
}

function findForbiddenHits(text: string, words: string[]): string[] {
  const hits = new Set<string>();
  const lower = text.toLowerCase();
  for (const w of words) {
    const term = w.trim();
    if (!term) continue;
    if (text.includes(term) || lower.includes(term.toLowerCase())) hits.add(term);
  }
  return [...hits];
}

function runQualityChecks(
  articles: Array<{ title: string; fullContent: string }>,
  ctx: {
    negativeKeywords: string[];
    profile: Awaited<ReturnType<typeof getBrandProfile>>;
    knowledgeEntries: Array<{ title: string; categoryLabel: string }>;
  }
): ArticleQualityChecks {
  const combined = articles.map((a) => `${a.title}\n${a.fullContent}`).join('\n');
  const forbiddenHits = findForbiddenHits(combined, ctx.negativeKeywords);

  const missing: string[] = [];
  if (!combined.includes(ctx.profile!.name)) missing.push('品牌名称');
  if (ctx.profile!.city && !combined.includes(ctx.profile!.city)) missing.push('城市/地域');
  if (ctx.knowledgeEntries.length === 0) missing.push('知识库素材引用');

  let citability = 55;
  const suggestions: string[] = [];
  if (/##\s*.+问答|FAQ|常见问题/.test(combined)) citability += 15;
  else suggestions.push('增加可直接摘录的 FAQ 短答案段落');
  if (/\d+[%％]|案例|经验/.test(combined)) citability += 10;
  else suggestions.push('补充可验证的案例或数据点');
  if (combined.split('\n').filter((l) => l.length > 20 && l.length < 120).length >= 3) citability += 10;
  else suggestions.push('增加 2–3 段 80 字以内的可引用结论句');

  return {
    forbiddenWords: { passed: forbiddenHits.length === 0, hits: forbiddenHits },
    factCoverage: { passed: missing.length === 0, missing },
    geoCitability: { score: Math.min(100, citability), suggestions },
  };
}

function buildGenerationPrompt(
  ctx: Awaited<ReturnType<typeof buildArticleGenerationContext>>,
  mode: 'generate' | 'rewrite'
) {
  const { input, profile, knowledgeEntries, keywords, negativeKeywords, report, effectBaseline } = ctx;
  const knowledgeBlock = knowledgeEntries.length
    ? knowledgeEntries
        .map((k) => `【${k.categoryLabel}】${k.title}\n${k.body.slice(0, 800)}`)
        .join('\n\n')
    : '（知识库暂无条目，仅依据品牌资料写作，勿编造资质与疗效承诺）';

  const reportBlock = report
    ? [
        `报告标题：${report.title}`,
        `内容缺口：${report.contentGap.slice(0, 600)}`,
        `优化建议：${report.optimizationSuggestions.slice(0, 600)}`,
        `重点 findings：${extractTopFindings(report.findings ?? []).join('；') || '无'}`,
        `行动计划：${extractActionPlan(report.actionPlan ?? []).join('；') || '无'}`,
      ].join('\n')
    : '';

  const rewriteBlock =
    mode === 'rewrite' && input.referenceText
      ? `参考原文（需彻底改写结构，保留可核实事实）：\n${input.referenceText.slice(0, 2000)}`
      : '';

  const indexingBlock = effectBaseline
    ? [
        `目标 AI 问题：${effectBaseline.targetQuestions.join('；')}`,
        `目标 AI 平台：${effectBaseline.targetPlatforms.join('、')}`,
        `发布前品牌提及率：${effectBaseline.brandMentionRate}%`,
        `竞品出现：${effectBaseline.competitorMentions.join('、') || '无'}`,
        '采样摘要：',
        ...effectBaseline.answerSnapshots.map(
          (s) => `- ${s.platform} / ${s.question}：${s.summary}`
        ),
      ].join('\n')
    : '';

  return `你是 GEO 内容写作助手。根据以下真实上下文撰写 ${input.quantity} 篇面向「${input.targetPlatform}」的${input.contentDirection}类文章。

【品牌资料】
名称：${profile!.name}
行业：${profile!.industry}
城市：${profile!.city}
门店：${profile!.storeCount}
简介：${profile!.description}
竞品：${profile!.competitors.join('、') || '无'}

【关键词】${keywords.join('、')}
【禁用词 - 正文不得出现】${negativeKeywords.join('、') || '无'}

【知识库素材】
${knowledgeBlock}

${reportBlock ? `【Hermes GEO 报告结论 - 文章须回应这些缺口】\n${reportBlock}\n` : ''}
${indexingBlock ? `【排名监控缺口 - 文章须改善以下 AI 问题表现】\n${indexingBlock}\n` : ''}
${rewriteBlock}

【写作要求】
- 平台：${input.targetPlatform}；语气：${input.tone}；营销强度约 ${input.marketingIntensity}%（克制、可引用）
- 每篇约 ${input.wordCount} 字；含清晰标题、可被 AI 搜索摘引的短答案段、FAQ 或要点列表
- 禁止编造医生资质编号、疗效保证、绝对化用语
- 不得出现禁用词列表中的任何词

返回 JSON：
{
  "articles": [
    {
      "title": "标题",
      "previewText": "80字以内预览",
      "fullContent": "Markdown 正文",
      "structure": "结构说明如：标题+核心答案+FAQ"
    }
  ]
}`;
}

function buildContextAwareMockArticles(
  ctx: Awaited<ReturnType<typeof buildArticleGenerationContext>>,
  qualityChecks: ArticleQualityChecks
): GeneratedArticle[] {
  const { input, profile, keywords, report } = ctx;
  const gapHint = report?.contentGap?.slice(0, 80) ?? profile!.description.slice(0, 80);
  const kw = keywords[0] ?? profile!.name;

  return Array.from({ length: input.quantity }).map((_, index) => {
    const n = index + 1;
    const title = `${profile!.name} · ${input.targetPlatform}${input.contentDirection}稿 ${n}`;
    const fullContent = [
      `# ${title}`,
      '',
      report
        ? `> 本篇回应 GEO 报告缺口：${gapHint}`
        : `> 基于品牌资料与知识库生成的 GEO 友好草稿`,
      '',
      `## 用户常问：${kw}怎么选？`,
      `${profile!.name}位于${profile!.city}，主营${profile!.industry}相关服务。建议从资质、案例透明度与售后保障三个维度判断，而非仅看价格。`,
      '',
      `## 核心服务亮点`,
      profile!.description,
      '',
      `## FAQ`,
      `**Q：${profile!.name}适合谁？**`,
      `A：有${kw}相关需求、希望获得可验证服务信息的用户。`,
      '',
      `## 发布前检查`,
      `- 语气：${input.tone}；营销强度 ${input.marketingIntensity}%`,
      qualityChecks.forbiddenWords.passed
        ? '- 禁用词：未命中'
        : `- 禁用词风险：${qualityChecks.forbiddenWords.hits.join('、')}`,
    ].join('\n');

    return {
      title,
      platform: input.targetPlatform,
      previewText: `围绕「${kw}」的${input.contentDirection}向 GEO 草稿，${input.tone}语气。`,
      fullContent,
      structure: '[标题 + 核心答案 + 服务亮点 + FAQ]',
    };
  });
}

async function callArticleModel(
  prompt: string
): Promise<Array<{ title: string; previewText: string; fullContent: string; structure: string }>> {
  const result = await generateJson<{
    articles: Array<{ title: string; previewText: string; fullContent: string; structure: string }>;
  }>(prompt);
  if (!result.articles?.length) throw new Error('模型未返回文章');
  return result.articles;
}

function attachMeta(
  articles: Array<{ title: string; platform: string; previewText: string; fullContent: string; structure: string }>,
  ctx: Awaited<ReturnType<typeof buildArticleGenerationContext>>,
  taskId: string | undefined,
  qualityChecks: ArticleQualityChecks,
  modelLabel: string
): GeneratedArticle[] {
  const meta: Record<string, unknown> = {
    sourceType: ctx.input.sourceType,
    sourceReportId: ctx.report?.id ?? null,
    sourceReportTitle: ctx.report?.title ?? null,
    sourceIndexPlanId: ctx.input.sourceIndexPlanId,
    sourceIndexResultIds: ctx.input.sourceIndexResultIds,
    targetQuestions: ctx.input.targetQuestions,
    targetPlatforms: ctx.input.targetPlatforms,
    effectVerificationEnabled: ctx.input.effectVerificationEnabled,
    effectScheduleDays: ctx.input.effectScheduleDays,
    sourceTaskId: taskId ?? null,
    usedKnowledge: ctx.knowledgeEntries.map((k) => ({
      category: k.category,
      categoryLabel: k.categoryLabel,
      title: k.title,
    })),
    keywords: ctx.keywords,
    targetPlatform: ctx.input.targetPlatform,
    contentDirection: ctx.input.contentDirection,
    tone: ctx.input.tone,
    marketingIntensity: ctx.input.marketingIntensity,
    model: modelLabel,
  };

  const baselineJson = ctx.effectBaseline ? JSON.stringify(ctx.effectBaseline) : undefined;

  return articles.map((a) => ({
    ...a,
    generationMeta: meta,
    qualityChecks,
    effectBaselineJson: baselineJson,
  }));
}

export async function executeArticleGenerationTask(task: AgentTask) {
  const brandName = String(task.brandName ?? task.input.brand ?? '');
  const ctx = await buildArticleGenerationContext(brandName, task.input as Record<string, unknown>);
  const mode = task.type === 'article_rewrite' ? 'rewrite' : 'generate';
  const prompt = buildGenerationPrompt(ctx, mode);
  const hasMinimax = Boolean(loadMinimaxConfig());
  const modelLabel = hasMinimax ? getActiveModelLabel() : '上下文 Mock（未配置 MiniMax）';

  let rawArticles: Array<{
    title: string;
    previewText: string;
    fullContent: string;
    structure: string;
    platform?: string;
  }>;

  try {
    if (hasMinimax) {
      rawArticles = await callArticleModel(prompt);
    } else {
      throw new Error('MiniMax 未配置');
    }
  } catch {
    rawArticles = buildContextAwareMockArticles(
      ctx,
      runQualityChecks(
        [{ title: 'tmp', fullContent: '' }],
        {
          negativeKeywords: ctx.negativeKeywords,
          profile: ctx.profile,
          knowledgeEntries: ctx.knowledgeEntries,
        }
      )
    );
  }

  const normalized = rawArticles.map((a) => ({
    title: String(a.title ?? `${ctx.profile!.name} 文稿`),
    platform: String(a.platform ?? ctx.input.targetPlatform),
    previewText: String(a.previewText ?? a.fullContent.slice(0, 80)),
    fullContent: String(a.fullContent ?? ''),
    structure: String(a.structure ?? '[GEO 文章]'),
  }));

  const qualityChecks = runQualityChecks(normalized, {
    negativeKeywords: ctx.negativeKeywords,
    profile: ctx.profile,
    knowledgeEntries: ctx.knowledgeEntries,
  });

  const articles = attachMeta(normalized, ctx, task.id, qualityChecks, modelLabel);

  return {
    articles,
    qualityChecks,
    source: hasMinimax ? 'web_ai' : 'context_mock',
    model: modelLabel,
    geoReportId: ctx.report?.id ?? null,
    knowledgeEntryCount: ctx.knowledgeEntries.length,
    effectBaseline: ctx.effectBaseline,
    effectVerification: ctx.input.effectVerificationEnabled
      ? { enabled: true, scheduleDays: ctx.input.effectScheduleDays }
      : null,
  };
}

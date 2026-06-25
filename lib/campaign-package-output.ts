/** 从任务 output（含 Hermes geo-campaign-plan-web）提取任务包列表 */
export function extractCampaignPackages(output: Record<string, unknown>): Array<Record<string, unknown>> {
  const nested = output.data;
  const plan = output.plan;
  const candidates: unknown[] = [
    output.packages,
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? (nested as Record<string, unknown>).packages
      : undefined,
    plan && typeof plan === 'object' && !Array.isArray(plan)
      ? (plan as Record<string, unknown>).packages
      : undefined,
  ];
  for (const value of candidates) {
    if (Array.isArray(value) && value.length) {
      return value.filter((row) => row && typeof row === 'object') as Array<Record<string, unknown>>;
    }
  }
  return [];
}

export type NormalizedCampaignPackage = {
  name: string;
  platform: string;
  payeeType: string;
  quantity: number;
  unitPrice?: number;
  budget: number;
  deliverable: string;
  acceptance: string;
};

/** 平台别名 → 预设平台名（确定性映射）
 *  注意：行业媒体子项（36氪等）原样保留，不在此映射。
 */
const PLATFORM_ALIAS_MAP: Record<string, string> = {
  // 微信公众号 ↔ 公众号
  '微信公众号': '公众号',
  '微信': '公众号',
  '微信公众平台': '公众号',
  'wechat': '公众号',
  '公众号': '公众号',
  // 网站 / SEO 后缀
  '官网': '网站',
  '网站': '网站',
  '网站建设': '网站',
  'SEO': '网站',
  '百度SEO': '网站',
  '官网建设': '网站',
  '落地页': '网站',
  '官网/百度SEO': '网站',
  '网/百度SEO': '网站',
  // 小红书
  '小红书': '小红书',
  'xhs': '小红书',
  'xiaohongshu': '小红书',
  // 抖音
  '抖音': '抖音',
  'douyin': '抖音',
  // B站
  'B站': 'B站',
  'bilibili': 'B站',
  '哔哩哔哩': 'B站',
  // 微博
  '微博': '微博',
  'weibo': '微博',
  // 知乎
  '知乎': '知乎',
  'zhihu': '知乎',
  // 大风网
  '大风网': '大风网',
  '大风': '大风网',
  'dafeng': '大风网',
  // 一点号
  '一点号': '一点号',
  '一点': '一点号',
  'yidian': '一点号',
  // 今日头条
  '今日头条': '今日头条',
  '头条号': '今日头条',
  '头条': '今日头条',
  'toutiao': '今日头条',
  // 百家号
  '百家号': '百家号',
  'baijia': '百家号',
  'baijiahao': '百家号',
  // 百度百科 / CSDN → 大风网
  '百度百科': '大风网',
  'CSDN': '大风网',
  'csdn': '大风网',
};

/** 行业媒体推荐子项（仅用于精确命中优化，未命中时走模糊规则） */
const INDUSTRY_MEDIA_KNOWN = new Set([
  '36氪', '亿欧', '艾瑞', '虎嗅', '创业邦',
  '钛媒体', '界面新闻', '品玩', '极客公园', '投资界',
  '健康界', '丁香园', '动脉网',
  '芥末堆', '多知网', '鲸媒体',
  '无讼', '智合',
  '华尔街见闻', '财联社', '雪球',
]);

/** 把任意 platform 文本映射到预设平台名（行业媒体子项开放编辑、原样保留） */
export function normalizeLobbyPlatformLabel(raw: string): string {
  const trimmed = String(raw ?? '').trim();

  // 0. 已知行业媒体子项 → 原样保留
  if (INDUSTRY_MEDIA_KNOWN.has(trimmed)) return trimmed;

  // 1. 精确匹配别名映射
  if (PLATFORM_ALIAS_MAP[trimmed]) return PLATFORM_ALIAS_MAP[trimmed];

  // 2. 模糊匹配
  if (/官网|SEO|网站|落地页|Site/i.test(trimmed)) return '网站';
  if (/36氪|36kr/i.test(trimmed)) return '36氪';
  if (/百度/i.test(trimmed)) return '大风网';
  if (/官媒/i.test(trimmed)) return '官媒';

  // 3. lower case / replace 空格
  const lowered = trimmed.toLowerCase().replace(/\s+/g, '');
  for (const [key, value] of Object.entries(PLATFORM_ALIAS_MAP)) {
    if (key.toLowerCase().replace(/\s+/g, '') === lowered) return value;
  }

  // 4. 兜底：行业媒体自由名 → 原样保留（如"芥末堆"、"丁香园"等地形媒体）
  return trimmed || '小红书';
}

/** 从 deliverables 数组或「1. … 2. …」正文推断文章篇数 */
export function countDeliverableItems(input: {
  deliverable?: string;
  deliverables?: unknown;
}): number {
  if (Array.isArray(input.deliverables)) {
    const items = input.deliverables.map(String).map((s) => s.trim()).filter(Boolean);
    if (items.length > 0) return items.length;
  }

  const text = String(input.deliverable ?? '').trim();
  if (!text) return 0;

  const lines = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const numberedLines = lines.filter((l) => /^\d+[.、．)\]:]/.test(l));
  if (numberedLines.length >= 2) return numberedLines.length;

  const inlineNumbered = text.match(/(?:^|[；;\n])\s*\d+[.、．)\]:]/g);
  if (inlineNumbered && inlineNumbered.length >= 2) return inlineNumbered.length;

  const articleLines = lines.filter((l) => /[（(]\s*1\s*篇\s*[）)]/.test(l));
  if (articleLines.length >= 2) return articleLines.length;

  return numberedLines.length === 1 ? 1 : 0;
}

/** AI 输出缺 quantity 或与 deliverables 不一致时，以正文/数组为准 */
export function inferPackageQuantityFromRaw(raw: Record<string, unknown>): number {
  const deliverablesArr = Array.isArray(raw.deliverables)
    ? raw.deliverables.map(String).filter(Boolean)
    : [];
  const deliverableText = String(
    raw.deliverable ?? (deliverablesArr.length ? deliverablesArr.join('\n') : raw.message ?? '')
  );
  const fromItems = countDeliverableItems({ deliverable: deliverableText, deliverables: deliverablesArr });
  const explicit = raw.quantity != null ? Number(raw.quantity) : NaN;
  if (Number.isFinite(explicit) && explicit >= 1) {
    return fromItems > explicit ? fromItems : Math.max(1, Math.round(explicit));
  }
  return Math.max(1, fromItems || 1);
}

/** 加载已有方案时，纠正「文章要求 N 篇但 quantity=1」 */
export function reconcileCampaignPackageQuantity<
  T extends { quantity?: number; unitPrice?: number | null; budget: number; deliverable: string },
>(pkg: T): T {
  const inferred = countDeliverableItems({ deliverable: pkg.deliverable });
  const current = Math.max(1, pkg.quantity ?? 1);
  if (inferred <= 1 || inferred <= current) return pkg;

  const hasUnitPrice = pkg.unitPrice != null && Number.isFinite(Number(pkg.unitPrice));
  const unitPrice = hasUnitPrice
    ? Number(pkg.unitPrice)
    : current > 0
      ? Math.round(pkg.budget / current)
      : pkg.budget;
  const nextBudget = hasUnitPrice ? Math.round(unitPrice * inferred) : pkg.budget;
  const nextUnitPrice = hasUnitPrice ? unitPrice : Math.round(pkg.budget / inferred);

  return {
    ...pkg,
    quantity: inferred,
    unitPrice: nextUnitPrice,
    budget: nextBudget,
  };
}

/** 将 Mock / Hermes 任务包字段统一为发单草稿结构 */
export function normalizeCampaignPackage(raw: Record<string, unknown>): NormalizedCampaignPackage {
  const platforms = Array.isArray(raw.platforms) ? raw.platforms.map(String) : [];
  const rawPlatform = String(raw.platform ?? platforms[0] ?? '小红书');
  const platform = normalizeLobbyPlatformLabel(rawPlatform);
  const budgetMin = Number(raw.budgetMin ?? 0);
  const budgetMax = Number(raw.budgetMax ?? 0);
  const budget = Number(
    raw.budget ?? (budgetMax > 0 ? budgetMax : budgetMin > 0 ? budgetMin : 1000)
  );
  const deliverablesArr = Array.isArray(raw.deliverables)
    ? raw.deliverables.map(String).filter(Boolean)
    : [];
  const acceptanceCriteria = Array.isArray(raw.acceptanceCriteria)
    ? raw.acceptanceCriteria.map(String).filter(Boolean).join(' / ')
    : '';
  const deliverable = String(
    raw.deliverable ?? (deliverablesArr.length ? deliverablesArr.join('\n') : raw.message ?? '内容交付')
  );
  const quantity = inferPackageQuantityFromRaw({ ...raw, deliverable });
  const unitPrice =
    raw.unitPrice != null
      ? Number(raw.unitPrice)
      : quantity > 0
        ? Math.round(budget / quantity)
        : budget;
  const finalBudget = raw.unitPrice != null ? Math.round(unitPrice * quantity) : budget;

  return {
    name: String(raw.name ?? '任务包'),
    platform,
    payeeType: String(raw.payeeType ?? raw.providerName ?? raw.serviceType ?? '内容写手'),
    quantity,
    unitPrice,
    budget: finalBudget,
    deliverable,
    acceptance: String(raw.acceptance ?? acceptanceCriteria ?? '截图证明'),
  };
}

const DEFAULT_ARTICLE_ACCEPTANCE =
  '1. 先提交文章草稿，经发布方审稿通过后方可发布；2. 发布后回填文章链接及平台截图；3. 发布方最终验收通过后结算。';

export interface CreateArticleWritingOrderInput {
  brandName: string;
  title?: string;
  platform: string;
  direction: string;
  articleCount: number;
  wordCount: number;
  keywords?: string;
  referenceNote?: string;
  budget: number;
  reviewNote?: string;
}

export interface CreateLobbyOrderInput {
  brandName: string;
  title: string;
  platform: string;
  budget: number;
  type: string;
  deliverable: string;
  acceptance: string;
  description?: string;
}

export async function createArticleWritingOrder(
  input: CreateArticleWritingOrderInput
): Promise<{ order?: { id: string }; error?: string }> {
  const orderTitle =
    input.title?.trim() ||
    `${input.platform} ${input.direction} · ${input.articleCount}篇 · 约${input.wordCount}字`;
  const kw = input.keywords?.trim() ?? '';
  const deliverable = [
    `撰写并发布 ${input.platform} 内容（${input.direction}）`,
    `约 ${input.wordCount} 字/篇，共 ${input.articleCount} 篇`,
    kw ? `关键词：${kw}` : '',
    input.referenceNote?.trim() ? `参考资料：${input.referenceNote.trim()}` : '',
  ]
    .filter(Boolean)
    .join('；');

  const acceptance = [
    DEFAULT_ARTICLE_ACCEPTANCE,
    input.reviewNote?.trim() ? `审稿补充：${input.reviewNote.trim()}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return postTaskOrder({
    brandName: input.brandName,
    title: orderTitle,
    platform: input.platform,
    type: '文章',
    budget: input.budget,
    deliverable,
    acceptance,
    description: deliverable,
  });
}

export async function createLobbyOrder(
  input: CreateLobbyOrderInput
): Promise<{ order?: { id: string }; error?: string }> {
  return postTaskOrder({
    brandName: input.brandName,
    title: input.title,
    platform: input.platform,
    type: input.type,
    budget: input.budget,
    deliverable: input.deliverable,
    acceptance: input.acceptance,
    description: input.description ?? input.deliverable,
  });
}

async function postTaskOrder(body: Record<string, unknown>) {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) return { error: data.error as string };
  return { order: data.order as { id: string } };
}

/** 自定义发单中「文章写作+发布」走双阶段流程，不应在通用 lobby 表单重复选择 */
export function isArticleOrderType(type: string): boolean {
  return type === '文章';
}

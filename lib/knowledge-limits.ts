/** 企业知识库文本条目统一限制（手动录入与 AI 入库均适用） */
export const KNOWLEDGE_TITLE_MAX = 20;
export const KNOWLEDGE_BODY_MAX = 2000;
export const KNOWLEDGE_MAX_ENTRIES_PER_CATEGORY = 10;

export function normalizeKnowledgeTitle(title: string, fallback = '未命名') {
  const trimmed = title.trim();
  const base = trimmed || fallback;
  return base.slice(0, KNOWLEDGE_TITLE_MAX);
}

export function normalizeKnowledgeBody(body: string) {
  return body.trim().slice(0, KNOWLEDGE_BODY_MAX);
}

export function validateKnowledgeText(title: string, body: string): string | null {
  const t = title.trim();
  const b = body.trim();
  if (!t) return '标题不能为空';
  if (t.length > KNOWLEDGE_TITLE_MAX) return `标题不能超过 ${KNOWLEDGE_TITLE_MAX} 字`;
  if (!b) return '正文不能为空';
  if (b.length > KNOWLEDGE_BODY_MAX) return `正文不能超过 ${KNOWLEDGE_BODY_MAX} 字`;
  return null;
}

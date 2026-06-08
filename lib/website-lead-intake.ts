/** 网页客资需求：发布端提交 → 平台线下交付登记。不走 TaskOrder 接单申请、不走 ArticleDelivery 文章履约链路。 */

export interface WebsiteLeadFields {
  pageType: string;
  referenceUrl: string;
  keywords: string;
  notes: string;
  contact: string;
}

export interface WebsiteLeadSource {
  goal: string;
  pageType?: string;
  referenceUrl?: string | null;
  keywords?: string | null;
  contact?: string | null;
  notes?: string | null;
}

export function formatWebsiteLeadGoal(fields: Pick<WebsiteLeadFields, 'keywords' | 'notes' | 'contact'>): string {
  return [
    fields.keywords.trim(),
    fields.notes.trim() ? `参考说明：${fields.notes.trim()}` : '',
    fields.contact.trim() ? `联系方式：${fields.contact.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function parseWebsiteLeadGoal(goal: string): Pick<WebsiteLeadFields, 'keywords' | 'notes' | 'contact'> {
  const lines = goal.split('\n').map((l) => l.trim()).filter(Boolean);
  const keywords = lines[0] ?? '';
  const notesLine = lines.find((l) => l.startsWith('参考说明：'));
  const contactLine = lines.find((l) => l.startsWith('联系方式：'));
  return {
    keywords,
    notes: notesLine ? notesLine.replace(/^参考说明：/, '') : '',
    contact: contactLine ? contactLine.replace(/^联系方式：/, '') : '',
  };
}

/** 从 DB 记录解析客资字段，优先结构化列，fallback 解析 goal */
export function resolveWebsiteLeadFields(source: WebsiteLeadSource): WebsiteLeadFields {
  const parsed = parseWebsiteLeadGoal(source.goal);
  return {
    pageType: source.pageType ?? '',
    referenceUrl: source.referenceUrl ?? '',
    keywords: source.keywords?.trim() || parsed.keywords,
    notes: source.notes?.trim() || parsed.notes,
    contact: source.contact?.trim() || parsed.contact,
  };
}

export function formatWebsiteLeadListLabel(source: WebsiteLeadSource): string {
  const { keywords } = resolveWebsiteLeadFields(source);
  return keywords || source.goal.split('\n')[0] || '—';
}

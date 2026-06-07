/** 从排名监控跳转生成文章：index:{planId}:{resultId1,resultId2} */
export function buildIndexingGapHint(planId: string, resultIds: string[]): string {
  return `index:${planId}:${resultIds.join(',')}`;
}

export function parseIndexingGapHint(hint?: string): {
  planId: string;
  resultIds: string[];
} | null {
  if (!hint?.startsWith('index:')) return null;
  const parts = hint.split(':');
  if (parts.length < 3) return null;
  const planId = parts[1];
  const resultIds = parts.slice(2).join(':').split(',').filter(Boolean);
  if (!planId || resultIds.length === 0) return null;
  return { planId, resultIds };
}

export function parseIndexingGapFromUrl(): { planId: string; resultIds: string[] } | null {
  const planId = new URLSearchParams(window.location.search).get('indexPlanId');
  const raw = new URLSearchParams(window.location.search).get('indexResultIds');
  if (!planId || !raw) return null;
  const resultIds = raw.split(',').filter(Boolean);
  if (!resultIds.length) return null;
  return { planId, resultIds };
}

export const EFFECT_JUDGMENT_LABEL: Record<string, string> = {
  pending: '待复测',
  observing: '待观察',
  effective: '有效',
  no_change: '无明显变化',
};

/** 跳转内容库并选中文章：content:{contentItemId} */
export function buildContentItemEffectHint(contentItemId: string): string {
  return `content:${contentItemId}`;
}

export function parseContentItemEffectHint(hint?: string): string | null {
  if (!hint?.startsWith('content:')) return null;
  const id = hint.slice('content:'.length).trim();
  return id || null;
}

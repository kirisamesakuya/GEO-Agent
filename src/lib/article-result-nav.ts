export type ArticleResultSection = 'articles' | 'publish_records';

export type ArticleResultStatusFilter = 'all' | 'draft' | 'scheduled' | 'published' | 'failed';

export const ARTICLE_RESULT_SECTIONS: { id: ArticleResultSection; label: string }[] = [
  { id: 'articles', label: '文章列表' },
  { id: 'publish_records', label: '发布记录' },
];

export const ARTICLE_RESULT_STATUS_TABS: { id: ArticleResultStatusFilter; label: string }[] = [
  { id: 'all', label: '全部文章' },
  { id: 'draft', label: '待发布' },
  { id: 'scheduled', label: '已排程' },
  { id: 'published', label: '已发布' },
  { id: 'failed', label: '发布失败' },
];

export const PUBLISH_RECORD_STATUS_TABS = [
  { id: '', label: '全部' },
  { id: 'pending', label: '待执行' },
  { id: 'succeeded', label: '已发布' },
  { id: 'failed', label: '发布失败' },
  { id: 'need_reauth', label: '需重新授权' },
] as const;

export type PublishRecordStatusFilter = (typeof PUBLISH_RECORD_STATUS_TABS)[number]['id'];

export function parseArticleResultSectionFromUrl(): ArticleResultSection {
  const tab = new URLSearchParams(window.location.search).get('contentTab');
  if (tab === 'publish_records') return 'publish_records';
  return 'articles';
}

export function parseArticleStatusFromUrl(): ArticleResultStatusFilter {
  const s = new URLSearchParams(window.location.search).get('articleStatus');
  if (s === 'draft' || s === 'scheduled' || s === 'published' || s === 'failed') return s;
  return 'all';
}

export function parsePublishRecordStatusFromUrl(): PublishRecordStatusFilter {
  const s = new URLSearchParams(window.location.search).get('publishStatus');
  if (PUBLISH_RECORD_STATUS_TABS.some((t) => t.id === s)) return s as PublishRecordStatusFilter;
  return '';
}

export function articleDetailHint(contentItemId: string) {
  return `content:${contentItemId}`;
}

export function publishRecordDetailHint(recordId: string) {
  return `publish:${recordId}`;
}

export function parseContentItemIdFromHint(hint?: string): string | undefined {
  if (hint?.startsWith('content:')) return hint.slice('content:'.length);
  return undefined;
}

export function parsePublishRecordIdFromHint(hint?: string): string | undefined {
  if (hint?.startsWith('publish:')) return hint.slice('publish:'.length);
  return undefined;
}

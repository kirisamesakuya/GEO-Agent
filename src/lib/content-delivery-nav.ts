import type { ViewType } from '../types';

/** 内容交付模块 Tab */
export type ContentDeliveryTab = 'list' | 'publish_records' | 'manual' | 'website';

export const CONTENT_DELIVERY_TABS: { id: ContentDeliveryTab; label: string; desc: string }[] = [
  { id: 'list', label: '内容列表', desc: 'AI 生成、人工接单与导入的内容统一列表' },
  { id: 'publish_records', label: '发布记录', desc: '内容发布阶段的结果与证据' },
  { id: 'manual', label: '人工交付', desc: '接单任务：审稿、返修与验收' },
  { id: 'website', label: '网页需求', desc: '网页改装与页面类需求' },
];

export function parseContentDeliveryTabFromUrl(): ContentDeliveryTab {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('deliveryTab');
  if (tab === 'publish_records' || tab === 'manual' || tab === 'website' || tab === 'list') {
    return tab;
  }
  const view = params.get('view');
  if (view === 'order_delivery') {
    return params.get('orderTab') === 'website' ? 'website' : 'manual';
  }
  if (view === 'content_library' && params.get('contentTab') === 'publish_records') {
    return 'publish_records';
  }
  if (view === 'publish_records') return 'publish_records';
  return 'list';
}

export function contentDeliveryTabFromHint(hint?: string): ContentDeliveryTab {
  if (!hint) return 'list';
  if (hint === 'publish_records') return 'publish_records';
  if (hint === 'manual' || hint === 'task') return 'manual';
  if (hint === 'website') return 'website';
  if (hint.startsWith('order:') || hint.startsWith('website_req:')) {
    return hint.startsWith('website_req:') ? 'website' : 'manual';
  }
  if (hint.startsWith('publish:')) return 'publish_records';
  return 'list';
}

/** 将旧 view 归一到 content_delivery（Phase 1 兼容） */
export function normalizeToContentDelivery(
  view: ViewType,
  hint?: string
): { view: 'content_delivery'; hint?: string; tab: ContentDeliveryTab } | null {
  if (view === 'content_delivery') {
    return { view: 'content_delivery', hint, tab: contentDeliveryTabFromHint(hint) };
  }
  if (view === 'publish_records') {
    return { view: 'content_delivery', hint, tab: 'publish_records' };
  }
  if (view === 'content_library') {
    const tab =
      hint === 'publish_records' ? 'publish_records' : parseContentDeliveryTabFromUrl();
    return { view: 'content_delivery', hint, tab };
  }
  if (view === 'order_delivery') {
    const tab = contentDeliveryTabFromHint(
      hint === 'website' ? 'website' : hint === 'task' ? 'manual' : hint
    );
    return { view: 'content_delivery', hint, tab };
  }
  return null;
}

export function syncContentDeliveryUrl(tab: ContentDeliveryTab, hint?: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', 'content_delivery');
  url.searchParams.set('deliveryTab', tab);
  url.searchParams.delete('contentTab');
  url.searchParams.delete('orderTab');
  if (hint) url.searchParams.set('hint', hint);
  else url.searchParams.delete('hint');
  window.history.replaceState({}, '', url);
}

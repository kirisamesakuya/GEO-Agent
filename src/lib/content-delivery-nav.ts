import type { ViewType } from '../types';

/** 内容交付模块 Tab（统一列表迭代后） */
export type ContentDeliveryTab = 'article' | 'website';

/** @deprecated 旧 Tab 值，仅用于 URL 兼容解析 */
export type LegacyContentDeliveryTab = 'list' | 'publish_records' | 'manual' | 'website';

export const CONTENT_DELIVERY_TABS: { id: ContentDeliveryTab; label: string; desc: string }[] = [
  {
    id: 'article',
    label: '文章交付',
    desc: '所有文章从写作、审核、发布到验收的统一交付台',
  },
  {
    id: 'website',
    label: '网页需求',
    desc: '网页改装与页面类需求的结果登记',
  },
];

function legacyTabToCurrent(tab: string | null): ContentDeliveryTab | null {
  if (tab === 'website') return 'website';
  if (tab === 'list' || tab === 'publish_records' || tab === 'manual' || tab === 'article') {
    return tab === 'website' ? 'website' : 'article';
  }
  return null;
}

export function parseContentDeliveryTabFromUrl(): ContentDeliveryTab {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('deliveryTab');
  const mapped = legacyTabToCurrent(tab);
  if (mapped) return mapped;

  const view = params.get('view');
  if (view === 'order_delivery') {
    return params.get('orderTab') === 'website' ? 'website' : 'article';
  }
  if (view === 'content_library' && params.get('contentTab') === 'publish_records') {
    return 'article';
  }
  if (view === 'publish_records') return 'article';
  return 'article';
}

export function contentDeliveryTabFromHint(hint?: string): ContentDeliveryTab {
  if (!hint) return 'article';
  if (hint === 'website' || hint.startsWith('website_req:')) return 'website';
  if (hint === 'publish_records' || hint === 'manual' || hint === 'task' || hint === 'list') {
    return 'article';
  }
  if (hint.startsWith('order:')) return 'article';
  if (hint.startsWith('content:') || hint.startsWith('publish:') || hint.startsWith('delivery:')) {
    return 'article';
  }
  if (hint.startsWith('project:')) return 'article';
  return 'article';
}

/** 将旧 view 归一到 content_delivery */
export function normalizeToContentDelivery(
  view: ViewType,
  hint?: string
): { view: 'content_delivery'; hint?: string; tab: ContentDeliveryTab } | null {
  if (view === 'content_delivery') {
    return { view: 'content_delivery', hint, tab: contentDeliveryTabFromHint(hint) };
  }
  if (view === 'publish_records') {
    return { view: 'content_delivery', hint, tab: 'article' };
  }
  if (view === 'content_library') {
    return { view: 'content_delivery', hint, tab: 'article' };
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

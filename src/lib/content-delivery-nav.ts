import type { ViewType } from '../types';

/** 内容交付模块 Tab */
export type ContentDeliveryTab = 'order_manage' | 'article' | 'website';

/** @deprecated 旧 Tab 值，仅用于 URL 兼容解析 */
export type LegacyContentDeliveryTab = 'list' | 'publish_records' | 'manual' | 'website';

export const CONTENT_DELIVERY_TABS: { id: ContentDeliveryTab; label: string; desc: string }[] = [
  {
    id: 'order_manage',
    label: '发单管理',
    desc: '服务商写作任务发单、待接单与撤回',
  },
  {
    id: 'article',
    label: '文章交付',
    desc: '接单后的写作、审稿、发布与验收统一交付台',
  },
  {
    id: 'website',
    label: '网页需求',
    desc: '网页改装与页面类需求的结果登记',
  },
];

function legacyTabToCurrent(tab: string | null): ContentDeliveryTab | null {
  if (tab === 'order_manage') return 'order_manage';
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
    return params.get('orderTab') === 'website' ? 'website' : 'order_manage';
  }
  if (view === 'content_library' && params.get('contentTab') === 'publish_records') {
    return 'article';
  }
  if (view === 'publish_records') return 'article';
  return 'order_manage';
}

export function contentDeliveryTabFromHint(hint?: string): ContentDeliveryTab {
  if (!hint) return 'order_manage';
  if (hint === 'website' || hint.startsWith('website_req:')) return 'website';
  if (
    hint === 'order_manage' ||
    hint.startsWith('order_manage:') ||
    hint === 'pending_provider' ||
    hint === 'cancelled' ||
    hint === 'accepted' ||
    hint === 'published'
  ) {
    return 'order_manage';
  }
  if (hint === 'publish_records' || hint === 'manual' || hint === 'task' || hint === 'list') {
    return 'article';
  }
  if (hint.startsWith('order:')) return 'order_manage';
  if (hint.startsWith('content:') || hint.startsWith('publish:') || hint.startsWith('delivery:')) {
    return 'article';
  }
  if (hint.startsWith('project:')) return 'article';
  if (hint === 'writing') return 'article';
  return 'order_manage';
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
      hint === 'website' ? 'website' : hint === 'task' ? 'order_manage' : hint
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

import type { ViewType } from '../src/types';
import type { LucideIcon } from 'lucide-react';
import {
  ClipboardList,
  Sparkles,
  Globe,
  LayoutTemplate,
  FileText,
} from 'lucide-react';

export interface PublisherBusinessNavItem {
  id: string;
  view: ViewType;
  label: string;
  icon: LucideIcon;
  hint?: string;
  desc?: string;
}

/** 线框 §7.1：业务发单（报价撮合 / 自有账号发布） */
export const PUBLISHER_DISPATCH_NAV: PublisherBusinessNavItem[] = [
  {
    id: 'paid_source',
    view: 'create_order',
    label: '付费信源发单',
    icon: ClipboardList,
    hint: 'paid_quote',
    desc: '拆单报价 · 接单方竞价 · 确认后冻结',
  },
  {
    id: 'free_source',
    view: 'generate_article',
    label: '免费信源发单',
    icon: Sparkles,
    hint: 'quick',
    desc: 'AI 生成 GEO 文章 · 自有账号发布',
  },
];

/** 线框 §3.3 / §3.4：网站优化（工程交付，不进接单大厅） */
export const PUBLISHER_WEBSITE_NAV_SECTION_TITLE = '网站优化';

export const PUBLISHER_WEBSITE_NAV: PublisherBusinessNavItem[] = [
  {
    id: 'site_optimize',
    view: 'site_optimize',
    label: '自有网站优化',
    icon: Globe,
    desc: 'AI 建议 · 工程交付 · 线下服务费',
  },
  {
    id: 'new_site',
    view: 'create_website',
    label: '新建网站',
    icon: LayoutTemplate,
    desc: '建站方案 · 工程交付 · 线下服务费',
  },
];

/** 线框 §7.3：内容交付（发单管理 / 文章交付 / 网页需求） */
export const PUBLISHER_CONTENT_DELIVERY_SECTION_TITLE = '内容交付';

export const PUBLISHER_CONTENT_DELIVERY_NAV: PublisherBusinessNavItem[] = [
  {
    id: 'order_manage',
    view: 'content_delivery',
    label: '发单管理',
    icon: ClipboardList,
    hint: 'order_manage',
    desc: '付费信源报价任务 · 比价确认',
  },
  {
    id: 'article',
    view: 'content_delivery',
    label: '文章交付',
    icon: FileText,
    hint: 'article',
    desc: '写作、审稿、发布与验收',
  },
  {
    id: 'website',
    view: 'content_delivery',
    label: '网页需求',
    icon: Globe,
    hint: 'website',
    desc: '网页改装与建站需求登记',
  },
];

/** @deprecated 使用 DISPATCH + WEBSITE 分组 */
export const PUBLISHER_BUSINESS_NAV: PublisherBusinessNavItem[] = [
  ...PUBLISHER_DISPATCH_NAV,
  ...PUBLISHER_WEBSITE_NAV,
];

/** create_order 下属于付费信源报价撮合的 hint（排除免费信源/网页改装旧入口） */
export function isPaidSourceNavHint(hint?: string): boolean {
  if (!hint) return true;
  if (hint === 'article_writing' || hint === 'article' || hint === 'website') return false;
  if (hint.startsWith('paid_quote') || hint.startsWith('plan:') || hint.startsWith('geo:') || hint.startsWith('index:'))
    return true;
  if (hint === 'ai' || hint === 'campaign' || hint === 'delivery') return true;
  return false;
}

export function isPublisherBusinessNavActive(
  activeView: ViewType,
  item: PublisherBusinessNavItem,
  viewHint?: string
): boolean {
  if (item.id === 'paid_source') {
    return (
      (activeView === 'create_order' ||
        activeView === 'delivery_plan' ||
        activeView === 'paid_source_tasks' ||
        activeView === 'quote_compare') &&
      isPaidSourceNavHint(viewHint)
    );
  }
  if (item.id === 'free_source') {
    return activeView === 'generate_article' || activeView === 'free_source_publish';
  }
  if (item.id === 'site_optimize') {
    return activeView === 'site_optimize';
  }
  if (item.id === 'new_site') {
    return activeView === 'create_website' || activeView === 'new_site_build';
  }
  return activeView === item.view;
}

import type { ViewType } from '../types';

/** 与 docs/GEO投放助手_撮合交易最新链路与线框图.md §6.4 保持同步 */
export type QuickStartEntryId =
  | 'paid_source'
  | 'free_source'
  | 'site_optimize'
  | 'new_site';

export interface QuickStartEntry {
  id: QuickStartEntryId;
  view: ViewType;
  title: string;
  desc: string;
  hint?: string;
}

export const QUICK_START_LAST_KEY = 'geo_quick_start_last';

export const QUICK_START_ENTRIES: QuickStartEntry[] = [
  {
    id: 'paid_source',
    view: 'create_order',
    title: '付费信源发单',
    desc: '拆单报价 · 接单方竞价 · 确认后冻结',
    hint: 'paid_quote',
  },
  {
    id: 'free_source',
    view: 'generate_article',
    title: '免费信源发单',
    desc: 'AI 生成 GEO 文章 · 自有账号发布',
    hint: 'quick',
  },
  {
    id: 'site_optimize',
    view: 'site_optimize',
    title: '自有网站优化',
    desc: 'AI 建议 · 工程交付 · 线下服务费',
  },
  {
    id: 'new_site',
    view: 'create_website',
    title: '新建网站',
    desc: '建站方案 · 工程交付 · 线下服务费',
  },
];

export function readQuickStartLastEntry(): QuickStartEntryId | null {
  try {
    const raw = localStorage.getItem(QUICK_START_LAST_KEY);
    if (QUICK_START_ENTRIES.some((e) => e.id === raw)) return raw as QuickStartEntryId;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveQuickStartLastEntry(id: QuickStartEntryId) {
  try {
    localStorage.setItem(QUICK_START_LAST_KEY, id);
  } catch {
    /* ignore */
  }
}

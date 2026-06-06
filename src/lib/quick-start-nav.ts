import type { ViewType } from '../types';

/** 与 docs/GEO投放助手_快速发起项目轻量优化小迭代方案.md §1 保持同步 */
export type QuickStartEntryId =
  | 'geo_analysis'
  | 'generate_article'
  | 'create_order'
  | 'keyword_library';

export interface QuickStartEntry {
  id: QuickStartEntryId;
  view: ViewType;
  title: string;
  desc: string;
  hint?: string;
}

export const QUICK_START_LAST_KEY = 'geo_quick_start_last';

/** 主路径：诊断 → 生产 → 发单 → 词库 */
export const QUICK_START_ENTRIES: QuickStartEntry[] = [
  {
    id: 'geo_analysis',
    view: 'geo_analysis',
    title: 'GEO 分析',
    desc: '快速检测与专业审计，报告与技术资产在报告历史中查看',
  },
  {
    id: 'generate_article',
    view: 'generate_article',
    title: '生成 GEO 文章',
    desc: 'AI 撰写后进入文章结果，可发布并查看发布记录',
    hint: 'quick',
  },
  {
    id: 'create_order',
    view: 'create_order',
    title: '发布任务',
    desc: '发布文章到接单端，或在任务交付中提交网页需求',
    hint: 'ai',
  },
  {
    id: 'keyword_library',
    view: 'keyword_library',
    title: '关键词挖掘',
    desc: 'AI 挖词并写入品牌关键词库',
    hint: 'mine',
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

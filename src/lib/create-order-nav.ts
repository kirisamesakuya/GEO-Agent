import type { ViewType } from '../types';
import {
  normalizeCustomTaskKind,
  parseCustomTaskKindFromHint,
  parseCustomTaskKindFromUrl,
  type ActiveCustomTaskKind,
} from './custom-order-types';

/** 发布任务 Tab：AI 生成任务包 | 自定义发布 */
export type CreateOrderMode = 'custom' | 'ai';

export const CREATE_ORDER_MODES: { id: CreateOrderMode; label: string; desc: string }[] = [
  { id: 'ai', label: 'AI 生成任务包', desc: '按目标或 GEO 分析自动拆任务包' },
  { id: 'custom', label: '自定义发布', desc: '手动选择发布文章或网页改装' },
];

/** 旧 orderMode / hint 兼容；无 hint 时默认 AI 生成任务包 */
export function createOrderModeFromHint(hint?: string): CreateOrderMode {
  if (!hint) return 'ai';
  if (hint.startsWith('geo:')) return 'ai';
  if (hint === 'ai' || hint === 'campaign' || hint === 'delivery') return 'ai';
  if (hint === 'article_writing' || hint === 'article' || hint === 'website') return 'custom';
  return 'ai';
}

export function parseGeoReportIdFromHint(hint?: string): string | undefined {
  if (hint?.startsWith('geo:')) return hint.slice(4);
  return undefined;
}

export function parseGeoReportIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('geoReportId');
}

export function parseCreateOrderModeFromUrl(): CreateOrderMode | null {
  const m = new URLSearchParams(window.location.search).get('orderMode');
  if (m === 'custom' || m === 'ai') return m;
  if (m === 'article' || m === 'manual') return 'custom';
  return null;
}

export function resolveCustomTaskKind(hint?: string): ActiveCustomTaskKind {
  return normalizeCustomTaskKind(
    parseCustomTaskKindFromUrl() ?? parseCustomTaskKindFromHint(hint) ?? undefined
  );
}

/** 侧边栏「发布网页改装」等入口：走网页任务流，不用文章 AI 拆包 */
export function isWebsiteOrderContext(hint?: string): boolean {
  return resolveCustomTaskKind(hint) === 'website';
}

export function isCreateOrderView(view: ViewType): boolean {
  return view === 'create_order' || view === 'content_publish' || view === 'delivery_plan';
}

export function isContentPublishView(view: ViewType): boolean {
  return view === 'content_publish' || view === 'create_order';
}

/** 自定义发单：任务类型（用户手动选择） */
export type CustomTaskKind =
  | 'article_writing'
  | 'influencer'
  | 'geo_consultant'
  | 'website'
  | 'other';

/** 本期自定义发单仅开放的任务类型 */
export const ACTIVE_CUSTOM_TASK_KINDS = ['article_writing', 'website'] as const;
export type ActiveCustomTaskKind = (typeof ACTIVE_CUSTOM_TASK_KINDS)[number];

export const CUSTOM_TASK_OPTIONS: {
  id: CustomTaskKind;
  label: string;
  desc: string;
  lobbyType: string;
}[] = [
  {
    id: 'article_writing',
    label: '发布文章',
    desc: '写作 → 草稿审稿 → 发布链接回填 → 最终验收',
    lobbyType: '文章',
  },
  {
    id: 'influencer',
    label: '达人探店/种草',
    desc: '达人/KOL 内容交付与证明',
    lobbyType: '达人',
  },
  {
    id: 'geo_consultant',
    label: 'GEO 顾问',
    desc: 'GEO 策略、问答覆盖、可见度优化',
    lobbyType: 'GEO 顾问',
  },
  {
    id: 'website',
    label: '发布网页改装',
    desc: '落地页、品牌站等网页改装与 HTML 预览交付',
    lobbyType: '网页设计师',
  },
  {
    id: 'other',
    label: '其他服务',
    desc: '综合投放或其他定制服务',
    lobbyType: '综合投放',
  },
];

export const ACTIVE_CUSTOM_TASK_OPTIONS = CUSTOM_TASK_OPTIONS.filter((o) =>
  (ACTIVE_CUSTOM_TASK_KINDS as readonly string[]).includes(o.id)
);

export function isActiveCustomTaskKind(kind: string): kind is ActiveCustomTaskKind {
  return (ACTIVE_CUSTOM_TASK_KINDS as readonly string[]).includes(kind);
}

export function normalizeCustomTaskKind(kind?: CustomTaskKind | null): ActiveCustomTaskKind {
  if (kind && isActiveCustomTaskKind(kind)) return kind;
  return 'article_writing';
}

import {
  ARTICLE_PUBLISH_PLATFORM_LABELS,
  LOBBY_PLATFORM_LABELS,
} from '../../lib/media-platforms';

const LOBBY_PLATFORMS = LOBBY_PLATFORM_LABELS;
const ARTICLE_PLATFORMS = ARTICLE_PUBLISH_PLATFORM_LABELS;
const ARTICLE_DIRECTIONS = ['种草', '探店', '问答覆盖', '测评', '文章'] as const;
const ACCEPTANCE_OPTIONS = ['截图证明', '链接回传', '数据复盘', '人工确认'];

export function platformsForTaskKind(kind: CustomTaskKind): readonly string[] {
  if (kind === 'article_writing') return ARTICLE_PLATFORMS;
  if (kind === 'website') return ['网站'] as const;
  return LOBBY_PLATFORMS;
}

export function lobbyTypeForKind(kind: CustomTaskKind): string {
  return CUSTOM_TASK_OPTIONS.find((o) => o.id === kind)?.lobbyType ?? '综合投放';
}

export function parseCustomTaskKindFromHint(hint?: string): ActiveCustomTaskKind | undefined {
  if (!hint) return undefined;
  if (hint === 'article' || hint === 'article_writing') return 'article_writing';
  if (hint === 'website' || hint === 'create_website') return 'website';
  return undefined;
}

export function parseCustomTaskKindFromUrl(): ActiveCustomTaskKind | null {
  const t = new URLSearchParams(window.location.search).get('orderTask');
  if (t && isActiveCustomTaskKind(t)) return t;
  return null;
}

export { ARTICLE_DIRECTIONS, ACCEPTANCE_OPTIONS };

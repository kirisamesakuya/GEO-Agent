/** 接单端任务大厅 ViewModel */

export type TaskHallFilterTab = '' | 'high' | 'partial' | 'recent';

export const TASK_HALL_FILTER_TABS: Array<{ id: TaskHallFilterTab; label: string }> = [
  { id: '', label: '全部任务' },
  { id: 'high', label: '高匹配' },
  { id: 'partial', label: '可尝试' },
  { id: 'recent', label: '新发布' },
];

export interface TaskMarketplaceCardViewModel {
  id: string;
  title: string;
  brandName: string;
  platform: string;
  matchScore: number;
  matchLabel: string;
  matchReasons: string[];
  suggestedRangeLabel: string | null;
  slotsClaimedText: string;
  slotsAvailableText: string;
  isFull: boolean;
  publishedAtLabel: string;
  contentDirection?: string;
  industry?: string;
  city?: string;
}

export interface RawMarketplaceTask {
  id: string;
  title: string;
  brandName: string;
  platform: string;
  deliverable?: string;
  acceptance?: string;
  description?: string;
  taskBriefJson?: string;
  matchScore?: number;
  matchLabel?: string;
  suggestedMinCents?: number | null;
  suggestedMaxCents?: number | null;
  claimedCount?: number;
  availableSlots?: number;
  slotTotal?: number;
  createdAt?: string;
  contentDirection?: string;
  industry?: string;
  city?: string;
}

export function formatSuggestedRangeLabel(minCents?: number | null, maxCents?: number | null): string | null {
  if (minCents == null || maxCents == null) return null;
  return `¥${(minCents / 100).toLocaleString()} – ¥${(maxCents / 100).toLocaleString()}`;
}

function formatPublishedAt(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} 小时前`;
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function buildMatchReasons(task: RawMarketplaceTask, score: number): string[] {
  const reasons: string[] = [];
  if (task.matchLabel) reasons.push(task.matchLabel);
  if (score >= 80) reasons.push('平台与您的可接单媒体匹配');
  if (task.industry) reasons.push(`行业：${task.industry}`);
  if (task.city) reasons.push(`地区：${task.city}`);
  if (task.contentDirection) reasons.push(`方向：${task.contentDirection}`);
  if (task.suggestedMinCents != null) reasons.push('含平台建议报价区间');
  return reasons.slice(0, 4);
}

export function mapTaskMarketplaceCard(
  task: RawMarketplaceTask,
  formatSlots: (t: RawMarketplaceTask) => {
    claimedText: string;
    availableText: string;
    isFull: boolean;
  }
): TaskMarketplaceCardViewModel {
  const score = task.matchScore ?? 85;
  const slots = formatSlots(task);
  return {
    id: task.id,
    title: task.title,
    brandName: task.brandName,
    platform: task.platform,
    matchScore: score,
    matchLabel: task.matchLabel ?? (score >= 80 ? '高度匹配' : score >= 50 ? '部分匹配' : '匹配度低'),
    matchReasons: buildMatchReasons(task, score),
    suggestedRangeLabel: formatSuggestedRangeLabel(task.suggestedMinCents, task.suggestedMaxCents),
    slotsClaimedText: slots.claimedText.replace('已接', '已报价'),
    slotsAvailableText: slots.availableText,
    isFull: slots.isFull,
    publishedAtLabel: formatPublishedAt(task.createdAt),
    contentDirection: task.contentDirection,
    industry: task.industry,
    city: task.city,
  };
}

export function filterByHallTab(tasks: RawMarketplaceTask[], tab: TaskHallFilterTab): RawMarketplaceTask[] {
  if (tab === 'high') return tasks.filter((t) => (t.matchScore ?? 85) >= 80);
  if (tab === 'partial') return tasks.filter((t) => {
    const s = t.matchScore ?? 85;
    return s >= 50 && s < 80;
  });
  if (tab === 'recent') {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return tasks.filter((t) => t.createdAt && new Date(t.createdAt).getTime() >= weekAgo);
  }
  return tasks;
}

export function collectFilterOptions(tasks: RawMarketplaceTask[]) {
  const industries = [...new Set(tasks.map((t) => t.industry).filter(Boolean))] as string[];
  const directions = [...new Set(tasks.map((t) => t.contentDirection).filter(Boolean))] as string[];
  return { industries, directions };
}

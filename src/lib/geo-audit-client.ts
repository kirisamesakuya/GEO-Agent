import type { AgentTask } from '../types';
import { appendBrandQuery } from './publisher-context';

export type GeoAuditScores = {
  aiCitability?: number;
  brandAuthority?: number;
  contentEeat?: number;
  technicalGeo?: number;
  schema?: number;
  platformOptimization?: number;
};

export type GeoAuditFinding = {
  id: string;
  level: string;
  title: string;
  impact: string;
  suggestion: string;
  owner?: string;
  evidence?: string;
  source?: string;
  category?: string;
};

function mapFindingLevel(raw: unknown): string {
  const value = String(raw ?? 'medium').toUpperCase();
  if (value === 'P0' || value === 'CRITICAL') return 'critical';
  if (value === 'P1' || value === 'HIGH') return 'high';
  if (value === 'P2' || value === 'MEDIUM') return 'medium';
  if (value === 'LOW' || value === 'P3') return 'low';
  return String(raw ?? 'medium').toLowerCase();
}

function formatScoreDisplayValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    if (typeof row.score === 'number') {
      const max = typeof row.max === 'number' ? ` / ${row.max}` : '';
      const weight = row.weight ? ` · ${row.weight}` : '';
      const note = row.note ? `（${row.note}）` : '';
      return `${row.score}${max}${weight}${note}`;
    }
  }
  return value == null ? '—' : String(value);
}

/** 兼容 Hermes / Mock 多种 findings 字段命名 */
export function normalizeGeoAuditFindings(findings: unknown): GeoAuditFinding[] {
  if (!Array.isArray(findings)) return [];
  return findings.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(row.id ?? `finding-${index}`),
      level: mapFindingLevel(row.level ?? row.severity),
      title: String(row.title ?? row.finding ?? row.issue ?? '未命名问题'),
      impact: String(row.impact ?? ''),
      suggestion: String(row.suggestion ?? row.recommendation ?? ''),
      owner: row.owner ? String(row.owner) : undefined,
      evidence: row.evidence ? String(row.evidence) : undefined,
      source: row.source ? String(row.source) : undefined,
      category: row.category ? String(row.category) : undefined,
    };
  });
}

/** 兼容分项评分为 number 或 { score, max, weight } 结构 */
export function normalizeGeoAuditScores(scores: unknown): Record<string, string> {
  if (!scores || typeof scores !== 'object') return {};
  return Object.fromEntries(
    Object.entries(scores as Record<string, unknown>).map(([key, value]) => [
      key,
      formatScoreDisplayValue(value),
    ])
  );
}

export type GeoAuditArtifact = {
  id?: string;
  type?: string;
  name?: string;
  mimeType?: string;
  preview?: string;
  content?: string;
  url?: string;
};

/** 旧版/契约占位产物仅有 type，无正文、链接或文件名，不应在侧栏展示 */
export function isDisplayableGeoArtifact(artifact: GeoAuditArtifact): boolean {
  const preview = artifact.preview?.trim();
  const url = artifact.url?.trim();
  const content = artifact.content?.trim();
  if (!preview && !url && !content) return false;

  if (preview?.includes('Mock 交付物')) return false;
  if (preview) {
    try {
      const parsed = JSON.parse(preview) as { mock?: boolean };
      if (parsed && typeof parsed === 'object' && parsed.mock === true) return false;
    } catch {
      // 非 JSON 预览，保留
    }
  }
  return true;
}

export function filterDisplayableGeoArtifacts(
  artifacts?: GeoAuditArtifact[] | null
): GeoAuditArtifact[] {
  return (artifacts ?? []).filter(isDisplayableGeoArtifact);
}

export type GeoAuditDetail = {
  id: string;
  brandName: string;
  title: string;
  reportType: string;
  taskId?: string | null;
  totalScore?: number | null;
  mentionRate?: number | null;
  rank?: number | null;
  gapsFound?: number | null;
  scores?: GeoAuditScores | null;
  findings?: GeoAuditFinding[];
  artifacts?: GeoAuditArtifact[];
  actionPlan?: Array<{ id: string; horizon: string; title: string; detail: string }>;
  isBaseline?: boolean;
  taskMeta?: {
    executor?: string;
    skillName?: string;
    status?: string;
  } | null;
  raw?: Record<string, unknown> | null;
  brandMentionSummary: string;
  competitorAnalysis: string;
  contentGap: string;
  optimizationSuggestions: string;
  createdAt: string;
};

export async function submitGeoAgentTask(input: {
  type: string;
  title: string;
  brandName: string;
  payload: Record<string, unknown>;
}): Promise<{
  task?: AgentTask;
  queueHint?: {
    isQueued?: boolean;
    queuePosition?: number;
    aheadCount?: number;
    userMessage?: string;
  };
  error?: string;
}> {
  const res = await fetch(appendBrandQuery('/api/agent-tasks', input.brandName), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: input.type,
      title: input.title,
      brandName: input.brandName,
      input: input.payload,
    }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error ?? '提交失败' };
  return { task: data.task, queueHint: data.queueHint };
}

export async function fetchGeoAudit(id: string): Promise<GeoAuditDetail | null> {
  const res = await fetch(`/api/geo-audits/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.audit ?? null;
}

export async function confirmGeoAuditAction(
  reportId: string,
  actionType: string,
  riskLevel: string,
  payload?: Record<string, unknown>
) {
  const res = await fetch(`/api/geo-audits/${reportId}/confirm-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionType, riskLevel, payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '确认失败');
  return data.confirmation;
}

export async function setGeoReportBaseline(reportId: string) {
  const res = await fetch(`/api/geo-audits/${reportId}/baseline`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '设置失败');
  return data.report;
}

export async function submitGeoCompare(input: {
  brandName: string;
  baselineReportId: string;
  currentReportId: string;
  brandUrl?: string;
}): Promise<{ task?: AgentTask; error?: string }> {
  const res = await fetch('/api/geo-audits/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error ?? '对比任务提交失败' };
  return { task: data.task };
}

export async function fetchGeoReportSnapshot(reportId: string) {
  const res = await fetch(`/api/geo-audits/${reportId}/snapshot`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? '加载报告快照失败');
  return data.snapshot as Record<string, unknown>;
}

export const REPORT_TYPE_LABELS: Record<string, string> = {
  quick_start: '快速检测',
  audit: '专业审计',
  analysis: 'GEO 分析',
  assets: '技术资产',
  compare: '月度对比',
};

export const SCORE_LABELS: Record<string, string> = {
  aiCitability: 'AI 可引用性',
  brandAuthority: '品牌权威',
  contentEeat: '内容 E-E-A-T',
  technicalGeo: '技术 GEO',
  schema: 'Schema',
  platformOptimization: '平台优化',
  technicalScore: '技术得分',
  crawlerAccessScore: '爬虫访问',
};

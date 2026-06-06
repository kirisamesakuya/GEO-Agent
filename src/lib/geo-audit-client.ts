import type { AgentTask } from '../types';

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
};

export type GeoAuditArtifact = {
  id: string;
  type: string;
  name: string;
  mimeType?: string;
  preview?: string;
  url?: string;
};

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
}): Promise<{ task?: AgentTask; error?: string }> {
  const res = await fetch('/api/agent-tasks', {
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
  return { task: data.task };
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
};

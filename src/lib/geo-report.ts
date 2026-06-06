import { formatGeoReportLabel, type GeoReportTitleInput } from './geo-report-title';

export { formatGeoReportLabel, buildGeoReportTitle } from './geo-report-title';

/** GEO 报告摘要（列表/预填） */
export interface GeoReportSummary extends GeoReportTitleInput {
  id: string;
  brandName: string;
  title?: string;
  reportType?: string;
  totalScore?: number | null;
  isBaseline?: boolean;
  scores?: Record<string, number> | null;
  findings?: Array<{ id: string; level: string; title: string; impact: string; suggestion: string; owner?: string }>;
  artifacts?: Array<{ id: string; type: string; name: string; preview?: string; url?: string }>;
  actionPlan?: Array<{ id: string; horizon: string; title: string; detail: string }>;
  brandMentionSummary: string;
  competitorAnalysis: string;
  contentGap: string;
  optimizationSuggestions: string;
  createdAt: string;
}

export function geoReportOptionLabel(report: GeoReportSummary): string {
  return formatGeoReportLabel(report);
}

export async function fetchGeoReports(brandName: string): Promise<GeoReportSummary[]> {
  const q = brandName ? `?brandName=${encodeURIComponent(brandName)}` : '';
  const res = await fetch(`/api/geo-reports${q}`);
  const data = await res.json();
  return (data.reports ?? []) as GeoReportSummary[];
}

export async function fetchGeoReport(id: string): Promise<GeoReportSummary | null> {
  const res = await fetch(`/api/geo-reports/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data.report ?? null) as GeoReportSummary | null;
}

/** 从 GEO 报告预填文章写作单字段 */
export function prefillArticleOrderFromGeo(report: GeoReportSummary) {
  const gapLines = report.contentGap.split(/[。；\n]/).filter(Boolean).slice(0, 5);
  const kwFromGap = gapLines
    .map((l) => l.replace(/^Mock\s*内容缺口[：:]?\s*/i, '').trim())
    .filter((l) => l.length >= 2 && l.length <= 40)
    .slice(0, 6);
  const keywords =
    kwFromGap.length > 0
      ? kwFromGap.join('\n')
      : `品牌可见度\n${report.brandMentionSummary.slice(0, 40)}`;
  const title = `GEO 补缺 · ${report.gapsFound ?? ''} 项内容缺口`.replace(/\s+/g, ' ').trim();
  const reviewNote = [
    '依据 GEO 分析报告验收：',
    report.optimizationSuggestions.slice(0, 280),
    report.competitorAnalysis ? `竞品参考：${report.competitorAnalysis.slice(0, 120)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const referenceNote = `GEO 报告 #${report.id.slice(0, 8)} · 提及率 ${report.mentionRate ?? '—'}% · 排名 #${report.rank ?? '—'}\n${report.brandMentionSummary.slice(0, 200)}`;
  const articleCount = Math.min(5, Math.max(1, Math.ceil((report.gapsFound ?? 3) / 2)));
  const budget = Math.max(500, articleCount * 400);
  return { title, keywords, reviewNote, referenceNote, articleCount, budget };
}

export async function requestCampaignPlanFromGeo(input: {
  brandName: string;
  geoReportId: string;
  platforms?: string[];
  budgetMin?: number;
  budgetMax?: number;
  userConfirmedExecution?: boolean;
}): Promise<{ task?: { id: string }; error?: string; requiresConfirmation?: boolean }> {
  const res = await fetch('/api/campaign-plans/generate-from-geo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      error: data.error ?? '生成失败',
      requiresConfirmation: Boolean(data.requiresConfirmation),
    };
  }
  return { task: data.task };
}

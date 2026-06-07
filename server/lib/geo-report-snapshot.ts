import { getGeoAudit } from '../services/geo-audit.service.js';

export type GeoReportCompareSnapshot = {
  id: string;
  brandName: string;
  title: string;
  reportType: string;
  createdAt: string;
  isBaseline?: boolean;
  totalScore?: number | null;
  mentionRate?: number | null;
  rank?: number | null;
  gapsFound?: number | null;
  scores?: Record<string, number> | null;
  metrics?: Record<string, unknown>;
  findings?: unknown[];
  actionPlan?: unknown[];
  data?: {
    brandMentionSummary?: string;
    competitorAnalysis?: string;
    contentGap?: string;
    optimizationSuggestions?: string;
  };
};

export async function buildGeoReportSnapshot(
  reportId: string
): Promise<GeoReportCompareSnapshot | null> {
  const audit = await getGeoAudit(reportId);
  if (!audit) return null;

  return {
    id: audit.id,
    brandName: audit.brandName,
    title: audit.title,
    reportType: audit.reportType,
    createdAt: audit.createdAt,
    isBaseline: audit.isBaseline,
    totalScore: audit.totalScore,
    mentionRate: audit.mentionRate,
    rank: audit.rank,
    gapsFound: audit.gapsFound,
    scores: audit.scores ?? null,
    findings: audit.findings ?? [],
    actionPlan: audit.actionPlan ?? [],
    data: {
      brandMentionSummary: audit.brandMentionSummary,
      competitorAnalysis: audit.competitorAnalysis,
      contentGap: audit.contentGap,
      optimizationSuggestions: audit.optimizationSuggestions,
    },
  };
}

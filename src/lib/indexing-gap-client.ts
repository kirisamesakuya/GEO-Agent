export interface IndexPlanSummary {
  id: string;
  brandName: string;
  name: string;
  platforms: string[];
  keywords: string[];
  status: string;
  resultCount?: number;
  hitCount?: number;
  queryAt?: string;
}

export interface IndexingGapAnalysis {
  planId: string;
  planName: string;
  planStatus: string;
  totalCount: number;
  hitCount: number;
  gapCount: number;
  gapResultIds: string[];
  targetQuestions: string[];
  targetPlatforms: string[];
  brandMentionRate: number;
  competitorMentions: string[];
  hasResults: boolean;
}

export async function fetchIndexPlans(brandName: string): Promise<IndexPlanSummary[]> {
  const res = await fetch(`/api/indexing/plans?brandName=${encodeURIComponent(brandName)}`);
  const data = await res.json();
  return (data.plans ?? []) as IndexPlanSummary[];
}

export async function fetchIndexingGapAnalysis(planId: string): Promise<IndexingGapAnalysis | null> {
  const res = await fetch(`/api/indexing/plans/${planId}/gap-analysis`);
  const data = await res.json();
  if (data.error) return null;
  return (data.analysis ?? null) as IndexingGapAnalysis | null;
}

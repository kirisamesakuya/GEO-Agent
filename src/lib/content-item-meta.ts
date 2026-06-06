export interface EffectBaseline {
  source: 'indexing_result';
  capturedAt: string;
  sourceIndexPlanId: string;
  sourceIndexResultIds: string[];
  targetQuestions: string[];
  targetPlatforms: string[];
  brandMentionRate: number;
  competitorMentions: string[];
  answerSnapshots: Array<{
    platform: string;
    question: string;
    brandMentioned: boolean;
    rank: number | null;
    summary: string;
  }>;
}

export interface EffectVerification {
  enabled: boolean;
  scheduleDays: number[];
  retestPlanIds: Record<string, string>;
  checkpoints: Record<
    string,
    {
      status: 'pending' | 'scheduled' | 'done';
      scheduledAt?: string;
      planId?: string;
      brandMentionRate?: number;
      judgment?: string;
      completedAt?: string;
    }
  >;
  overallJudgment: string;
  publishUrl?: string;
  publishRecordId?: string;
  publishedAt?: string;
}

export interface ArticleGenerationMeta {
  sourceType?: 'brand_profile' | 'geo_report' | 'indexing_result';
  sourceIndexPlanId?: string;
  sourceIndexResultIds?: string[];
  targetQuestions?: string[];
  targetPlatforms?: string[];
  sourceReportId?: string | null;
  sourceReportTitle?: string | null;
  sourceTaskId?: string | null;
  usedKnowledge?: Array<{ category: string; categoryLabel: string; title: string }>;
  keywords?: string[];
  targetPlatform?: string;
  model?: string;
}

export interface ArticleQualityChecks {
  forbiddenWords?: { passed?: boolean; hits?: string[] };
  factCoverage?: { passed?: boolean; missing?: string[] };
  geoCitability?: { score?: number; suggestions?: string[] };
}

export function parseGenerationMeta(json?: string | null): ArticleGenerationMeta | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ArticleGenerationMeta;
  } catch {
    return null;
  }
}

export function parseQualityChecks(json?: string | null): ArticleQualityChecks | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ArticleQualityChecks;
  } catch {
    return null;
  }
}

export function isPublishBlockedByQuality(qc: ArticleQualityChecks | null): boolean {
  return qc?.forbiddenWords?.passed === false;
}

export function parseEffectBaseline(json?: string | null): EffectBaseline | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as EffectBaseline;
  } catch {
    return null;
  }
}

export function parseEffectVerification(json?: string | null): EffectVerification | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as EffectVerification;
  } catch {
    return null;
  }
}

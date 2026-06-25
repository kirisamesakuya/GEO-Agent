/** 付费信源发单任务 brief（存入 TaskOrder.taskBriefJson） */
export interface PaidSourceTaskBrief {
  taskName?: string;
  taskType?: string;
  targetPlatforms?: string[];
  demandSource?: string;
  brandIntro?: string;
  productSellingPoints?: string;
  targetKeywords?: string[];
  contentDirection?: string;
  referenceLinks?: string[];
  websiteUrl?: string;
  wordCountRange?: string;
  publishDeadline?: string;
  requireLink?: boolean;
  requireScreenshot?: boolean;
  requireIndexingProof?: boolean;
  deliveryNote?: string;
  acceptanceCriteria?: string;
  industryLimit?: string;
  regionLimit?: string;
  complianceNotes?: string;
  supplementNotes?: string;
  hiddenBudgetMaxCents?: number;
  perTaskBudgetCapCents?: number;
}

export function parseTaskBrief(raw: string | null | undefined): PaidSourceTaskBrief | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PaidSourceTaskBrief;
  } catch {
    return null;
  }
}

export function serializeTaskBrief(brief: PaidSourceTaskBrief): string {
  return JSON.stringify(brief);
}

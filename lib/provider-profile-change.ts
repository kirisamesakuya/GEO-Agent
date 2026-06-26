/** 接单方资料变更：公信力字段 vs 可即时修改字段 */

export type ProviderCredibilityDraft = {
  name: string;
  type: string;
  platforms: string[];
  serviceAreas: string[];
  caseLinks: string[];
  budgetMin?: number;
  budgetMax?: number;
  pricingNote?: string;
};

export type ProviderProfileReviewStatus = 'none' | 'pending' | 'rejected';

export const PROFILE_REVIEW_STATUS_LABEL: Record<ProviderProfileReviewStatus, string> = {
  none: '',
  pending: '资料变更审核中',
  rejected: '资料变更未通过',
};

export function parseCredibilityDraft(raw: string | null | undefined): ProviderCredibilityDraft | null {
  if (!raw?.trim()) return null;
  try {
    const v = JSON.parse(raw) as ProviderCredibilityDraft;
    if (!v || typeof v !== 'object') return null;
    return {
      name: String(v.name ?? '').trim() || '新媒体接单方',
      type: String(v.type ?? '达人').trim() || '达人',
      platforms: Array.isArray(v.platforms) ? v.platforms.map(String).filter(Boolean) : [],
      serviceAreas: Array.isArray(v.serviceAreas) ? v.serviceAreas.map(String).filter(Boolean) : [],
      caseLinks: Array.isArray(v.caseLinks) ? v.caseLinks.map(String).filter(Boolean) : [],
      budgetMin: v.budgetMin != null ? Number(v.budgetMin) : undefined,
      budgetMax: v.budgetMax != null ? Number(v.budgetMax) : undefined,
      pricingNote: v.pricingNote?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export function credibilityDraftFromProvider(p: {
  name?: string | null;
  type?: string | null;
  platforms?: string | null;
  serviceAreas?: string | null;
  caseLinks?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  pricingNote?: string | null;
}): ProviderCredibilityDraft {
  const parseArr = (raw?: string | null) => {
    if (!raw) return [];
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  };
  return {
    name: p.name?.trim() || '新媒体接单方',
    type: p.type?.trim() || '达人',
    platforms: parseArr(p.platforms),
    serviceAreas: parseArr(p.serviceAreas),
    caseLinks: parseArr(p.caseLinks),
    budgetMin: p.budgetMin ?? undefined,
    budgetMax: p.budgetMax ?? undefined,
    pricingNote: p.pricingNote?.trim() || undefined,
  };
}

export function validateCredibilityDraft(draft: ProviderCredibilityDraft): string | null {
  if (!draft.name.trim()) return '请填写团队/机构名称';
  if (draft.platforms.length === 0) return '请至少选择一个媒体平台';
  if (draft.serviceAreas.length === 0) return '请至少选择一个接单地区';
  if (draft.budgetMin != null && draft.budgetMax != null && draft.budgetMin > draft.budgetMax) {
    return '最低单价不能高于最高单价';
  }
  return null;
}

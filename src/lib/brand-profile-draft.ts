import type { BrandProfile } from '../types';

const DRAFT_KEY_PREFIX = 'geo-brand-profile-draft:';

export interface BrandProfileDraft {
  profile: Partial<BrandProfile>;
  taskId?: string;
  savedAt: string;
}

function draftKey(brandName: string) {
  return `${DRAFT_KEY_PREFIX}${brandName}`;
}

export function saveBrandProfileDraft(
  brandName: string,
  profile: Partial<BrandProfile>,
  taskId?: string
) {
  const draft: BrandProfileDraft = {
    profile,
    taskId,
    savedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(draftKey(brandName), JSON.stringify(draft));
}

export function loadBrandProfileDraft(brandName: string): BrandProfileDraft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(brandName));
    if (!raw) return null;
    return JSON.parse(raw) as BrandProfileDraft;
  } catch {
    return null;
  }
}

export function clearBrandProfileDraft(brandName: string) {
  sessionStorage.removeItem(draftKey(brandName));
}

export function applyBrandProfileDraft(base: BrandProfile, draft: Partial<BrandProfile>): BrandProfile {
  return {
    ...base,
    name: draft.name?.trim() ? draft.name : base.name,
    industry: draft.industry?.trim() ? draft.industry : base.industry,
    city: draft.city?.trim() ? draft.city : base.city,
    storeCount: draft.storeCount != null ? Number(draft.storeCount) : base.storeCount,
    description: draft.description?.trim() ? draft.description : base.description,
    keywords: draft.keywords?.length ? draft.keywords : base.keywords,
    competitors: draft.competitors?.length ? draft.competitors : base.competitors,
    forbiddenWords: draft.forbiddenWords?.length ? draft.forbiddenWords : base.forbiddenWords,
    ownerName: draft.ownerName?.trim() ? draft.ownerName : base.ownerName,
    website: draft.website?.trim() ? draft.website : base.website,
  };
}

export function suggestedProfileToDraft(suggested: Record<string, unknown>): Partial<BrandProfile> {
  return {
    name: suggested.name != null ? String(suggested.name) : undefined,
    industry: suggested.industry != null ? String(suggested.industry) : undefined,
    city: suggested.city != null ? String(suggested.city) : undefined,
    storeCount: suggested.storeCount != null ? Number(suggested.storeCount) : undefined,
    description: suggested.description != null ? String(suggested.description) : undefined,
    keywords: Array.isArray(suggested.keywords) ? suggested.keywords.map(String) : undefined,
    competitors: Array.isArray(suggested.competitors) ? suggested.competitors.map(String) : undefined,
    forbiddenWords: Array.isArray(suggested.forbiddenWords)
      ? suggested.forbiddenWords.map(String)
      : undefined,
  };
}

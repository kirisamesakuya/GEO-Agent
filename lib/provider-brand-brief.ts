import type { PaidSourceTaskBrief } from './paid-source-brief';

/** 接单方可见的品牌基础信息（发布端 DeliveryPlanView 同源） */
export interface ProviderBrandBriefView {
  brandName: string;
  industry?: string;
  city?: string;
  description?: string;
  keywords?: string[];
  website?: string;
  forbiddenWords?: string[];
  productSellingPoints?: string;
  supplementNotes?: string;
  demandSource?: string;
  complianceNotes?: string;
}

type BrandProfileSlice = {
  name?: string;
  industry?: string;
  city?: string;
  description?: string;
  keywords?: string[];
  website?: string;
  forbiddenWords?: string[];
};

export function buildProviderBrandBriefView(
  brandName: string,
  profile: BrandProfileSlice | null | undefined,
  brief: PaidSourceTaskBrief | null | undefined
): ProviderBrandBriefView {
  const forbiddenFromBrief =
    brief?.complianceNotes?.trim()
      ? brief.complianceNotes
          .split(/[、,，/]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

  return {
    brandName: profile?.name?.trim() || brandName,
    industry: brief?.industryLimit?.trim() || profile?.industry?.trim() || undefined,
    city: brief?.regionLimit?.trim() || profile?.city?.trim() || undefined,
    description:
      brief?.brandIntro?.trim() || profile?.description?.trim() || undefined,
    keywords: brief?.targetKeywords?.length
      ? brief.targetKeywords
      : profile?.keywords?.length
        ? profile.keywords
        : undefined,
    website: brief?.websiteUrl?.trim() || profile?.website?.trim() || undefined,
    forbiddenWords: profile?.forbiddenWords?.length
      ? profile.forbiddenWords
      : forbiddenFromBrief,
    productSellingPoints: brief?.productSellingPoints?.trim() || undefined,
    supplementNotes: brief?.supplementNotes?.trim() || undefined,
    demandSource: brief?.demandSource?.trim() || undefined,
    complianceNotes:
      brief?.complianceNotes?.trim() &&
      !profile?.forbiddenWords?.length
        ? brief.complianceNotes.trim()
        : undefined,
  };
}

export function providerBrandBriefHasContent(brief: ProviderBrandBriefView): boolean {
  return Boolean(
    brief.description ||
      brief.keywords?.length ||
      brief.website ||
      brief.forbiddenWords?.length ||
      brief.complianceNotes ||
      brief.productSellingPoints ||
      brief.supplementNotes ||
      brief.industry ||
      brief.city
  );
}

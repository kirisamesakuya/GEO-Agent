import { BRAND_STORAGE_KEY, isProspectBrandScope } from './brand-scope';

export interface PublisherBrandOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface PublisherMeResponse {
  userId: string;
  organizationId: string | null;
  brandName: string | null;
  brands: PublisherBrandOption[];
  authMode: 'demo' | 'session';
}

export interface PublisherContextSnapshot {
  me: PublisherMeResponse | null;
  brands: PublisherBrandOption[];
}

/** 优先 session 上下文，Demo 环境回退到 /api/brands 或 brand-profile */
export async function fetchPublisherContext(): Promise<PublisherContextSnapshot> {
  try {
    const meRes = await fetch('/api/publisher/me');
    if (meRes.ok) {
      const me = (await meRes.json()) as PublisherMeResponse;
      return { me, brands: me.brands ?? [] };
    }
  } catch {
    // fall through
  }

  try {
    const brandsRes = await fetch('/api/brands');
    if (brandsRes.ok) {
      const data = await brandsRes.json();
      const brands = (data.brands ?? []) as PublisherBrandOption[];
      return { me: null, brands };
    }
  } catch {
    // fall through
  }

  try {
    const profileRes = await fetch('/api/brand-profile');
    if (profileRes.ok) {
      const profile = await profileRes.json();
      if (profile?.name) {
        return {
          me: null,
          brands: [{ id: profile.id ?? 'default', name: profile.name, isDefault: true }],
        };
      }
    }
  } catch {
    // ignore
  }

  return { me: null, brands: [] };
}

export function resolvePublisherBrandName(input: {
  saved: string | null;
  me: PublisherMeResponse | null;
  brands: PublisherBrandOption[];
  fallback?: string;
}): string {
  const { saved, me, brands, fallback = '云杉口腔' } = input;
  const names = new Set(brands.map((b) => b.name));

  if (saved === '__all__' || (saved && isProspectBrandScope(saved))) {
    return saved;
  }
  if (saved && names.has(saved)) return saved;
  if (me?.brandName && names.has(me.brandName)) return me.brandName;
  const def = brands.find((b) => b.isDefault) ?? brands[0];
  return def?.name ?? fallback;
}

export function readSavedPublisherBrand(): string | null {
  return localStorage.getItem(BRAND_STORAGE_KEY);
}

export function persistPublisherBrand(name: string) {
  if (name !== '__all__' && !isProspectBrandScope(name)) {
    localStorage.setItem(BRAND_STORAGE_KEY, name);
  }
}

export function appendBrandQuery(
  baseUrl: string,
  brandName: string,
  extra?: Record<string, string | boolean | undefined>
): string {
  const q = new URLSearchParams({ brandName });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined) continue;
      q.set(k, String(v));
    }
  }
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}${q}`;
}

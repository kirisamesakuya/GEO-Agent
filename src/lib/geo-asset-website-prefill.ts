import type { WebsiteLeadIntakeValues } from '../components/delivery/WebsiteLeadIntakeForm';

const STORAGE_KEY = 'geoWebsiteRequestPrefill';
const TTL_MS = 30 * 60 * 1000;

export interface GeoAssetWebsitePrefill {
  brandName: string;
  referenceUrl?: string;
  keywords?: string;
  notes?: string;
  at: number;
}

export function stashGeoAssetWebsitePrefill(input: Omit<GeoAssetWebsitePrefill, 'at'>) {
  const payload: GeoAssetWebsitePrefill = { ...input, at: Date.now() };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function consumeGeoAssetWebsitePrefill(
  brandName: string
): Partial<WebsiteLeadIntakeValues> | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as GeoAssetWebsitePrefill;
    if (parsed.brandName !== brandName || Date.now() - parsed.at > TTL_MS) return undefined;
    sessionStorage.removeItem(STORAGE_KEY);
    return {
      referenceUrl: parsed.referenceUrl ?? '',
      keywords: parsed.keywords ?? '',
      notes: parsed.notes ?? '',
    };
  } catch {
    return undefined;
  }
}

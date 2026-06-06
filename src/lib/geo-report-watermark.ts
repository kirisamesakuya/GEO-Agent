const STORAGE_KEY = 'geo:report-watermark';

export interface GeoReportWatermarkSettings {
  enabled: boolean;
  text: string;
  opacity: number;
  fontSize: number;
}

export const DEFAULT_GEO_REPORT_WATERMARK: GeoReportWatermarkSettings = {
  enabled: true,
  text: '仅供客户查阅 · 请勿外传',
  opacity: 0.12,
  fontSize: 42,
};

export function loadGeoReportWatermark(): GeoReportWatermarkSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GEO_REPORT_WATERMARK };
    const parsed = JSON.parse(raw) as Partial<GeoReportWatermarkSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_GEO_REPORT_WATERMARK.enabled,
      text: String(parsed.text ?? DEFAULT_GEO_REPORT_WATERMARK.text).slice(0, 80),
      opacity: Math.min(0.35, Math.max(0.06, Number(parsed.opacity) || DEFAULT_GEO_REPORT_WATERMARK.opacity)),
      fontSize: Math.min(72, Math.max(24, Number(parsed.fontSize) || DEFAULT_GEO_REPORT_WATERMARK.fontSize)),
    };
  } catch {
    return { ...DEFAULT_GEO_REPORT_WATERMARK };
  }
}

export function saveGeoReportWatermark(settings: GeoReportWatermarkSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

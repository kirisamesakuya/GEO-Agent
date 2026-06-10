export type GeoAnalysisTab = 'smart_check' | 'history' | 'assets';

export const GEO_ANALYSIS_TABS: { id: GeoAnalysisTab; label: string }[] = [
  { id: 'smart_check', label: 'GEO 检测' },
  { id: 'assets', label: '网站 GEO 资产' },
  { id: 'history', label: '报告历史' },
];

export function parseGeoAnalysisTabFromUrl(): GeoAnalysisTab {
  const t = new URLSearchParams(window.location.search).get('geoTab');
  if (t === 'history') return 'history';
  if (t === 'assets') return 'assets';
  if (t === 'audit' || t === 'smart_check') return 'smart_check';
  return 'smart_check';
}

export function parseGeoAssetTypeFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('geoAssetType');
}

export function parseGeoReportIdFromHistoryUrl(): string | null {
  return new URLSearchParams(window.location.search).get('reportId');
}

export type GeoAnalysisTab = 'smart_check' | 'assets' | 'history';

export const GEO_ANALYSIS_TABS: { id: GeoAnalysisTab; label: string }[] = [
  { id: 'smart_check', label: '首次体检' },
  { id: 'assets', label: '资产生成' },
  { id: 'history', label: '报告历史' },
];

export function parseGeoAnalysisTabFromUrl(): GeoAnalysisTab {
  const t = new URLSearchParams(window.location.search).get('geoTab');
  if (t === 'history') return 'history';
  if (t === 'assets') return 'assets';
  if (t === 'audit') return 'smart_check';
  if (t === 'smart_check') return 'smart_check';
  return 'smart_check';
}

export function parseGeoReportIdFromHistoryUrl(): string | null {
  return new URLSearchParams(window.location.search).get('reportId');
}

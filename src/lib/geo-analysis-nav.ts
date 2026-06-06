export type GeoAnalysisTab = 'smart_check' | 'history';

export const GEO_ANALYSIS_TABS: { id: GeoAnalysisTab; label: string }[] = [
  { id: 'smart_check', label: '智能检测' },
  { id: 'history', label: '报告历史' },
];

export function parseGeoAnalysisTabFromUrl(): GeoAnalysisTab {
  const t = new URLSearchParams(window.location.search).get('geoTab');
  if (t === 'history') return 'history';
  return 'smart_check';
}

export function parseGeoReportIdFromHistoryUrl(): string | null {
  return new URLSearchParams(window.location.search).get('reportId');
}

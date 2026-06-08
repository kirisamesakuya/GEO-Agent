export type GeoAnalysisTab = 'smart_check' | 'history';

export const GEO_ANALYSIS_TABS: { id: GeoAnalysisTab; label: string }[] = [
  { id: 'smart_check', label: 'GEO 检测' },
  { id: 'history', label: '报告历史' },
];

export function parseGeoAnalysisTabFromUrl(): GeoAnalysisTab {
  const t = new URLSearchParams(window.location.search).get('geoTab');
  if (t === 'history') return 'history';
  // 资产生成已并入深度分析，兼容旧链接
  if (t === 'assets' || t === 'audit' || t === 'smart_check') return 'smart_check';
  return 'smart_check';
}

export function parseGeoReportIdFromHistoryUrl(): string | null {
  return new URLSearchParams(window.location.search).get('reportId');
}

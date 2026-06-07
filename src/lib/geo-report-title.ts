/** GEO 报告展示标题（与 server 端 buildGeoReportTitle 规则一致） */

export interface GeoReportTitleInput {
  id?: string;
  brandName: string;
  createdAt: string | Date;
  mentionRate?: number | null;
  rank?: number | null;
  gapsFound?: number | null;
  platforms?: string[];
  keywords?: string[];
  prospectMode?: boolean;
  title?: string | null;
  platformsJson?: string | null;
  keywordsJson?: string | null;
}

function parseJsonStringArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function buildGeoReportTitle(input: GeoReportTitleInput): string {
  const dt = input.createdAt instanceof Date ? input.createdAt : new Date(input.createdAt);
  const timePart = Number.isNaN(dt.getTime())
    ? '未知时间'
    : dt.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

  const platforms =
    input.platforms?.length ? input.platforms : parseJsonStringArray(input.platformsJson);
  const keywords = input.keywords?.length ? input.keywords : parseJsonStringArray(input.keywordsJson);

  const platPart = platforms.length
    ? platforms.length <= 2
      ? platforms.join('·')
      : `${platforms[0]}等${platforms.length}个AI平台`
    : '默认AI平台';

  const kwPart = keywords.length
    ? keywords.length === 1
      ? `词「${keywords[0]}」`
      : `词「${keywords[0]}」等${keywords.length}个`
    : '未指定关键词';

  const metricParts = [
    input.mentionRate != null ? `提及${input.mentionRate}%` : null,
    input.rank != null ? `排名#${input.rank}` : null,
    input.gapsFound != null ? `缺口${input.gapsFound}项` : null,
  ].filter(Boolean);

  const modePart = input.prospectMode ? '售前探店' : null;
  const idPart = input.id ? input.id.slice(0, 8) : null;

  return [
    input.brandName,
    'GEO分析',
    timePart,
    modePart,
    platPart,
    kwPart,
    metricParts.length ? metricParts.join(' ') : null,
    idPart ? `#${idPart}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** 下拉/列表用：优先库内 title，否则按维度拼装 */
export function formatGeoReportLabel(report: GeoReportTitleInput): string {
  if (report.title?.trim()) return report.title.trim();
  return buildGeoReportTitle(report);
}

export type GeoProjectSourceType = 'geo_report' | 'indexing_gap' | 'manual';

export interface GeoContentProjectSummary {
  id: string;
  name: string;
  sourceType: string;
  sourceRef?: string;
  targetQuestions: string[];
  targetKeywords: string[];
  targetAiPlatforms: string[];
  targetPublishPlatforms: string[];
  status: string;
  publishProgress?: string;
  stats?: {
    contentTotal: number;
    contentConfirmed: number;
    contentPublished: number;
    contentScheduled: number;
    byPlatform: Record<string, number>;
  };
}

export const GEO_PROJECT_SOURCE_LABEL: Record<string, string> = {
  geo_report: 'GEO 报告',
  indexing_gap: '排名监控',
  manual: '手动创建',
};

export const PUBLISH_STATUS_LABEL: Record<string, string> = {
  not_scheduled: '未排程',
  scheduled: '已排程',
  published: '已发布',
  failed: '发布失败',
};

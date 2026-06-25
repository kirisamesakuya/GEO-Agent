import {
  CONTENT_PUBLISH_PLATFORM_LABELS,
  LOBBY_PLATFORM_LABELS,
  INDUSTRY_MEDIA_SUGGESTIONS,
  OFFICIAL_MEDIA_PLATFORM,
  WEBSITE_PUBLISH_PLATFORM,
} from '../../lib/media-platforms';

/** 发布端内容发布 / 内容库侧栏平台（含网站发文渠道） */
export const PUBLISH_CONTENT_PLATFORMS = [...CONTENT_PUBLISH_PLATFORM_LABELS] as const;

export { WEBSITE_PUBLISH_PLATFORM, OFFICIAL_MEDIA_PLATFORM };

/** 接单端任务大厅筛选：大类（含行业媒体、官媒） */
export const PROVIDER_TASK_HALL_FILTER_PLATFORMS = [...LOBBY_PLATFORM_LABELS] as const;

/** 接单端可选行业媒体子项（擅长平台细选，可选） */
export const PROVIDER_INDUSTRY_MEDIA_OUTLETS = [...INDUSTRY_MEDIA_SUGGESTIONS] as const;

export type ProviderTaskHallPlatform = (typeof PROVIDER_TASK_HALL_FILTER_PLATFORMS)[number];

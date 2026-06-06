import {
  CONTENT_PUBLISH_PLATFORM_LABELS,
  LOBBY_PLATFORM_LABELS,
  OFFICIAL_MEDIA_PLATFORM,
  WEBSITE_PUBLISH_PLATFORM,
} from '../../lib/media-platforms';

/** 发布端内容发布 / 内容库侧栏平台（含网站发文渠道） */
export const PUBLISH_CONTENT_PLATFORMS = [...CONTENT_PUBLISH_PLATFORM_LABELS] as const;

export { WEBSITE_PUBLISH_PLATFORM, OFFICIAL_MEDIA_PLATFORM };

/** 接单端任务大厅筛选：与发布端发文平台对齐，并含官媒 */
export const PROVIDER_TASK_HALL_FILTER_PLATFORMS = [...LOBBY_PLATFORM_LABELS] as const;

export type ProviderTaskHallPlatform = (typeof PROVIDER_TASK_HALL_FILTER_PLATFORMS)[number];

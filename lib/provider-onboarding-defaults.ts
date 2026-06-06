import { LOBBY_PLATFORM_LABELS } from './media-platforms';

/** 接单端入驻：后台维护的默认接单地区（可被 config/provider-onboarding.json 覆盖） */
export const DEFAULT_PROVIDER_SERVICE_REGIONS = [
  '全国',
  '北京',
  '上海',
  '广州',
  '深圳',
  '杭州',
  '南京',
  '苏州',
  '无锡',
  '常州',
  '镇江',
  '扬州',
  '泰州',
  '南通',
  '成都',
  '武汉',
  '重庆',
  '西安',
  '天津',
  '青岛',
] as const;

export const DEFAULT_PROVIDER_ONBOARDING_OPTIONS = {
  mediaPlatforms: [...LOBBY_PLATFORM_LABELS],
  serviceRegions: [...DEFAULT_PROVIDER_SERVICE_REGIONS],
} as const;

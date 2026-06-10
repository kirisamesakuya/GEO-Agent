import { DEFAULT_INDEXING_PLATFORMS } from './media-platforms.js';

/** GEO 监控默认采样的五平台（与排名采样技能一致） */
export const AI_MONITOR_PLATFORMS = [...DEFAULT_INDEXING_PLATFORMS] as const;

export type AiMonitorPlatformLabel = (typeof AI_MONITOR_PLATFORMS)[number];

/** 会话探测用固定问句（轻量检测输入框与登录态） */
export const AI_MONITOR_PROBE_KEYWORD = '你好';

/** 各平台 Web 对话入口（打开登录页 / 协助登录） */
export const AI_MONITOR_LOGIN_URLS: Record<AiMonitorPlatformLabel, string> = {
  DeepSeek: 'https://chat.deepseek.com/',
  豆包: 'https://www.doubao.com/chat/',
  千问: 'https://tongyi.aliyun.com/qianwen/',
  Kimi: 'https://kimi.moonshot.cn/',
  元宝: 'https://yuanbao.tencent.com/',
};

/** 平台登录说明（展示在监测平台 Tab） */
export const AI_MONITOR_LOGIN_HINTS: Record<AiMonitorPlatformLabel, string> = {
  DeepSeek: '打开对话页，使用手机号或微信登录',
  豆包: '打开豆包对话页，扫码或手机号登录',
  千问: '使用阿里账号登录通义千问',
  Kimi: '打开 Kimi 对话页完成登录',
  元宝: '使用腾讯账号登录元宝',
};

export interface AiMonitorPlatformCatalogEntry {
  platform: AiMonitorPlatformLabel;
  loginUrl: string;
  loginHint: string;
}

export function aiMonitorPlatformCatalog(): AiMonitorPlatformCatalogEntry[] {
  return AI_MONITOR_PLATFORMS.map((platform) => ({
    platform,
    loginUrl: AI_MONITOR_LOGIN_URLS[platform],
    loginHint: AI_MONITOR_LOGIN_HINTS[platform],
  }));
}

export function aiMonitorLoginUrl(platform: string): string | undefined {
  return AI_MONITOR_LOGIN_URLS[platform as AiMonitorPlatformLabel];
}

export const AI_MONITOR_PROBE_BUSINESS_REF_PREFIX = 'ai_monitor_probe:';

export function aiMonitorProbeBusinessRef(brandId: string): string {
  return `${AI_MONITOR_PROBE_BUSINESS_REF_PREFIX}${brandId}`;
}

export function parseAiMonitorProbeBrandId(businessRef: string): string | null {
  if (!businessRef.startsWith(AI_MONITOR_PROBE_BUSINESS_REF_PREFIX)) return null;
  return businessRef.slice(AI_MONITOR_PROBE_BUSINESS_REF_PREFIX.length) || null;
}

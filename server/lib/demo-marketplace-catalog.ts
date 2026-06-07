/**
 * 发布端（订单交付 / 发单）与接单端（任务大厅）共用的演示任务目录。
 * 实际落库由 ensureDemoMarketplaceReady → ensureDemoTaskOrders 完成。
 */
export const DEMO_MARKETPLACE_PREFIX = '[演示]';

/** 任务大厅「待接单」演示条数（published） */
export const DEMO_MARKETPLACE_PUBLISHED_COUNT = 21;

export const DEMO_MARKETPLACE_PLATFORMS = [
  '小红书',
  '知乎',
  '公众号',
  '大风网',
  '一点号',
  '网站',
  '官媒',
] as const;

import type { PlatformView } from './types';

/**
 * 平台端本期暂不开放的功能（代码保留，前端隐藏）。
 * 接单方规模扩大、需真实账号/资质核验时再开启 resource_review；
 * 履约数据积累后再开启 fulfillment_rating。
 */
export const PLATFORM_DEFERRED_VIEWS: Partial<Record<PlatformView, string>> = {
  resource_review:
    '可接单平台审核：本期接单方自行选择平台即可，暂不核验真实账号；待入驻规模成熟后开启。',
  fulfillment_rating:
    '履约评级中心：本期不做接单方履约评级，待订单履约数据积累后再开启。',
};

export function isPlatformViewEnabled(view: PlatformView): boolean {
  return !(view in PLATFORM_DEFERRED_VIEWS);
}

/** 平台端本期不运营商家发布账号（账号在本机 Hermes 管理），相关 API 已下线。 */
export const PLATFORM_PUBLISH_ACCOUNT_OPS_ENABLED = false;

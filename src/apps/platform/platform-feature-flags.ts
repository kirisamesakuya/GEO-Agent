import type { PlatformView } from './types';

/**
 * 平台端本期暂不开放的功能（代码保留，前端隐藏）。
 * 接单方规模扩大、需真实账号/资质核验时再开启 resource_review；
 * 履约数据积累后再开启 fulfillment_rating。
 */
export const PLATFORM_DEFERRED_VIEWS: Partial<Record<PlatformView, string>> = {
  reports:
    '运营报表：本期不做多维度报表导出与订阅，运营数据请从平台驾驶舱查看；待指标体系稳定后开启。',
  resource_review:
    '可接单平台审核：本期接单方自行选择平台即可，暂不核验真实账号；待入驻规模成熟后开启。',
  fulfillment_rating:
    '履约评级中心：本期不做接单方履约评级，待订单履约数据积累后再开启。',
  /** 技术向配置：侧栏不展示，改错会影响 Agent/发单链路，由部署环境或代码维护 */
  configs:
    '系统配置：平台枚举、预算规则、模型与 Hermes/Skill 路由等技术参数，不在平台后台开放。',
};

export function isPlatformViewEnabled(view: PlatformView): boolean {
  if (!(view in PLATFORM_DEFERRED_VIEWS)) return true;
  return false;
}

export function isPlatformViewVisibleForRole(view: PlatformView, _role: string): boolean {
  return isPlatformViewEnabled(view);
}

/** 平台端本期不运营商家发布账号（账号在本机 Hermes 管理），相关 API 已下线。 */
export const PLATFORM_PUBLISH_ACCOUNT_OPS_ENABLED = false;

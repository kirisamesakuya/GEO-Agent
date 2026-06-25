import type { ProviderPageId } from './types';

/** 本期开放案例与账号资源维护（撮合比价需要） */
export const PROVIDER_CASE_SUBMISSION_ENABLED = true;

/** 接单端本期暂不开放的功能（代码保留，侧栏隐藏） */
export const PROVIDER_DEFERRED_VIEWS: Partial<Record<ProviderPageId, string>> = {};

export function isProviderViewEnabled(view: ProviderPageId): boolean {
  return !(view in PROVIDER_DEFERRED_VIEWS);
}

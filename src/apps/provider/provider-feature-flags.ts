import type { ProviderPageId } from './types';

/** 本期不要求提交案例素材与案例链接 */
export const PROVIDER_CASE_SUBMISSION_ENABLED = false;

/** 接单端本期暂不开放的功能（代码保留，侧栏隐藏） */
export const PROVIDER_DEFERRED_VIEWS: Partial<Record<ProviderPageId, string>> = {
  accounts: '账号资源：本期不做，媒体账号与报价维护将在后续版本开放。',
};

export function isProviderViewEnabled(view: ProviderPageId): boolean {
  return !(view in PROVIDER_DEFERRED_VIEWS);
}

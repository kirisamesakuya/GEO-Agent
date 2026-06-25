/**
 * 报价撮合 Feature Flags（PRD v2.2 §10.2）
 * 服务端可通过环境变量覆盖；前端读取构建时常量。
 */
function envBool(key: string, defaultValue: boolean): boolean {
  if (typeof process !== 'undefined' && process.env?.[key] != null) {
    return process.env[key] === '1' || process.env[key] === 'true';
  }
  return defaultValue;
}

export const ENABLE_PROVIDER_QUOTE = envBool('ENABLE_PROVIDER_QUOTE', true);
export const HIDE_PUBLISHER_BUDGET = envBool('HIDE_PUBLISHER_BUDGET', true);
export const QUOTE_ACCEPT_FREEZE = envBool('QUOTE_ACCEPT_FREEZE', true);
export const QUOTE_SETTLEMENT_SNAPSHOT = envBool('QUOTE_SETTLEMENT_SNAPSHOT', true);

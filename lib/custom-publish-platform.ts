export const CUSTOM_PLATFORM_NAME_MIN = 2;
export const CUSTOM_PLATFORM_NAME_MAX = 20;
export const CUSTOM_PLATFORM_ABBR_MAX = 2;
export const CUSTOM_PLATFORM_HINT_MAX = 200;
export const CUSTOM_PLATFORM_URL_MAX = 500;
export const DEFAULT_CUSTOM_PERMISSIONS = '内容发布 / 数据回传';
export const DEFAULT_CUSTOM_PLATFORM_GRADIENT = 'linear-gradient(135deg, #6366f1, #818cf8)';

export const CUSTOM_PLATFORM_GRADIENT_PRESETS = [
  'linear-gradient(135deg, #ff2442, #ff6b6b)',
  'linear-gradient(135deg, #056de8, #79b8ff)',
  'linear-gradient(135deg, #07c160, #2dd4bf)',
  'linear-gradient(135deg, #6366f1, #818cf8)',
  'linear-gradient(135deg, #3b82f6, #60a5fa)',
  'linear-gradient(135deg, #7c3aed, #a78bfa)',
] as const;

export interface CustomPublishPlatformRecord {
  platform: string;
  /** 上传的平台 LOGO */
  logoUrl?: string;
  /** 无 LOGO 时的图标缩写（1–2 字） */
  abbr?: string;
  /** 无 LOGO 时的图标渐变色 */
  gradient?: string;
  loginUrl?: string;
  loginHint?: string;
  permissionsLabel?: string;
  createdAt: string;
}

export function parseCustomPublishPlatforms(raw: string | null | undefined): CustomPublishPlatformRecord[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CustomPublishPlatformRecord =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CustomPublishPlatformRecord).platform === 'string' &&
        typeof (item as CustomPublishPlatformRecord).createdAt === 'string'
    );
  } catch {
    return [];
  }
}

export function serializeCustomPublishPlatforms(items: CustomPublishPlatformRecord[]): string {
  return JSON.stringify(items);
}

export interface CustomPlatformInput {
  platform: string;
  logoUrl?: string;
  abbr?: string;
  gradient?: string;
  loginUrl?: string;
  loginHint?: string;
}

export function defaultCustomPlatformAbbr(platform: string): string {
  const trimmed = platform.trim();
  if (!trimmed) return '·';
  return trimmed.slice(0, CUSTOM_PLATFORM_ABBR_MAX);
}

export function validateCustomPlatformInput(
  input: CustomPlatformInput,
  builtinPlatformNames: string[],
  existingCustom: CustomPublishPlatformRecord[],
  existingBindingPlatforms: string[] = []
): { ok: true; normalized: CustomPublishPlatformRecord } | { ok: false; error: string } {
  const platform = input.platform.trim();
  if (platform.length < CUSTOM_PLATFORM_NAME_MIN) {
    return { ok: false, error: `平台名称至少 ${CUSTOM_PLATFORM_NAME_MIN} 个字` };
  }
  if (platform.length > CUSTOM_PLATFORM_NAME_MAX) {
    return { ok: false, error: `平台名称最多 ${CUSTOM_PLATFORM_NAME_MAX} 个字` };
  }

  const builtin = new Set(builtinPlatformNames);
  if (builtin.has(platform)) {
    return { ok: false, error: '该平台已在系统内置列表中，无需重复添加' };
  }

  const taken = new Set([
    ...existingCustom.map((item) => item.platform),
    ...existingBindingPlatforms,
  ]);
  if (taken.has(platform)) {
    return { ok: false, error: '该平台名称已存在' };
  }

  const loginUrl = input.loginUrl?.trim() ?? '';
  if (loginUrl) {
    if (loginUrl.length > CUSTOM_PLATFORM_URL_MAX) {
      return { ok: false, error: `登录地址最多 ${CUSTOM_PLATFORM_URL_MAX} 个字符` };
    }
    try {
      const url = new URL(loginUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { ok: false, error: '登录地址须以 http:// 或 https:// 开头' };
      }
    } catch {
      return { ok: false, error: '登录地址格式不正确' };
    }
  }

  const loginHint = input.loginHint?.trim() ?? '';
  if (loginHint.length > CUSTOM_PLATFORM_HINT_MAX) {
    return { ok: false, error: `登录提示最多 ${CUSTOM_PLATFORM_HINT_MAX} 个字` };
  }

  const logoUrl = input.logoUrl?.trim() ?? '';
  const abbr = (input.abbr?.trim() || defaultCustomPlatformAbbr(platform)).slice(0, CUSTOM_PLATFORM_ABBR_MAX);
  const gradient = input.gradient?.trim() || DEFAULT_CUSTOM_PLATFORM_GRADIENT;

  return {
    ok: true,
    normalized: {
      platform,
      ...(logoUrl ? { logoUrl } : {}),
      abbr,
      gradient,
      ...(loginUrl ? { loginUrl } : {}),
      ...(loginHint ? { loginHint } : {}),
      permissionsLabel: DEFAULT_CUSTOM_PERMISSIONS,
      createdAt: new Date().toISOString(),
    },
  };
}

export function customRecordToAuthConfig(record: CustomPublishPlatformRecord) {
  return {
    platform: record.platform,
    authMode: 'browser' as const,
    oauthEnabled: false,
    loginUrl: record.loginUrl ?? '',
    creatorCenterUrl: record.loginUrl,
    permissionsLabel: record.permissionsLabel ?? DEFAULT_CUSTOM_PERMISSIONS,
    loginHint: record.loginHint,
    logoUrl: record.logoUrl,
    abbr: record.abbr ?? defaultCustomPlatformAbbr(record.platform),
    gradient: record.gradient ?? DEFAULT_CUSTOM_PLATFORM_GRADIENT,
    isCustom: true,
  };
}

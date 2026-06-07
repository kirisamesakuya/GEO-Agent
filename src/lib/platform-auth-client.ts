import type { PlatformAuthConfig } from '../types';
import authFile from '../../config/platform-auth.json';

type AuthFile = {
  platforms: Array<{
    platform: string;
    authMode: 'browser' | 'oauth';
    oauthEnabled: boolean;
    loginUrl: string;
    creatorCenterUrl?: string;
    permissionsLabel: string;
    loginHint?: string;
    oauthNote?: string;
  }>;
};

/** 与 /api/accounts/platform-config 结构一致；API 不可用时作前端回退 */
export function getBundledPlatformAuthConfig(): PlatformAuthConfig[] {
  const file = authFile as AuthFile;
  return (file.platforms ?? []).map((entry) => ({
    platform: entry.platform,
    authMode: entry.authMode,
    oauthEnabled: entry.oauthEnabled,
    loginUrl: entry.loginUrl || entry.creatorCenterUrl || '',
    creatorCenterUrl: entry.creatorCenterUrl,
    permissionsLabel: entry.permissionsLabel,
    loginHint: entry.loginHint,
    oauthNote: entry.oauthNote,
  }));
}

export async function fetchPlatformAuthConfig(): Promise<PlatformAuthConfig[]> {
  const fallback = getBundledPlatformAuthConfig();
  try {
    const res = await fetch('/api/platform-auth');
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok || !contentType.includes('application/json')) {
      return fallback;
    }
    const data = (await res.json()) as { platforms?: PlatformAuthConfig[] };
    const platforms = data.platforms ?? [];
    return platforms.length > 0 ? platforms : fallback;
  } catch {
    return fallback;
  }
}

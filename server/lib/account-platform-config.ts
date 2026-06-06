import { readFileSync } from 'fs';
import { join } from 'path';

export type PlatformAuthMode = 'browser' | 'oauth';

export interface PlatformAuthEntry {
  platform: string;
  authMode: PlatformAuthMode;
  oauthEnabled: boolean;
  loginUrl: string;
  creatorCenterUrl: string;
  permissionsLabel: string;
  loginHint?: string;
  oauthNote?: string;
}

interface PlatformAuthFile {
  platforms: PlatformAuthEntry[];
}

const CONFIG_PATH = join(process.cwd(), 'config', 'platform-auth.json');

export function loadPlatformAuthConfig(): PlatformAuthEntry[] {
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as PlatformAuthFile;
  return parsed.platforms ?? [];
}

export function getPlatformAuthEntry(platform: string): PlatformAuthEntry | undefined {
  return loadPlatformAuthConfig().find((p) => p.platform === platform);
}

export function resolveLoginUrl(entry: PlatformAuthEntry): string {
  return entry.loginUrl || entry.creatorCenterUrl;
}

/** Phase 1 全部走浏览器登录；OAuth 接入后再切换 */
export function effectiveAuthMode(_entry: PlatformAuthEntry): PlatformAuthMode {
  return 'browser';
}

import type { PlatformRole } from '../hooks/usePlatformRole';

const STORAGE_KEY = 'geo_platform_role';

export function getStoredPlatformRole(): PlatformRole {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'ops' || saved === 'reviewer' || saved === 'support' || saved === 'admin') {
    return saved;
  }
  return 'admin';
}

/** 平台端 GET/通用请求：自动附带当前演示角色 */
export function platformApiFetch(input: RequestInfo, init?: RequestInit) {
  return platformFetch(getStoredPlatformRole(), input, init);
}

export function platformJsonHeaders(role: PlatformRole): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Platform-Role': role,
  };
}

export function platformFetch(role: PlatformRole, input: RequestInfo, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set('X-Platform-Role', role);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers });
}

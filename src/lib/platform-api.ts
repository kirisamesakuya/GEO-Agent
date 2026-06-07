import type { PlatformRole } from '../hooks/usePlatformRole';

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

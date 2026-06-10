import {
  AI_MONITOR_LOGIN_HINTS,
  AI_MONITOR_LOGIN_URLS,
  AI_MONITOR_PLATFORMS,
} from '../../lib/ai-monitor-platforms';
import type { AiMonitorPlatformCatalogEntry } from '../../lib/ai-monitor-platform-catalog';

export type AiMonitorSessionStatus =
  | 'unknown'
  | 'verifying'
  | 'ready'
  | 'login_required'
  | 'captcha'
  | 'error'
  | 'unavailable';

export interface AiMonitorSession {
  id: string;
  platform: string;
  status: AiMonitorSessionStatus;
  accountLabel?: string;
  lastVerifiedAt?: string;
  lastError?: string;
  verifyTaskId?: string;
  loginUrl?: string;
  loginHint?: string;
}

export interface AiMonitorSessionsResponse {
  sessions: AiMonitorSession[];
  readyCount: number;
  notReadyCount: number;
}

type CatalogRow = { platform: string; loginUrl: string; loginHint: string };

const STATIC_CATALOG: CatalogRow[] = AI_MONITOR_PLATFORMS.map((platform) => ({
  platform,
  loginUrl: AI_MONITOR_LOGIN_URLS[platform],
  loginHint: AI_MONITOR_LOGIN_HINTS[platform],
}));

let resolvedCatalog: CatalogRow[] | null = null;
let catalogPromise: Promise<CatalogRow[]> | null = null;

function mapCatalogEntries(entries: AiMonitorPlatformCatalogEntry[]): CatalogRow[] {
  return entries.map((entry) => ({
    platform: entry.label,
    loginUrl: entry.loginUrl,
    loginHint: entry.loginHint,
  }));
}

function activeCatalog(): CatalogRow[] {
  return resolvedCatalog ?? STATIC_CATALOG;
}

export async function ensureAiMonitorPlatformCatalog(): Promise<CatalogRow[]> {
  if (resolvedCatalog) return resolvedCatalog;
  if (!catalogPromise) {
    catalogPromise = (async () => {
      try {
        const res = await fetch('/api/ai-monitor-platforms');
        if (res.ok) {
          const data = (await res.json()) as { platforms?: AiMonitorPlatformCatalogEntry[] };
          const rows = mapCatalogEntries(data.platforms ?? []);
          if (rows.length) {
            resolvedCatalog = rows;
            return rows;
          }
        }
      } catch {
        // fall through to static defaults
      }
      resolvedCatalog = STATIC_CATALOG;
      return STATIC_CATALOG;
    })();
  }
  return catalogPromise;
}

/** @deprecated 使用 ensureAiMonitorPlatformCatalog；保留静态默认值供首屏占位 */
export const AI_MONITOR_PLATFORM_CATALOG = STATIC_CATALOG;

export function buildDefaultAiMonitorSessions(): AiMonitorSession[] {
  return activeCatalog().map((entry) => ({
    id: `catalog-${entry.platform}`,
    platform: entry.platform,
    status: 'unknown' as AiMonitorSessionStatus,
    loginUrl: entry.loginUrl,
    loginHint: entry.loginHint,
  }));
}

export function mergeAiMonitorSessions(sessions: AiMonitorSession[]): AiMonitorSession[] {
  return activeCatalog().map((entry) => {
    const existing = sessions.find((s) => s.platform === entry.platform);
    if (existing) {
      return {
        ...existing,
        loginUrl: existing.loginUrl ?? entry.loginUrl,
        loginHint: entry.loginHint,
      };
    }
    return {
      id: `catalog-${entry.platform}`,
      platform: entry.platform,
      status: 'unknown',
      loginUrl: entry.loginUrl,
      loginHint: entry.loginHint,
    };
  });
}

export function summarizeAiMonitorSessions(sessions: AiMonitorSession[]): AiMonitorSessionsResponse {
  const readyCount = sessions.filter((s) => s.status === 'ready').length;
  const notReadyCount = sessions.length - readyCount;
  return { sessions, readyCount, notReadyCount };
}

export async function fetchAiMonitorSessions(brandName: string): Promise<AiMonitorSessionsResponse> {
  await ensureAiMonitorPlatformCatalog();
  const fallback = summarizeAiMonitorSessions(buildDefaultAiMonitorSessions());
  if (!brandName?.trim()) return fallback;

  try {
    const res = await fetch(
      `/api/ai-monitor-sessions?brandName=${encodeURIComponent(brandName)}`
    );
    if (!res.ok) return fallback;
    const data = (await res.json()) as AiMonitorSessionsResponse;
    return summarizeAiMonitorSessions(mergeAiMonitorSessions(data.sessions ?? []));
  } catch {
    return fallback;
  }
}

export async function updateAiMonitorSessionStatus(
  brandName: string,
  platform: string,
  status: 'ready' | 'login_required' | 'unknown'
): Promise<AiMonitorSession | null> {
  const res = await fetch(
    `/api/ai-monitor-sessions?brandName=${encodeURIComponent(brandName)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, status }),
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { session?: AiMonitorSession };
  return data.session ?? null;
}

export async function verifyAiMonitorSessions(
  brandName: string,
  platforms?: string[]
): Promise<{ taskId: string; sessions: AiMonitorSession[] } | null> {
  await ensureAiMonitorPlatformCatalog();
  const res = await fetch(
    `/api/ai-monitor-sessions/verify?brandName=${encodeURIComponent(brandName)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(platforms?.length ? { platforms } : {}),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.sessions) {
    data.sessions = mergeAiMonitorSessions(data.sessions);
  }
  return data;
}

export const AI_MONITOR_STATUS_LABEL: Record<AiMonitorSessionStatus, string> = {
  ready: '已就绪',
  login_required: '需登录',
  unknown: '未校验',
  verifying: '检测中',
  captcha: '人机验证',
  error: '检测失败',
  unavailable: '不可用',
};

export function isAiMonitorSessionReady(status: AiMonitorSessionStatus): boolean {
  return status === 'ready';
}

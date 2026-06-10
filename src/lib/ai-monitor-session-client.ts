import {
  AI_MONITOR_LOGIN_HINTS,
  AI_MONITOR_LOGIN_URLS,
  AI_MONITOR_PLATFORMS,
} from '../../lib/ai-monitor-platforms';

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

export const AI_MONITOR_PLATFORM_CATALOG = AI_MONITOR_PLATFORMS.map((platform) => ({
  platform,
  loginUrl: AI_MONITOR_LOGIN_URLS[platform],
  loginHint: AI_MONITOR_LOGIN_HINTS[platform],
}));

export function buildDefaultAiMonitorSessions(): AiMonitorSession[] {
  return AI_MONITOR_PLATFORM_CATALOG.map((entry) => ({
    id: `catalog-${entry.platform}`,
    platform: entry.platform,
    status: 'unknown' as AiMonitorSessionStatus,
    loginUrl: entry.loginUrl,
    loginHint: entry.loginHint,
  }));
}

export function mergeAiMonitorSessions(sessions: AiMonitorSession[]): AiMonitorSession[] {
  const byPlatform = new Map(sessions.map((s) => [s.platform, s]));
  return AI_MONITOR_PLATFORM_CATALOG.map((entry) => {
    const existing = byPlatform.get(entry.platform);
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

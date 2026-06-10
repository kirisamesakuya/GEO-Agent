import {
  AI_MONITOR_PROBE_KEYWORD,
  aiMonitorProbeBusinessRef,
  parseAiMonitorProbeBrandId,
} from '../../lib/ai-monitor-platforms.js';
import {
  getAiMonitorLoginMeta,
  getEnabledAiMonitorPlatformLabels,
  listEnabledAiMonitorPlatformCatalog,
} from './ai-monitor-platform-catalog.service.js';
import type { IndexSamplingResultRow } from '../lib/index-sampling-output.js';
import { prisma } from '../db/client.js';
import { findBrandRow } from './brand.service.js';
import { createAndEnqueueTask } from '../agent/worker.js';

export type AiMonitorSessionStatus =
  | 'unknown'
  | 'verifying'
  | 'ready'
  | 'login_required'
  | 'captcha'
  | 'error'
  | 'unavailable';

export interface AiMonitorSessionDto {
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

async function mapSessionRow(row: {
  id: string;
  platform: string;
  status: string;
  accountLabel: string | null;
  lastVerifiedAt: Date | null;
  lastError: string | null;
  verifyTaskId: string | null;
}): Promise<AiMonitorSessionDto> {
  const meta = await getAiMonitorLoginMeta(row.platform);
  return {
    id: row.id,
    platform: row.platform,
    status: row.status as AiMonitorSessionStatus,
    accountLabel: row.accountLabel ?? undefined,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString(),
    lastError: row.lastError ?? undefined,
    verifyTaskId: row.verifyTaskId ?? undefined,
    loginUrl: meta.loginUrl,
    loginHint: meta.loginHint,
  };
}

async function catalogFallbackSessions(): Promise<AiMonitorSessionDto[]> {
  const catalog = await listEnabledAiMonitorPlatformCatalog();
  return catalog.map((entry) => ({
    id: `catalog-${entry.label}`,
    platform: entry.label,
    status: 'unknown',
    loginUrl: entry.loginUrl,
    loginHint: entry.loginHint,
  }));
}

async function mergeSessionsWithCatalog(sessions: AiMonitorSessionDto[]): Promise<AiMonitorSessionDto[]> {
  const catalog = await listEnabledAiMonitorPlatformCatalog();
  const byPlatform = new Map(sessions.map((s) => [s.platform, s]));
  return catalog.map((entry) => {
    const existing = byPlatform.get(entry.label);
    if (existing) {
      return {
        ...existing,
        loginUrl: existing.loginUrl ?? entry.loginUrl,
        loginHint: entry.loginHint,
      };
    }
    return {
      id: `catalog-${entry.label}`,
      platform: entry.label,
      status: 'unknown',
      loginUrl: entry.loginUrl,
      loginHint: entry.loginHint,
    };
  });
}

function summarizeSessions(sessions: AiMonitorSessionDto[]) {
  const readyCount = sessions.filter((s) => s.status === 'ready').length;
  const notReadyCount = sessions.length - readyCount;
  return { sessions, readyCount, notReadyCount };
}

export async function ensureAiMonitorSessions(brandId: string): Promise<void> {
  try {
    const existing = await prisma.aiMonitorSession.findMany({
      where: { brandId },
      select: { platform: true },
    });
    const have = new Set(existing.map((r) => r.platform));
    const enabled = await getEnabledAiMonitorPlatformLabels();
    const missing = enabled.filter((p) => !have.has(p));
    if (!missing.length) return;
    await prisma.aiMonitorSession.createMany({
      data: missing.map((platform) => ({
        brandId,
        platform,
        status: 'unknown',
      })),
    });
  } catch {
    // 表未迁移或 DB 不可用时，前端仍展示目录项
  }
}

export async function listAiMonitorSessions(brandName: string): Promise<{
  sessions: AiMonitorSessionDto[];
  readyCount: number;
  notReadyCount: number;
}> {
  const brand = await findBrandRow(brandName);
  if (!brand) return summarizeSessions(await catalogFallbackSessions());

  await ensureAiMonitorSessions(brand.id);

  try {
    const rows = await prisma.aiMonitorSession.findMany({
      where: { brandId: brand.id },
      orderBy: { platform: 'asc' },
    });
    const sessions = await Promise.all(rows.map((row) => mapSessionRow(row)));
    return summarizeSessions(await mergeSessionsWithCatalog(sessions));
  } catch {
    return summarizeSessions(await catalogFallbackSessions());
  }
}

export async function updateAiMonitorAccountLabel(
  brandName: string,
  platform: string,
  accountLabel: string
): Promise<AiMonitorSessionDto | null> {
  const brand = await findBrandRow(brandName);
  if (!brand) return null;

  await ensureAiMonitorSessions(brand.id);
  const row = await prisma.aiMonitorSession.upsert({
    where: { brandId_platform: { brandId: brand.id, platform } },
    create: {
      brandId: brand.id,
      platform,
      status: 'unknown',
      accountLabel: accountLabel.trim() || null,
    },
    update: { accountLabel: accountLabel.trim() || null },
  });
  return mapSessionRow(row);
}

export async function updateAiMonitorSessionStatus(
  brandName: string,
  platform: string,
  status: AiMonitorSessionStatus
): Promise<AiMonitorSessionDto | null> {
  const brand = await findBrandRow(brandName);
  if (!brand) return null;

  const enabled = await getEnabledAiMonitorPlatformLabels();
  if (!enabled.includes(platform)) {
    throw new Error('无效监测平台');
  }

  const allowed: AiMonitorSessionStatus[] = [
    'unknown',
    'ready',
    'login_required',
  ];
  if (!allowed.includes(status)) {
    throw new Error('无效状态');
  }

  await ensureAiMonitorSessions(brand.id);
  const row = await prisma.aiMonitorSession.upsert({
    where: { brandId_platform: { brandId: brand.id, platform } },
    create: {
      brandId: brand.id,
      platform,
      status,
      lastVerifiedAt: new Date(),
      lastError:
        status === 'login_required' ? '待在本机浏览器登录' : status === 'unknown' ? null : null,
    },
    update: {
      status,
      lastVerifiedAt: new Date(),
      lastError:
        status === 'login_required'
          ? '待在本机浏览器登录'
          : status === 'ready'
            ? null
            : null,
      verifyTaskId: null,
    },
  });
  return mapSessionRow(row);
}

function sessionStatusFromSamplingRow(row: IndexSamplingResultRow): AiMonitorSessionStatus {
  const status = row.status ?? 'sampled';
  if (status === 'login_required') return 'login_required';
  if (status === 'captcha') return 'captcha';
  if (status === 'unavailable') return 'unavailable';
  if (status === 'error') return 'error';
  if (row.aiResponse || row.citationSnippet) return 'ready';
  return 'ready';
}

function sessionErrorFromSamplingRow(row: IndexSamplingResultRow): string | null {
  if (row.status === 'login_required') return '需在本机浏览器登录该平台';
  if (row.status === 'captcha') return '人机验证阻断';
  if (row.status === 'unavailable') return '平台不可访问或无浏览器工具';
  if (row.status === 'error') return row.errorMessage ?? '检测失败';
  return null;
}

export async function applyProbeResultsToSessions(
  brandId: string,
  results: IndexSamplingResultRow[]
): Promise<void> {
  const byPlatform = new Map(results.map((r) => [r.platform, r]));
  const rows = await prisma.aiMonitorSession.findMany({ where: { brandId } });

  for (const row of rows) {
    const sampled = byPlatform.get(row.platform);
    if (!sampled) {
      await prisma.aiMonitorSession.update({
        where: { id: row.id },
        data: {
          status: 'error',
          lastError: '未返回该平台检测结果',
          verifyTaskId: null,
          lastVerifiedAt: new Date(),
        },
      });
      continue;
    }

    const status = sessionStatusFromSamplingRow(sampled);
    await prisma.aiMonitorSession.update({
      where: { id: row.id },
      data: {
        status,
        lastError: sessionErrorFromSamplingRow(sampled),
        verifyTaskId: null,
        lastVerifiedAt: new Date(),
      },
    });
  }
}

export async function applyProbeFailureToSessions(
  brandId: string,
  message?: string
): Promise<void> {
  await prisma.aiMonitorSession.updateMany({
    where: { brandId, status: 'verifying' },
    data: {
      status: 'error',
      lastError: message?.trim() || '会话检测失败',
      verifyTaskId: null,
      lastVerifiedAt: new Date(),
    },
  });
}

export async function syncMonitorSessionsFromSamplingResults(
  brandId: string,
  results: IndexSamplingResultRow[]
): Promise<void> {
  await ensureAiMonitorSessions(brandId);
  const byPlatform = new Map(results.map((r) => [r.platform, r]));

  for (const [platform, row] of byPlatform) {
    const status = sessionStatusFromSamplingRow(row);
    await prisma.aiMonitorSession.upsert({
      where: { brandId_platform: { brandId, platform } },
      create: {
        brandId,
        platform,
        status,
        lastError: sessionErrorFromSamplingRow(row),
        lastVerifiedAt: new Date(),
      },
      update: {
        status,
        lastError: sessionErrorFromSamplingRow(row),
        lastVerifiedAt: new Date(),
      },
    });
  }
}

export async function startAiMonitorVerify(
  brandName: string,
  platforms?: string[]
): Promise<{ taskId: string; sessions: AiMonitorSessionDto[] } | null> {
  const brand = await findBrandRow(brandName);
  if (!brand) return null;

  await ensureAiMonitorSessions(brand.id);
  const enabled = await getEnabledAiMonitorPlatformLabels();
  const targetPlatforms = platforms?.length
    ? platforms.filter((p) => enabled.includes(p))
    : enabled;

  if (!targetPlatforms.length) throw new Error('未指定有效监测平台');

  await prisma.aiMonitorSession.updateMany({
    where: { brandId: brand.id, platform: { in: targetPlatforms } },
    data: { status: 'verifying', lastError: null },
  });

  let competitors: string[] = [];
  try {
    competitors = JSON.parse(brand.competitors || '[]') as string[];
  } catch {
    competitors = [];
  }

  const task = await createAndEnqueueTask({
    type: 'index_sampling',
    title: `AI 监测会话检测：${brand.name}`,
    brandName: brand.name,
    input: {
      probe: true,
      brandId: brand.id,
      keywords: [AI_MONITOR_PROBE_KEYWORD],
      monitoringPrompts: [AI_MONITOR_PROBE_KEYWORD],
      platforms: targetPlatforms,
      brandUrl: brand.website?.trim() || undefined,
      industry: brand.industry || undefined,
      brandCity: brand.city || undefined,
      brandDesc: brand.description || undefined,
      competitors: competitors.length ? competitors : undefined,
      region: 'CN',
      language: 'zh-Hans',
      geoMarket: 'domestic',
      samplingMode: 'live_browser',
    },
    businessRef: aiMonitorProbeBusinessRef(brand.id),
  });

  await prisma.aiMonitorSession.updateMany({
    where: { brandId: brand.id, platform: { in: targetPlatforms } },
    data: { verifyTaskId: task.id },
  });

  const listed = await listAiMonitorSessions(brandName);
  return { taskId: task.id, sessions: listed.sessions };
}

export function isAiMonitorProbeTask(input: Record<string, unknown>, businessRef?: string | null): boolean {
  if (input.probe === true) return true;
  if (businessRef && parseAiMonitorProbeBrandId(businessRef)) return true;
  return false;
}

export function resolveAiMonitorProbeBrandId(
  input: Record<string, unknown>,
  businessRef?: string | null
): string | null {
  if (typeof input.brandId === 'string' && input.brandId.trim()) return input.brandId.trim();
  if (businessRef) return parseAiMonitorProbeBrandId(businessRef);
  return null;
}

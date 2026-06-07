import { prisma } from '../db/client.js';
import { listAgentTasks } from './agent-task.service.js';
import { checkHermesHealth } from '../agent/executors/hermes.js';
import { getHermesDevice } from './hermes-local.service.js';
import { isHermesExecutorTask } from '../lib/agent-status.js';
import type { AgentTask } from '../agent/types.js';

const HERMES_BASE_URL = process.env.HERMES_API_URL ?? 'http://127.0.0.1:8642';
const HERMES_DESKTOP_STATUS_URL =
  process.env.HERMES_DESKTOP_STATUS_URL ?? 'http://127.0.0.1:9120/api/status';

const POLICY_KEY = 'hermes_concurrency_policy';
const DESKTOP_PROTECTION_KEY = 'hermes_desktop_protection_enabled';
const PUBLISH_SERIAL_KEY = 'hermes_publish_serial_enabled';
const CAPACITY_SNAPSHOT_KEY = 'hermes_capacity_last_snapshot';
const DEVICE_CAPACITY_KEY = 'hermes:device_capacity';

export type HermesDeviceCapacityReport = {
  deviceIdHash: string;
  maxConcurrentTasks?: number;
  runningTaskIds?: string[];
  availableSlots?: number;
  reportedAt: string;
};

export type HermesPullCapacityAdvice = {
  requestedLimit: number;
  effectiveLimit: number;
  availableSlots: number;
  policyMaxTotalRuns: number;
  occupiedTotal: number;
  deviceReportedSlots?: number | null;
  mode: HermesConcurrencyMode;
  userSummary: string;
};

export type HermesConcurrencyMode =
  | 'conservative'
  | 'balanced'
  | 'accelerated'
  | 'do_not_disturb';

export type HermesRunKind = 'publish' | 'account' | 'analysis';

export interface HermesConcurrencyPolicy {
  mode: HermesConcurrencyMode;
  maxTotalRuns: number;
  maxAnalysisRuns: number;
  maxPublishRuns: number;
  maxAccountRuns: number;
  reserveDesktopSlots: number;
  pausePublishWhenDesktopActive: boolean;
}

export interface HermesCapacitySnapshot {
  deviceIdHash?: string;
  deviceName?: string;
  hermesVersion?: string | null;
  apiServerReady: boolean;
  apiServerMaxRuns: number;
  geoRecommendedMaxRuns: number;
  geoRecommendedAnalysisRuns: number;
  geoRecommendedPublishRuns: number;
  activeSessions: number;
  desktopProtection: boolean;
  desktopActive: boolean;
  lastCheckedAt: string;
  effectivePolicy: HermesConcurrencyPolicy;
  runningCounts: { total: number; analysis: number; publish: number; account: number };
  queuedCounts: { total: number; analysis: number; publish: number; account: number };
  occupiedCounts: { total: number; analysis: number; publish: number; account: number };
  deviceReportedSlots?: number | null;
  userSummary: string;
  capacityHint?: string;
}

export interface CanStartHermesTaskResult {
  allowed: boolean;
  reason?: string;
  message?: string;
}

const DEFAULT_POLICY: HermesConcurrencyPolicy = {
  mode: 'conservative',
  maxTotalRuns: 3,
  maxAnalysisRuns: 2,
  maxPublishRuns: 1,
  maxAccountRuns: 1,
  reserveDesktopSlots: 1,
  pausePublishWhenDesktopActive: true,
};

const MODE_PRESETS: Record<
  Exclude<HermesConcurrencyMode, 'do_not_disturb'>,
  Pick<
    HermesConcurrencyPolicy,
    'maxTotalRuns' | 'maxAnalysisRuns' | 'maxPublishRuns' | 'maxAccountRuns'
  >
> = {
  conservative: {
    maxTotalRuns: 3,
    maxAnalysisRuns: 2,
    maxPublishRuns: 1,
    maxAccountRuns: 1,
  },
  balanced: {
    maxTotalRuns: 4,
    maxAnalysisRuns: 3,
    maxPublishRuns: 1,
    maxAccountRuns: 1,
  },
  accelerated: {
    maxTotalRuns: 5,
    maxAnalysisRuns: 3,
    maxPublishRuns: 1,
    maxAccountRuns: 1,
  },
};

async function readConfigJson<T>(key: string): Promise<T | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

async function writeConfigJson(key: string, value: unknown) {
  const serialized = JSON.stringify(value);
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: serialized },
    update: { value: serialized },
  });
}

async function readBoolConfig(key: string, defaultValue: boolean): Promise<boolean> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return defaultValue;
  if (row.value === 'true') return true;
  if (row.value === 'false') return false;
  try {
    const parsed = JSON.parse(row.value) as unknown;
    return typeof parsed === 'boolean' ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function writeBoolConfig(key: string, value: boolean) {
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: String(value) },
    update: { value: String(value) },
  });
}

export function classifyHermesRunKind(taskType: string): HermesRunKind {
  if (taskType === 'hermes_publish') return 'publish';
  if (taskType === 'account_verify') return 'account';
  return 'analysis';
}

function emptyKindCounts() {
  return { total: 0, analysis: 0, publish: 0, account: 0 };
}

function incrementKindCounts(
  counts: ReturnType<typeof emptyKindCounts>,
  kind: HermesRunKind
) {
  counts.total += 1;
  counts[kind] += 1;
}

export async function probeHermesActiveSessions(): Promise<{
  activeSessions: number;
  apiServerMaxRuns: number;
}> {
  let activeSessions = 0;
  let apiServerMaxRuns = 10;

  try {
    const res = await fetch(`${HERMES_BASE_URL}/health/detailed`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      const sessions =
        (data.active_sessions as number | undefined) ??
        (data.activeSessions as number | undefined) ??
        0;
      activeSessions = Math.max(activeSessions, Number(sessions) || 0);
      const maxRuns =
        (data.max_concurrent_runs as number | undefined) ??
        (data.maxConcurrentRuns as number | undefined) ??
        (data._max_concurrent_runs as number | undefined);
      if (typeof maxRuns === 'number' && maxRuns > 0) {
        apiServerMaxRuns = maxRuns;
      }
    }
  } catch {
    // fall through
  }

  try {
    const res = await fetch(HERMES_DESKTOP_STATUS_URL, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      const sessions =
        (data.active_sessions as number | undefined) ??
        (data.activeSessions as number | undefined) ??
        0;
      activeSessions = Math.max(activeSessions, Number(sessions) || 0);
    }
  } catch {
    // fall through
  }

  return { activeSessions, apiServerMaxRuns };
}

export async function resolveHermesConcurrencyPolicy(): Promise<HermesConcurrencyPolicy> {
  const stored = await readConfigJson<Partial<HermesConcurrencyPolicy>>(POLICY_KEY);
  const desktopProtection = await readBoolConfig(DESKTOP_PROTECTION_KEY, true);
  const publishSerial = await readBoolConfig(PUBLISH_SERIAL_KEY, true);
  const { activeSessions } = await probeHermesActiveSessions();

  const mode = stored?.mode ?? DEFAULT_POLICY.mode;
  const preset =
    mode !== 'do_not_disturb' ? MODE_PRESETS[mode] ?? MODE_PRESETS.conservative : null;

  let policy: HermesConcurrencyPolicy = {
    ...DEFAULT_POLICY,
    ...preset,
    ...stored,
    mode,
    pausePublishWhenDesktopActive:
      stored?.pausePublishWhenDesktopActive ?? desktopProtection,
  };

  if (publishSerial) {
    policy.maxPublishRuns = 1;
    policy.maxAccountRuns = 1;
  }

  if (desktopProtection && activeSessions > 0) {
    policy = {
      ...policy,
      maxTotalRuns: Math.min(policy.maxTotalRuns, 1),
      maxAnalysisRuns: Math.min(policy.maxAnalysisRuns, 1),
      maxPublishRuns: policy.pausePublishWhenDesktopActive ? 0 : policy.maxPublishRuns,
    };
  }

  if (mode === 'do_not_disturb') {
    policy = {
      ...policy,
      maxTotalRuns: 0,
      maxAnalysisRuns: 0,
      maxPublishRuns: 0,
      maxAccountRuns: 0,
    };
  }

  return policy;
}

async function countHermesTasksByStatus(status: AgentTask['status']) {
  const tasks = await listAgentTasks({ status, limit: 100 });
  const counts = emptyKindCounts();
  for (const task of tasks) {
    if (!isHermesExecutorTask(task.executor)) continue;
    incrementKindCounts(counts, classifyHermesRunKind(task.type));
  }
  return counts;
}

export async function getRunningHermesTaskCounts() {
  return countHermesTasksByStatus('running');
}

/** 运行中 + 已领取待执行（queued）均占用 Hermes 额度 */
export async function getOccupiedHermesTaskCounts() {
  const running = await countHermesTasksByStatus('running');
  const queued = await countHermesTasksByStatus('queued');
  return {
    total: running.total + queued.total,
    analysis: running.analysis + queued.analysis,
    publish: running.publish + queued.publish,
    account: running.account + queued.account,
  };
}

export async function readDeviceCapacityReport(): Promise<HermesDeviceCapacityReport | null> {
  return readConfigJson<HermesDeviceCapacityReport>(DEVICE_CAPACITY_KEY);
}

export async function saveDeviceCapacityReport(report: HermesDeviceCapacityReport) {
  await writeConfigJson(DEVICE_CAPACITY_KEY, report);
}

function resolveDeviceReportedSlots(report: HermesDeviceCapacityReport | null): number | null {
  if (!report) return null;
  if (typeof report.availableSlots === 'number' && Number.isFinite(report.availableSlots)) {
    return Math.max(0, report.availableSlots);
  }
  if (
    typeof report.maxConcurrentTasks === 'number' &&
    Array.isArray(report.runningTaskIds)
  ) {
    return Math.max(0, report.maxConcurrentTasks - report.runningTaskIds.length);
  }
  return null;
}

export async function resolveEffectiveAvailableSlots(): Promise<number> {
  const policy = await resolveHermesConcurrencyPolicy();
  const occupied = await getOccupiedHermesTaskCounts();
  const fromPolicy = Math.max(0, policy.maxTotalRuns - occupied.total);
  const deviceSlots = resolveDeviceReportedSlots(await readDeviceCapacityReport());
  if (deviceSlots != null) return Math.min(fromPolicy, deviceSlots);
  return fromPolicy;
}

export async function getPullCapacityAdvice(requestedLimit = 3): Promise<HermesPullCapacityAdvice> {
  const policy = await resolveHermesConcurrencyPolicy();
  const occupied = await getOccupiedHermesTaskCounts();
  const availableSlots = await resolveEffectiveAvailableSlots();
  const cappedRequest = Math.min(Math.max(1, requestedLimit), 3);
  const deviceReport = await readDeviceCapacityReport();
  const deviceReportedSlots = resolveDeviceReportedSlots(deviceReport);

  return {
    requestedLimit: cappedRequest,
    effectiveLimit: Math.min(cappedRequest, availableSlots),
    availableSlots,
    policyMaxTotalRuns: policy.maxTotalRuns,
    occupiedTotal: occupied.total,
    deviceReportedSlots,
    mode: policy.mode,
    userSummary: buildUserSummary(
      policy,
      (await probeHermesActiveSessions()).activeSessions,
      await readBoolConfig(DESKTOP_PROTECTION_KEY, true)
    ),
  };
}

export async function getQueuedHermesTaskCounts() {
  const waiting = await countHermesTasksByStatus('waiting_local_device');
  const queued = await countHermesTasksByStatus('queued');
  return {
    total: waiting.total + queued.total,
    analysis: waiting.analysis + queued.analysis,
    publish: waiting.publish + queued.publish,
    account: waiting.account + queued.account,
  };
}

function buildUserSummary(
  policy: HermesConcurrencyPolicy,
  activeSessions: number,
  desktopProtection: boolean
): string {
  if (policy.mode === 'do_not_disturb') {
    return '勿打扰模式：不领取新任务，已运行任务会继续完成';
  }
  if (desktopProtection && activeSessions > 0) {
    return '桌面端保护中：你正在使用 Hermes 桌面端，后台发布任务暂停领取';
  }
  const modeLabel =
    policy.mode === 'conservative'
      ? '保守模式'
      : policy.mode === 'balanced'
        ? '平衡模式'
        : policy.mode === 'accelerated'
          ? '加速模式'
          : policy.mode;
  return `${modeLabel}：分析任务最多同时 ${policy.maxAnalysisRuns} 个，发布与账号操作串行执行`;
}

export async function getHermesCapacitySnapshot(): Promise<HermesCapacitySnapshot> {
  const health = await checkHermesHealth();
  const device = await getHermesDevice();
  const desktopProtection = await readBoolConfig(DESKTOP_PROTECTION_KEY, true);
  const { activeSessions, apiServerMaxRuns } = await probeHermesActiveSessions();
  const effectivePolicy = await resolveHermesConcurrencyPolicy();
  const runningCounts = await getRunningHermesTaskCounts();
  const queuedCounts = await getQueuedHermesTaskCounts();
  const occupiedCounts = await getOccupiedHermesTaskCounts();
  const deviceReportedSlots = resolveDeviceReportedSlots(await readDeviceCapacityReport());

  const snapshot: HermesCapacitySnapshot = {
    deviceIdHash: device?.deviceIdHash,
    deviceName: device?.deviceName,
    hermesVersion: device?.hermesVersion ?? health.clientVersion ?? null,
    apiServerReady: Boolean(health.apiGatewayOk),
    apiServerMaxRuns,
    geoRecommendedMaxRuns: DEFAULT_POLICY.maxTotalRuns,
    geoRecommendedAnalysisRuns: DEFAULT_POLICY.maxAnalysisRuns,
    geoRecommendedPublishRuns: DEFAULT_POLICY.maxPublishRuns,
    activeSessions,
    desktopProtection,
    desktopActive: activeSessions > 0,
    lastCheckedAt: new Date().toISOString(),
    effectivePolicy,
    runningCounts,
    queuedCounts,
    occupiedCounts,
    deviceReportedSlots,
    userSummary: buildUserSummary(effectivePolicy, activeSessions, desktopProtection),
    capacityHint:
      desktopProtection && activeSessions > 0
        ? '桌面端保护中，后台发布任务暂停领取'
        : undefined,
  };

  await writeConfigJson(CAPACITY_SNAPSHOT_KEY, snapshot);
  return snapshot;
}

export async function canStartHermesTask(
  task: Pick<AgentTask, 'type' | 'executor' | 'id'>
): Promise<CanStartHermesTaskResult> {
  if (!isHermesExecutorTask(task.executor)) {
    return { allowed: true };
  }

  const policy = await resolveHermesConcurrencyPolicy();
  const counts = await getOccupiedHermesTaskCounts();
  const kind = classifyHermesRunKind(task.type);

  if (policy.mode === 'do_not_disturb') {
    return {
      allowed: false,
      reason: 'do_not_disturb',
      message: '勿打扰模式已开启，暂不领取新任务',
    };
  }

  if (counts.total >= policy.maxTotalRuns) {
    return {
      allowed: false,
      reason: 'max_total',
      message: `本机 Hermes 后台任务已达上限（${policy.maxTotalRuns} 个）`,
    };
  }

  if (kind === 'publish' && counts.publish >= policy.maxPublishRuns) {
    return {
      allowed: false,
      reason: 'max_publish',
      message: '发布任务串行执行，请等待当前发布任务完成',
    };
  }

  if (kind === 'account' && counts.account >= policy.maxAccountRuns) {
    return {
      allowed: false,
      reason: 'max_account',
      message: '账号检测串行执行，请等待当前检测完成',
    };
  }

  if (kind === 'analysis' && counts.analysis >= policy.maxAnalysisRuns) {
    return {
      allowed: false,
      reason: 'max_analysis',
      message: `分析任务并发已满（${policy.maxAnalysisRuns} 个）`,
    };
  }

  return { allowed: true };
}

export async function getTaskQueueHint(task: AgentTask): Promise<{
  isQueued: boolean;
  queuePosition?: number;
  aheadCount?: number;
  userMessage: string;
}> {
  const inQueue = ['queued', 'waiting_local_device'].includes(task.status);
  if (!inQueue) {
    if (task.status === 'running') {
      return {
        isQueued: false,
        userMessage: 'Hermes 正在执行，完成后会通过通知提醒你',
      };
    }
    return { isQueued: false, userMessage: '任务已提交，本机 Hermes 会在后台处理' };
  }

  const waitingTasks = await listAgentTasks({ status: 'waiting_local_device', limit: 50 });
  const queuedTasks = await listAgentTasks({ status: 'queued', limit: 50 });
  const pending = [...waitingTasks, ...queuedTasks]
    .filter((t) => isHermesExecutorTask(t.executor))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const index = pending.findIndex((t) => t.id === task.id);
  const aheadCount = index > 0 ? index : 0;

  if (aheadCount > 0) {
    const kind = classifyHermesRunKind(task.type);
    const serialNote =
      kind === 'publish' || kind === 'account'
        ? '发布和账号操作会串行执行，避免影响平台登录态。'
        : '当前为保守模式，分析任务会有限并行。';
    return {
      isQueued: true,
      queuePosition: index + 1,
      aheadCount,
      userMessage: `当前本机 Hermes 正在处理其他任务，已为你排队（前面还有 ${aheadCount} 个）。${serialNote}`,
    };
  }

  const check = await canStartHermesTask(task);
  if (!check.allowed) {
    return {
      isQueued: true,
      aheadCount: pending.length - 1,
      userMessage: check.message ?? '任务已排队，等待本机 Hermes 空闲',
    };
  }

  return {
    isQueued: true,
    userMessage: '任务已进入队列，本机 Hermes 即将开始处理。你可以先去做其他工作。',
  };
}

export async function markHermesRunStarted(_taskId: string, _runKind: HermesRunKind) {
  // DB status=running 为真实来源；此处保留钩子供后续遥测扩展
}

export async function markHermesRunFinished(_taskId: string) {
  // DB terminal status 为真实来源
}

export async function getHermesConcurrencySettings() {
  const policy = await readConfigJson<HermesConcurrencyPolicy>(POLICY_KEY);
  const desktopProtection = await readBoolConfig(DESKTOP_PROTECTION_KEY, true);
  const publishSerial = await readBoolConfig(PUBLISH_SERIAL_KEY, true);
  return {
    policy: { ...DEFAULT_POLICY, ...policy },
    desktopProtectionEnabled: desktopProtection,
    publishSerialEnabled: publishSerial,
  };
}

export async function updateHermesConcurrencySettings(input: {
  mode?: HermesConcurrencyMode;
  desktopProtectionEnabled?: boolean;
  publishSerialEnabled?: boolean;
}) {
  if (input.mode) {
    const current = await readConfigJson<HermesConcurrencyPolicy>(POLICY_KEY);
    const preset =
      input.mode !== 'do_not_disturb'
        ? MODE_PRESETS[input.mode] ?? MODE_PRESETS.conservative
        : {};
    await writeConfigJson(POLICY_KEY, {
      ...DEFAULT_POLICY,
      ...current,
      ...preset,
      mode: input.mode,
    });
  }
  if (typeof input.desktopProtectionEnabled === 'boolean') {
    await writeBoolConfig(DESKTOP_PROTECTION_KEY, input.desktopProtectionEnabled);
  }
  if (typeof input.publishSerialEnabled === 'boolean') {
    await writeBoolConfig(PUBLISH_SERIAL_KEY, input.publishSerialEnabled);
  }
  return getHermesCapacitySnapshot();
}

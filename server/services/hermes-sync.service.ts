import { createHash } from 'crypto';
import { prisma } from '../db/client.js';
import { GEO_SKILLS_VERSION } from '../lib/geo-capabilities.js';
import {
  appendLog,
  listAgentTasks,
  updateAgentTask,
} from './agent-task.service.js';
import {
  getHermesDevice,
  getTokenCapacityState,
  resolveHermesTaskEnqueueStatus,
} from './hermes-local.service.js';

const MOCK_SYNC_READY_KEY = 'hermes:mock_sync_ready';
const SYNC_SESSION_KEY = 'hermes:sync_session';

export type HermesSyncPhase = 'await_login' | 'syncing' | 'ready' | 'failed';

export type HermesSyncStatus = {
  phase: HermesSyncPhase;
  message: string;
  mock: boolean;
  syncedAt?: string | null;
  deviceName?: string | null;
};

type SyncSessionState = {
  phase: HermesSyncPhase;
  message: string;
  startedAt?: string;
  syncedAt?: string;
  error?: string;
};

function mockLoginSyncEnabled() {
  return process.env.HERMES_MOCK_LOGIN_SYNC !== 'false';
}

async function readSyncSession(): Promise<SyncSessionState | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key: SYNC_SESSION_KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as SyncSessionState;
  } catch {
    return null;
  }
}

async function writeSyncSession(state: SyncSessionState) {
  await prisma.systemConfig.upsert({
    where: { key: SYNC_SESSION_KEY },
    create: { key: SYNC_SESSION_KEY, value: JSON.stringify(state) },
    update: { value: JSON.stringify(state) },
  });
}

async function setMockSyncReady(enabled: boolean) {
  await prisma.systemConfig.upsert({
    where: { key: MOCK_SYNC_READY_KEY },
    create: { key: MOCK_SYNC_READY_KEY, value: enabled ? 'true' : 'false' },
    update: { value: enabled ? 'true' : 'false' },
  });
}

export async function isHermesMockSyncReady(): Promise<boolean> {
  if (!mockLoginSyncEnabled()) return false;
  const row = await prisma.systemConfig.findUnique({ where: { key: MOCK_SYNC_READY_KEY } });
  return row?.value === 'true';
}

async function advancePendingHermesTasks() {
  const nextStatus = await resolveHermesTaskEnqueueStatus();
  const waitingTasks = await listAgentTasks({ status: 'pending_setup', limit: 30 });
  for (const task of waitingTasks) {
    if (
      task.reviewCategory === 'hermes_not_bound' ||
      task.reviewCategory === 'hermes_not_running' ||
      task.reviewCategory === 'hermes_not_installed' ||
      task.reviewCategory === 'api_server_not_enabled'
    ) {
      await updateAgentTask(task.id, {
        status: nextStatus,
        reviewCategory: null,
      });
      await appendLog(
        task.id,
        'info',
        nextStatus === 'queued'
          ? '本机 Hermes 环境已同步，任务已进入执行队列'
          : '本机 Hermes 环境已同步，等待领取任务'
      );
    }
  }
}

async function writeMockDeviceAndCapacity(deviceName: string) {
  const deviceIdHash = createHash('sha256').update(`mock:${deviceName}`).digest('hex').slice(0, 16);
  const now = new Date().toISOString();
  const device = {
    deviceIdHash,
    deviceName,
    hermesVersion: 'mock-sync',
    geoSkillsVersion: GEO_SKILLS_VERSION,
    boundAt: now,
    lastHeartbeatAt: now,
    tokenCapacityStatus: 'available',
    modelRuntimeStatus: 'available',
    provider: 'ciyuan',
  };

  await prisma.systemConfig.upsert({
    where: { key: 'hermes:device' },
    create: { key: 'hermes:device', value: JSON.stringify(device) },
    update: { value: JSON.stringify(device) },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'hermes:token_capacity' },
    create: {
      key: 'hermes:token_capacity',
      value: JSON.stringify({
        tokenCapacityStatus: 'available',
        modelRuntimeStatus: 'available',
        provider: 'ciyuan',
        ciyuanLoginStatus: 'logged_in',
        syncStatus: 'succeeded',
        verifiedAt: now,
      }),
    },
    update: {
      value: JSON.stringify({
        tokenCapacityStatus: 'available',
        modelRuntimeStatus: 'available',
        provider: 'ciyuan',
        ciyuanLoginStatus: 'logged_in',
        syncStatus: 'succeeded',
        verifiedAt: now,
      }),
    },
  });

  return device;
}

/**
 * PRODUCTION_TODO:
 * 替换为 Hermes 客户端登录回调 / 轮询真实 sync-session 接口。
 * 当前为 Mock：用户确认已在 Hermes 登录后，写入演示用设备与词元同步状态。
 */
export async function mockConfirmHermesLoginSync(input?: { deviceName?: string }) {
  if (!mockLoginSyncEnabled()) {
    throw new Error('Mock 登录同步已关闭，请等待 Hermes 真实联调接口');
  }

  const deviceName = input?.deviceName?.trim() || '本机 Hermes';
  const startedAt = new Date().toISOString();

  await writeSyncSession({
    phase: 'syncing',
    message: '正在同步本机执行环境与技能配置…',
    startedAt,
  });

  const device = await writeMockDeviceAndCapacity(deviceName);
  await setMockSyncReady(true);
  await advancePendingHermesTasks();

  const syncedAt = new Date().toISOString();
  await writeSyncSession({
    phase: 'ready',
    message: '本机 Hermes 环境已同步，可执行 GEO 任务',
    startedAt,
    syncedAt,
  });

  return {
    phase: 'ready' as const,
    message: '本机 Hermes 环境已同步（Mock 演示）',
    mock: true,
    syncedAt,
    device: {
      deviceName: device.deviceName,
      hermesVersion: device.hermesVersion,
    },
  };
}

export async function getHermesSyncStatus(): Promise<HermesSyncStatus> {
  const device = await getHermesDevice();
  const tokenCapacity = await getTokenCapacityState();
  const session = await readSyncSession();
  const mockReady = await isHermesMockSyncReady();

  if (mockReady && device) {
    return {
      phase: 'ready',
      message: '本机 Hermes 环境已同步，可执行 GEO 任务',
      mock: true,
      syncedAt: session?.syncedAt ?? device.boundAt ?? null,
      deviceName: device.deviceName,
    };
  }

  if (session?.phase === 'syncing') {
    return {
      phase: 'syncing',
      message: session.message,
      mock: mockLoginSyncEnabled(),
      deviceName: device?.deviceName ?? null,
    };
  }

  if (session?.phase === 'failed') {
    return {
      phase: 'failed',
      message: session.error ?? session.message ?? '同步失败',
      mock: mockLoginSyncEnabled(),
      deviceName: device?.deviceName ?? null,
    };
  }

  if (device && tokenCapacity?.syncStatus === 'succeeded') {
    return {
      phase: 'ready',
      message: '本机 Hermes 环境已同步',
      mock: false,
      syncedAt: tokenCapacity.verifiedAt ?? device.boundAt ?? null,
      deviceName: device.deviceName,
    };
  }

  return {
    phase: 'await_login',
    message: '请在汇智爱马仕助手中登录账号，登录后将自动同步本机执行环境',
    mock: mockLoginSyncEnabled(),
    deviceName: null,
  };
}

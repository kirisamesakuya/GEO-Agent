import { createHash, randomUUID } from 'crypto';
import { prisma } from '../db/client.js';
import {
  appendLog,
  getAgentTask,
  updateAgentTask,
  listAgentTasks,
} from './agent-task.service.js';
import { handleTaskSuccess } from '../agent/task-success.js';
import { skillNameForTaskType } from '../lib/agent-skill.js';
import { recordAgentSkillRun } from './platform.service.js';
import { notifyPublisherAgentTask } from '../lib/publisher-notification-events.js';
import { checkHermesHealth } from '../agent/executors/hermes.js';
import type { AgentTask, AgentTaskStatus } from '../agent/types.js';
import { isTerminalStatus } from '../lib/agent-status.js';
import { GEO_WEB_OUTPUT_CONTRACT } from '../lib/geo-web-output-contract.js';
import { canStartHermesTask, getPullCapacityAdvice, saveDeviceCapacityReport } from './hermes-concurrency.service.js';

const DEVICE_KEY = 'hermes:device';
const BIND_TOKEN_KEY = 'hermes:bind_token';
const TOKEN_CAPACITY_KEY = 'hermes:token_capacity';

export type HermesDeviceState = {
  deviceIdHash: string;
  deviceName: string;
  hermesVersion?: string | null;
  geoSkillsVersion?: string | null;
  boundAt: string;
  lastHeartbeatAt?: string | null;
  tokenCapacityStatus?: string | null;
  modelRuntimeStatus?: string | null;
  provider?: string | null;
};

type BindTokenState = {
  token: string;
  expiresAt: string;
  used: boolean;
};

type TokenCapacityState = {
  tokenCapacityStatus: string;
  modelRuntimeStatus: string;
  provider?: string;
  ciyuanLoginStatus?: string;
  ciyuanBalance?: number;
  ciyuanBalanceUnit?: string;
  verifiedAt?: string;
  syncStatus?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
};

async function readDevice(): Promise<HermesDeviceState | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key: DEVICE_KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as HermesDeviceState;
  } catch {
    return null;
  }
}

async function writeDevice(state: HermesDeviceState) {
  await prisma.systemConfig.upsert({
    where: { key: DEVICE_KEY },
    create: { key: DEVICE_KEY, value: JSON.stringify(state) },
    update: { value: JSON.stringify(state) },
  });
}

async function readBindToken(): Promise<BindTokenState | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key: BIND_TOKEN_KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as BindTokenState;
  } catch {
    return null;
  }
}

async function readTokenCapacity(): Promise<TokenCapacityState | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key: TOKEN_CAPACITY_KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as TokenCapacityState;
  } catch {
    return null;
  }
}

async function writeTokenCapacity(state: TokenCapacityState) {
  await prisma.systemConfig.upsert({
    where: { key: TOKEN_CAPACITY_KEY },
    create: { key: TOKEN_CAPACITY_KEY, value: JSON.stringify(state) },
    update: { value: JSON.stringify(state) },
  });
}

function hashDeviceId(deviceName: string, clientVersion?: string): string {
  return createHash('sha256')
    .update(`${deviceName}:${clientVersion ?? 'unknown'}`)
    .digest('hex')
    .slice(0, 16);
}

export async function confirmHermesLocalBinding(input: {
  bindToken: string;
  deviceName: string;
  hermesVersion?: string;
  geoSkillsVersion?: string;
}) {
  const tokenState = await readBindToken();
  if (!tokenState || tokenState.used) {
    throw new Error('绑定码无效或已使用');
  }
  if (tokenState.token !== input.bindToken) {
    throw new Error('绑定码不正确');
  }
  if (new Date(tokenState.expiresAt).getTime() < Date.now()) {
    throw new Error('绑定码已过期，请重新生成');
  }

  const deviceIdHash = hashDeviceId(input.deviceName, input.hermesVersion);
  const device: HermesDeviceState = {
    deviceIdHash,
    deviceName: input.deviceName,
    hermesVersion: input.hermesVersion ?? null,
    geoSkillsVersion: input.geoSkillsVersion ?? null,
    boundAt: new Date().toISOString(),
    lastHeartbeatAt: new Date().toISOString(),
  };
  await writeDevice(device);
  await prisma.systemConfig.update({
    where: { key: BIND_TOKEN_KEY },
    data: { value: JSON.stringify({ ...tokenState, used: true }) },
  });

  // 绑定成功后，将 pending_setup 中 hermes_not_bound 的任务推进到 waiting_local_device
  const nextStatus = await resolveHermesTaskEnqueueStatus();
  const waitingTasks = await listAgentTasks({ status: 'pending_setup', limit: 20 });
  for (const task of waitingTasks) {
    if (task.reviewCategory === 'hermes_not_bound') {
      await updateAgentTask(task.id, {
        status: nextStatus,
        reviewCategory: null,
      });
      await appendLog(
        task.id,
        'info',
        nextStatus === 'queued'
          ? '本机 Hermes 已绑定，任务已进入执行队列'
          : '本机 Hermes 已绑定，等待领取任务'
      );
    }
  }

  return { device, bound: true };
}

export async function recordHermesHeartbeat(input: {
  deviceIdHash: string;
  deviceName?: string;
  hermesVersion?: string;
  geoSkillsVersion?: string;
  skills?: Array<{ name: string; status: string }>;
  maxConcurrentTasks?: number;
  runningTaskIds?: string[];
  availableSlots?: number;
}) {
  const device = await readDevice();
  if (!device || device.deviceIdHash !== input.deviceIdHash) {
    throw new Error('设备未绑定或设备 ID 不匹配');
  }
  const updated: HermesDeviceState = {
    ...device,
    deviceName: input.deviceName ?? device.deviceName,
    hermesVersion: input.hermesVersion ?? device.hermesVersion,
    geoSkillsVersion: input.geoSkillsVersion ?? device.geoSkillsVersion,
    lastHeartbeatAt: new Date().toISOString(),
  };
  await writeDevice(updated);

  if (
    input.maxConcurrentTasks != null ||
    input.runningTaskIds != null ||
    input.availableSlots != null
  ) {
    await saveDeviceCapacityReport({
      deviceIdHash: input.deviceIdHash,
      maxConcurrentTasks: input.maxConcurrentTasks,
      runningTaskIds: Array.isArray(input.runningTaskIds)
        ? input.runningTaskIds.map(String)
        : undefined,
      availableSlots: input.availableSlots,
      reportedAt: new Date().toISOString(),
    });
  }

  const capacity = await getPullCapacityAdvice(3);
  return { ok: true, heartbeat: updated.lastHeartbeatAt, capacity };
}

export async function recordTokenCapacityStatus(input: {
  deviceIdHash: string;
  tokenCapacityStatus: string;
  modelRuntimeStatus: string;
  provider?: string;
  ciyuanLoginStatus?: string;
  ciyuanBalance?: number;
  ciyuanBalanceUnit?: string;
  syncStatus?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const device = await readDevice();
  if (!device || device.deviceIdHash !== input.deviceIdHash) {
    throw new Error('设备未绑定');
  }

  const state: TokenCapacityState = {
    tokenCapacityStatus: input.tokenCapacityStatus,
    modelRuntimeStatus: input.modelRuntimeStatus,
    provider: input.provider,
    ciyuanLoginStatus: input.ciyuanLoginStatus,
    ciyuanBalance: input.ciyuanBalance,
    ciyuanBalanceUnit: input.ciyuanBalanceUnit,
    verifiedAt: new Date().toISOString(),
    syncStatus: input.syncStatus ?? 'succeeded',
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  };
  await writeTokenCapacity(state);

  const updatedDevice: HermesDeviceState = {
    ...device,
    tokenCapacityStatus: input.tokenCapacityStatus,
    modelRuntimeStatus: input.modelRuntimeStatus,
    provider: input.provider ?? null,
  };
  await writeDevice(updatedDevice);

  // 词元能力恢复后，推进 token_capacity_unavailable 任务
  if (input.tokenCapacityStatus === 'available' && input.modelRuntimeStatus === 'available') {
    const nextStatus = await resolveHermesTaskEnqueueStatus();
    const stuck = await listAgentTasks({ status: 'pending_setup', limit: 20 });
    for (const task of stuck) {
      if (task.reviewCategory === 'token_capacity_unavailable') {
        await updateAgentTask(task.id, {
          status: nextStatus,
          reviewCategory: undefined,
        });
        await appendLog(
          task.id,
          'info',
          nextStatus === 'queued'
            ? '词元/模型能力已恢复，任务已进入执行队列'
            : '词元/模型能力已恢复，等待本机 Hermes 领取任务'
        );
      }
    }
  }

  return state;
}

export async function getHermesLocalDevice() {
  const device = await readDevice();
  const tokenCapacity = await readTokenCapacity();
  const health = await checkHermesHealth();
  return { device, tokenCapacity, healthOk: health.ok };
}

/** API Gateway（8642）可用时由 GEO worker 主动推送任务，否则等待 Hermes 客户端拉取 */
export async function shouldPushHermesTasksViaGateway(): Promise<boolean> {
  const health = await checkHermesHealth();
  return Boolean(health.apiGatewayOk);
}

export async function resolveHermesTaskEnqueueStatus(): Promise<
  'queued' | 'waiting_local_device'
> {
  return (await shouldPushHermesTasksViaGateway())
    ? 'queued'
    : 'waiting_local_device';
}

export async function resolveHermesSetupReason(): Promise<string | null> {
  const health = await checkHermesHealth();
  const { device, tokenCapacity } = await getHermesLocalDevice();

  if (health.apiGatewayOk) {
    if (
      tokenCapacity &&
      (tokenCapacity.tokenCapacityStatus !== 'available' ||
        tokenCapacity.modelRuntimeStatus !== 'available')
    ) {
      return 'token_capacity_unavailable';
    }
    return null;
  }

  if (!health.desktopRunning) {
    return device ? 'hermes_not_running' : 'hermes_not_installed';
  }

  if (!device) return 'api_server_not_enabled';

  if (
    tokenCapacity &&
    (tokenCapacity.tokenCapacityStatus !== 'available' ||
      tokenCapacity.modelRuntimeStatus !== 'available')
  ) {
    return 'token_capacity_unavailable';
  }
  return null;
}

export async function claimNextHermesTaskForDevice(deviceIdHash: string) {
  const device = await readDevice();
  if (!device || device.deviceIdHash !== deviceIdHash) {
    throw new Error('设备未绑定');
  }

  const tasks = await listAgentTasks({ status: 'waiting_local_device', limit: 30 });
  const hermesTasks = tasks.filter((t) => t.executor === 'nous_hermes');

  let task: (typeof hermesTasks)[number] | undefined;
  for (const candidate of hermesTasks) {
    const check = await canStartHermesTask(candidate);
    if (check.allowed) {
      task = candidate;
      break;
    }
  }
  if (!task) return null;

  await updateAgentTask(task.id, {
    status: 'queued',
    progress: 5,
    externalRunId: `local-${randomUUID().slice(0, 8)}`,
  });
  await appendLog(task.id, 'info', `本机 Hermes（${device.deviceName}）已领取任务`);

  const skill = skillNameForTaskType(task.type);
  return {
    id: task.id,
    type: task.type,
    skill,
    title: task.title,
    input: task.input,
    outputContract: GEO_WEB_OUTPUT_CONTRACT,
  };
}

export async function pullNextHermesTask(deviceIdHash: string) {
  const task = await claimNextHermesTaskForDevice(deviceIdHash);
  return { task };
}

export async function pullHermesTasksPoll(deviceIdHash: string, limit = 3) {
  const capacity = await getPullCapacityAdvice(limit);
  const tasks = [];
  for (let i = 0; i < capacity.effectiveLimit; i++) {
    const claimed = await claimNextHermesTaskForDevice(deviceIdHash);
    if (!claimed) break;
    tasks.push(claimed);
  }
  return {
    tasks,
    task: tasks[0] ?? null,
    capacity,
  };
}

export async function reportHermesTaskProgress(
  taskId: string,
  deviceIdHash: string,
  input: { progress: number; step?: string; logMessage?: string }
) {
  const device = await readDevice();
  if (!device || device.deviceIdHash !== deviceIdHash) {
    throw new Error('设备未绑定');
  }
  const task = await getAgentTask(taskId);
  if (!task) throw new Error('任务不存在');

  await updateAgentTask(taskId, {
    status: 'running',
    progress: Math.min(99, Math.max(task.progress, input.progress)),
    startedAt: task.startedAt ?? new Date().toISOString(),
  });
  if (input.logMessage) {
    await appendLog(taskId, 'info', input.logMessage, input.step);
  }
  return { ok: true };
}

export async function reportHermesTaskResult(
  taskId: string,
  deviceIdHash: string,
  input: {
    status: AgentTaskStatus;
    progress?: number;
    output?: Record<string, unknown>;
    errorMessage?: string;
    userErrorMessage?: string;
    summary?: string;
  }
) {
  const device = await readDevice();
  if (!device || device.deviceIdHash !== deviceIdHash) {
    throw new Error('设备未绑定');
  }
  const task = await getAgentTask(taskId);
  if (!task) throw new Error('任务不存在');

  const terminal = isTerminalStatus(input.status);
  await updateAgentTask(taskId, {
    status: input.status,
    progress: input.progress ?? (terminal ? 100 : task.progress),
    output: input.output,
    errorMessage: input.errorMessage ?? null,
    userErrorMessage: input.userErrorMessage ?? null,
    finishedAt: terminal ? new Date().toISOString() : undefined,
  });

  if (input.summary) {
    await appendLog(taskId, 'info', input.summary);
  } else if (terminal && input.status === 'succeeded') {
    await appendLog(taskId, 'info', '本机 Hermes 执行完成，报告已回传');
  }

  if (input.status === 'succeeded' || input.status === 'partial') {
    await handleTaskSuccess(task, input.output ?? {}, input.status);
    const updated = await getAgentTask(taskId);
    await notifyPublisherAgentTask(updated ?? task, true);
  } else if (input.status === 'failed') {
    await notifyPublisherAgentTask(
      task,
      false,
      input.userErrorMessage ?? input.errorMessage
    );
  }

  await recordAgentSkillRun({
    taskId,
    skillName: skillNameForTaskType(task.type),
    executor: 'nous_hermes',
    status: input.status,
    inputSummary: task.title,
    outputSummary: input.summary ?? input.status,
    durationMs: 0,
    needsReview: input.status === 'failed' || input.status === 'partial',
  });

  return { ok: true, taskId };
}

export async function reportHermesTaskArtifacts(
  taskId: string,
  deviceIdHash: string,
  artifacts: Array<{ type: string; name: string; url?: string; content?: string }>
) {
  const device = await readDevice();
  if (!device || device.deviceIdHash !== deviceIdHash) {
    throw new Error('设备未绑定');
  }
  const task = await getAgentTask(taskId);
  if (!task) throw new Error('任务不存在');

  const output = { ...(task.output ?? {}), artifacts };
  await updateAgentTask(taskId, { output });
  await appendLog(taskId, 'info', `已回传 ${artifacts.length} 个 artifact`);
  return { ok: true };
}

export { readDevice as getHermesDevice, readTokenCapacity as getTokenCapacityState };

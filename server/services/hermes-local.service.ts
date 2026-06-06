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
  const waitingTasks = await listAgentTasks({ status: 'pending_setup', limit: 20 });
  for (const task of waitingTasks) {
    if (task.reviewCategory === 'hermes_not_bound') {
      await updateAgentTask(task.id, {
        status: 'waiting_local_device',
        reviewCategory: null,
      });
      await appendLog(task.id, 'info', '本机 Hermes 已绑定，等待领取任务');
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
  return { ok: true, heartbeat: updated.lastHeartbeatAt };
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
    const stuck = await listAgentTasks({ status: 'pending_setup', limit: 20 });
    for (const task of stuck) {
      if (task.reviewCategory === 'token_capacity_unavailable') {
        await updateAgentTask(task.id, {
          status: 'waiting_local_device',
          reviewCategory: undefined,
        });
        await appendLog(task.id, 'info', '词元/模型能力已恢复，等待本机 Hermes 领取任务');
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

export async function resolveHermesSetupReason(): Promise<string | null> {
  const { device, tokenCapacity, healthOk } = await getHermesLocalDevice();
  if (!healthOk) {
    return device ? 'hermes_not_running' : 'hermes_not_installed';
  }
  if (!device) return 'hermes_not_bound';
  if (
    tokenCapacity &&
    (tokenCapacity.tokenCapacityStatus !== 'available' ||
      tokenCapacity.modelRuntimeStatus !== 'available')
  ) {
    return 'token_capacity_unavailable';
  }
  return null;
}

export async function pullNextHermesTask(deviceIdHash: string) {
  const device = await readDevice();
  if (!device || device.deviceIdHash !== deviceIdHash) {
    throw new Error('设备未绑定');
  }

  const tasks = await listAgentTasks({ status: 'waiting_local_device', limit: 10 });
  const task = tasks.find((t) => t.executor === 'nous_hermes');
  if (!task) return { task: null };

  await updateAgentTask(task.id, {
    status: 'queued',
    progress: 5,
    externalRunId: `local-${randomUUID().slice(0, 8)}`,
  });
  await appendLog(task.id, 'info', `本机 Hermes（${device.deviceName}）已领取任务`);

  const skill = skillNameForTaskType(task.type);
  return {
    task: {
      id: task.id,
      type: task.type,
      skill,
      title: task.title,
      input: task.input,
      outputContract: {
        format: 'json',
        requiredFields: ['audit', 'data', 'metrics', 'findings', 'artifacts', 'actionPlan'],
      },
    },
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
    await notifyPublisherAgentTask(task, true);
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

import { prisma } from '../db/client.js';
import { isHermesExecutorTask } from '../lib/agent-status.js';
import { getAgentTask } from './agent-task.service.js';

const POLICY_KEY = 'hermes:geo_approval_policy';
const HERMES_BASE_URL = process.env.HERMES_API_URL ?? 'http://127.0.0.1:8642';
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? '';

export type HermesApprovalChoice = 'once' | 'session' | 'always' | 'deny';

export type GeoApprovalPolicy = {
  skipApprovalForGeo: boolean;
  updatedAt?: string;
};

export type HermesRunSnapshot = {
  runId: string;
  status?: string;
  lastEvent?: string;
  pendingApproval: boolean;
};

async function hermesFetch(path: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (HERMES_API_KEY) {
    headers.Authorization = `Bearer ${HERMES_API_KEY}`;
  }
  const res = await fetch(`${HERMES_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hermes API ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getGeoApprovalPolicy(): Promise<GeoApprovalPolicy> {
  const row = await prisma.systemConfig.findUnique({ where: { key: POLICY_KEY } });
  if (!row?.value) return { skipApprovalForGeo: false };
  try {
    const parsed = JSON.parse(row.value) as Partial<GeoApprovalPolicy>;
    return {
      skipApprovalForGeo: Boolean(parsed.skipApprovalForGeo),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return { skipApprovalForGeo: false };
  }
}

export async function setGeoApprovalPolicy(input: {
  skipApprovalForGeo: boolean;
}): Promise<GeoApprovalPolicy> {
  const next: GeoApprovalPolicy = {
    skipApprovalForGeo: Boolean(input.skipApprovalForGeo),
    updatedAt: new Date().toISOString(),
  };
  await prisma.systemConfig.upsert({
    where: { key: POLICY_KEY },
    create: { key: POLICY_KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

export async function fetchHermesRunSnapshot(runId: string): Promise<HermesRunSnapshot | null> {
  try {
    const data = (await hermesFetch(`/v1/runs/${runId}`)) as {
      status?: string;
      last_event?: string;
    };
    const status = data.status ?? 'running';
    return {
      runId,
      status,
      lastEvent: data.last_event,
      pendingApproval:
        status === 'waiting_for_approval' || data.last_event === 'approval.request',
    };
  } catch {
    return null;
  }
}

export async function approveHermesRun(
  runId: string,
  choice: HermesApprovalChoice
): Promise<{ resolved: number }> {
  const data = (await hermesFetch(`/v1/runs/${runId}/approval`, {
    method: 'POST',
    body: JSON.stringify({ choice }),
  })) as { resolved?: number };
  return { resolved: data.resolved ?? 1 };
}

/** GEO 推送策略开启时，自动以 session 范围批准 pending 工具。 */
export async function maybeAutoApproveHermesRun(runId: string): Promise<boolean> {
  const policy = await getGeoApprovalPolicy();
  if (!policy.skipApprovalForGeo) return false;

  const snap = await fetchHermesRunSnapshot(runId);
  if (!snap?.pendingApproval) return false;

  try {
    await approveHermesRun(runId, 'session');
    return true;
  } catch {
    return false;
  }
}

export async function approveHermesRunForTask(
  taskId: string,
  choice: HermesApprovalChoice
): Promise<{ resolved: number }> {
  const task = await getAgentTask(taskId);
  if (!task) throw new Error('任务不存在');
  if (!isHermesExecutorTask(task.executor)) throw new Error('该任务不是 Hermes 执行');
  const runId = task.externalRunId;
  if (!runId) throw new Error('缺少 Hermes run ID');
  return approveHermesRun(runId, choice);
}

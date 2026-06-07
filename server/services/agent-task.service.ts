import { prisma } from '../db/client.js';
import type { AgentTask, AgentTaskLog, CreateAgentTaskInput } from '../agent/types.js';
import { paginatedResult, parsePagination } from '../lib/pagination.js';
import { normalizeAgentTaskStatus, isHermesExecutorTask, isHermesLocalTaskType, isGeoAssetTaskType } from '../lib/agent-status.js';
import { normalizeGeoSkillInput } from '../lib/hermes-geo-input.js';
import {
  resolveHermesSetupReason,
  resolveHermesTaskEnqueueStatus,
  shouldPushHermesTasksViaGateway,
} from './hermes-local.service.js';

function mapTask(row: {
  id: string;
  type: string;
  title: string;
  status: string;
  progress: number;
  executor: string;
  brandName: string | null;
  input: string;
  output: string | null;
  errorMessage: string | null;
  userErrorMessage: string | null;
  externalRunId: string | null;
  businessRef: string | null;
  needsReview: boolean;
  reviewCategory: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AgentTask {
  return {
    id: row.id,
    type: row.type as AgentTask['type'],
    title: row.title,
    status: normalizeAgentTaskStatus(row.status, row.reviewCategory),
    progress: row.progress,
    executor: row.executor as AgentTask['executor'],
    brandName: row.brandName ?? undefined,
    input: JSON.parse(row.input) as Record<string, unknown>,
    output: row.output ? (JSON.parse(row.output) as Record<string, unknown>) : undefined,
    errorMessage: row.errorMessage ?? undefined,
    userErrorMessage: row.userErrorMessage ?? undefined,
    externalRunId: row.externalRunId ?? undefined,
    businessRef: row.businessRef ?? undefined,
    needsReview: row.needsReview,
    reviewCategory: row.reviewCategory ?? undefined,
    startedAt: row.startedAt?.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createAgentTask(input: CreateAgentTaskInput): Promise<AgentTask> {
  let executor = input.executor ?? 'direct_model';
  let status: AgentTask['status'] = 'queued';
  let reviewCategory: string | undefined;

  const normalizedInput = normalizeGeoSkillInput(
    input.type,
    input.input,
    input.brandName
  );

  const canMockGeoAsset =
    isGeoAssetTaskType(input.type) && Boolean(normalizedInput.userConfirmedExecution);

  if (isHermesExecutorTask(executor) && isHermesLocalTaskType(input.type)) {
    const setupReason = await resolveHermesSetupReason();
    const gatewayPush = await shouldPushHermesTasksViaGateway();
    if (canMockGeoAsset && (setupReason || !gatewayPush)) {
      executor = 'direct_model';
      status = 'queued';
    } else if (setupReason) {
      status = 'pending_setup';
      reviewCategory = setupReason;
    } else {
      status = await resolveHermesTaskEnqueueStatus();
    }
  }

  const row = await prisma.agentTask.create({
    data: {
      type: input.type,
      title: input.title,
      status,
      progress: 0,
      executor,
      brandName: input.brandName,
      input: JSON.stringify(normalizedInput),
      businessRef: input.businessRef,
      reviewCategory: reviewCategory ?? null,
    },
  });
  const logMsg =
    status === 'waiting_local_device'
      ? '任务已创建，等待本机 Hermes 领取'
      : status === 'pending_setup'
        ? '任务已创建，等待完成 Hermes 设置'
        : status === 'queued' && isHermesExecutorTask(executor)
          ? '任务已创建，将通过 API Gateway 提交本机 Hermes 执行'
          : '任务已创建并进入队列';
  await appendLog(row.id, 'info', logMsg);
  return mapTask(row);
}

export async function getAgentTask(id: string): Promise<AgentTask | undefined> {
  const row = await prisma.agentTask.findUnique({ where: { id } });
  return row ? mapTask(row) : undefined;
}

function agentTaskWhere(filters?: {
  type?: string;
  status?: string;
  brandName?: string;
  needsReview?: boolean;
  reviewCategory?: string;
}) {
  return {
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.brandName ? { brandName: filters.brandName } : {}),
    ...(filters?.needsReview === true ? { needsReview: true } : {}),
    ...(filters?.reviewCategory ? { reviewCategory: filters.reviewCategory } : {}),
  };
}

export async function listAgentTasks(filters?: {
  type?: string;
  status?: string;
  brandName?: string;
  needsReview?: boolean;
  reviewCategory?: string;
  limit?: number;
}): Promise<AgentTask[]> {
  const rows = await prisma.agentTask.findMany({
    where: agentTaskWhere(filters),
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ?? 50,
  });
  return rows.map(mapTask);
}

export async function listAgentTasksPaginated(filters?: {
  type?: string;
  status?: string;
  brandName?: string;
  needsReview?: boolean;
  reviewCategory?: string;
  page?: number;
  pageSize?: number;
}) {
  const { page, pageSize, skip, take } = parsePagination(
    { page: String(filters?.page ?? 1), pageSize: String(filters?.pageSize ?? 20) },
    20
  );
  const where = agentTaskWhere(filters);
  const [rows, total] = await Promise.all([
    prisma.agentTask.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.agentTask.count({ where }),
  ]);
  const result = paginatedResult(rows.map(mapTask), total, page, pageSize);
  return { tasks: result.items, total: result.total, page: result.page, pageSize: result.pageSize, hasMore: result.hasMore };
}

export async function getAgentTaskPlatformDetail(taskId: string) {
  const task = await getAgentTask(taskId);
  if (!task) return null;
  const [logs, skillRuns, automationRuns] = await Promise.all([
    getAgentTaskLogs(taskId),
    prisma.agentSkillRun.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.localAutomationRun.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  return { task, logs, skillRuns, automationRuns };
}

type AgentTaskPatch = Partial<AgentTask> & {
  errorMessage?: string | null;
  userErrorMessage?: string | null;
  reviewCategory?: string | null;
};

export async function updateAgentTask(
  id: string,
  patch: AgentTaskPatch
): Promise<AgentTask | undefined> {
  const existing = await prisma.agentTask.findUnique({ where: { id } });
  if (!existing) return undefined;

  const row = await prisma.agentTask.update({
    where: { id },
    data: {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
      ...(patch.output !== undefined ? { output: JSON.stringify(patch.output) } : {}),
      ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage ?? null } : {}),
      ...(patch.userErrorMessage !== undefined ? { userErrorMessage: patch.userErrorMessage ?? null } : {}),
      ...(patch.externalRunId !== undefined ? { externalRunId: patch.externalRunId } : {}),
      ...(patch.startedAt !== undefined
        ? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null }
        : {}),
      ...(patch.finishedAt !== undefined
        ? { finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : null }
        : {}),
      ...(patch.needsReview !== undefined ? { needsReview: patch.needsReview } : {}),
      ...(patch.reviewCategory !== undefined
        ? { reviewCategory: patch.reviewCategory ?? null }
        : {}),
    },
  });
  return mapTask(row);
}

export async function appendLog(
  taskId: string,
  level: AgentTaskLog['level'],
  message: string,
  detail?: string
): Promise<AgentTaskLog> {
  const row = await prisma.agentTaskLog.create({
    data: { taskId, level, message, detail },
  });
  return {
    id: row.id,
    taskId: row.taskId,
    level: row.level as AgentTaskLog['level'],
    message: row.message,
    detail: row.detail ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAgentTaskLogs(taskId: string): Promise<AgentTaskLog[]> {
  const rows = await prisma.agentTaskLog.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    taskId: r.taskId,
    level: r.level as AgentTaskLog['level'],
    message: r.message,
    detail: r.detail ?? undefined,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getLastAgentTaskLog(taskId: string): Promise<AgentTaskLog | null> {
  const row = await prisma.agentTaskLog.findFirst({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return null;
  return {
    id: row.id,
    taskId: row.taskId,
    level: row.level as AgentTaskLog['level'],
    message: row.message,
    detail: row.detail ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAgentTaskStats() {
  const [total, queued, running, succeeded, failed, partial] = await Promise.all([
    prisma.agentTask.count(),
    prisma.agentTask.count({ where: { status: 'queued' } }),
    prisma.agentTask.count({ where: { status: 'running' } }),
    prisma.agentTask.count({ where: { status: 'succeeded' } }),
    prisma.agentTask.count({ where: { status: 'failed' } }),
    prisma.agentTask.count({ where: { status: 'partial' } }),
  ]);
  return { total, queued, running, succeeded, failed, partial };
}

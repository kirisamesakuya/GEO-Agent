import {
  appendLog,
  getAgentTask,
  updateAgentTask,
  listAgentTasks,
  createAgentTask,
} from '../services/agent-task.service.js';
import { markIndexPlanFailed } from '../services/indexing.service.js';
import { getExecutor } from './executors/index.js';
import { isTerminalStatus } from './status.js';
import { skillNameForTaskType } from '../lib/agent-skill.js';
import {
  recordAgentSkillRun,
  recordLocalAutomationRun,
} from '../services/platform.service.js';
import type { AgentTask, CreateAgentTaskInput } from './types.js';
import { notifyPublisherAgentTask } from '../lib/publisher-notification-events.js';
import { handleTaskSuccess } from './task-success.js';
import { isHermesExecutorTask, isHermesLocalTaskType } from '../lib/agent-status.js';

const runningTasks = new Set<string>();

export async function enqueueAgentTask(task: AgentTask): Promise<void> {
  if (runningTasks.has(task.id)) return;

  // 本机 Hermes 任务由设备主动拉取，不走 server push
  if (isHermesExecutorTask(task.executor) && isHermesLocalTaskType(task.type)) {
    return;
  }

  runningTasks.add(task.id);

  const executor = getExecutor(task.executor);
  await updateAgentTask(task.id, {
    status: 'running',
    progress: 5,
    startedAt: new Date().toISOString(),
  });
  await appendLog(task.id, 'info', '任务开始执行');
  const runStarted = Date.now();

  try {
    const submitResult = await executor.submit((await getAgentTask(task.id))!);
    if (submitResult.externalRunId) {
      await updateAgentTask(task.id, { externalRunId: submitResult.externalRunId });
      await appendLog(task.id, 'info', `Hermes run 已创建：${submitResult.externalRunId}`);
    }

    await updateAgentTask(task.id, { progress: 20 });
    const current = (await getAgentTask(task.id))!;
    const result = await executor.poll(current);

    if (result.log) {
      await appendLog(task.id, result.log.level, result.log.message, result.log.detail);
    }

    const terminal = isTerminalStatus(result.status);
    await updateAgentTask(task.id, {
      status: result.status,
      progress: result.progress,
      output: result.output,
      errorMessage: terminal && result.status !== 'failed' ? null : result.errorMessage,
      userErrorMessage:
        terminal && result.status !== 'failed' && !result.userErrorMessage
          ? null
          : result.userErrorMessage,
      finishedAt: terminal ? new Date().toISOString() : undefined,
    });

    if (result.status === 'succeeded' || result.status === 'partial') {
      await handleTaskSuccess(current, result.output ?? {}, result.status);
      await appendLog(task.id, 'info', '任务执行完成');
      await notifyPublisherAgentTask(current, true);
    } else if (result.status === 'failed') {
      await notifyPublisherAgentTask(
        current,
        false,
        result.userErrorMessage ?? result.errorMessage
      );
    }

    if (result.status === 'failed' && current.type === 'index_sampling') {
      const planId = String(current.input.planId ?? current.businessRef ?? '');
      if (planId) await markIndexPlanFailed(planId);
    }

    const durationMs = Date.now() - runStarted;
    await recordAgentSkillRun({
      taskId: task.id,
      skillName: skillNameForTaskType(task.type),
      executor: task.executor,
      status: result.status,
      inputSummary: task.title,
      outputSummary:
        result.status === 'succeeded' || result.status === 'partial'
          ? '执行成功'
          : result.userErrorMessage ?? result.errorMessage ?? result.status,
      durationMs,
      needsReview:
        result.status === 'failed' ||
        result.status === 'partial' ||
        Boolean(result.userErrorMessage?.includes('降级')),
    });

    if (task.type === 'hermes_publish') {
      await recordLocalAutomationRun({
        taskId: task.id,
        automationType: 'hermes_publish',
        status: result.status === 'succeeded' ? 'succeeded' : 'failed',
        inputSummary: JSON.stringify({
          brand: task.brandName,
          platform: task.input.targetPlatform,
          userConfirmed: task.input.userConfirmed,
        }),
        outputSummary: result.output ? JSON.stringify(result.output).slice(0, 500) : undefined,
        evidenceUrl: (result.output?.publishLink as string) ?? undefined,
        errorMessage: result.status === 'failed' ? result.errorMessage : undefined,
      });
      if (result.status === 'failed') {
        const publishJobId = task.input.publishJobId as string | undefined;
        if (publishJobId) {
          const { updatePublishJobFromTask } = await import('../services/publish-plan.service.js');
          const reviewCategory =
            typeof result.output?.reviewCategory === 'string'
              ? String(result.output.reviewCategory)
              : 'need_manual_publish';
          await updatePublishJobFromTask(publishJobId, false, {
            errorCode: result.errorMessage ?? 'publish_failed',
            reviewCategory,
          });
        }
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (task.type === 'index_sampling') {
      const planId = String(task.input.planId ?? task.businessRef ?? '');
      if (planId) await markIndexPlanFailed(planId);
    }
    await updateAgentTask(task.id, {
      status: 'failed',
      progress: 100,
      errorMessage: message,
      userErrorMessage: '任务执行异常，请重试',
      finishedAt: new Date().toISOString(),
    });
    await appendLog(task.id, 'error', '任务执行异常', message);
    const failedTask = await getAgentTask(task.id);
    if (failedTask) await notifyPublisherAgentTask(failedTask, false, message);
    await recordAgentSkillRun({
      taskId: task.id,
      skillName: skillNameForTaskType(task.type),
      executor: task.executor,
      status: 'failed',
      inputSummary: task.title,
      outputSummary: message,
      durationMs: Date.now() - runStarted,
      needsReview: true,
    });
  } finally {
    runningTasks.delete(task.id);
  }
}

export function processQueuedTasks() {
  void (async () => {
    const queued = await listAgentTasks({ status: 'queued', limit: 5 });
    for (const task of queued) {
      if (!runningTasks.has(task.id)) void enqueueAgentTask(task);
    }
  })();
}

export function startAgentWorker(intervalMs = 2000) {
  setInterval(() => processQueuedTasks(), intervalMs);
}

export async function retryAgentTask(taskId: string): Promise<AgentTask | undefined> {
  const task = await getAgentTask(taskId);
  if (!task || (task.status !== 'failed' && task.status !== 'canceled')) return task;
  await appendLog(taskId, 'info', '用户发起重试');
  const nextStatus =
    isHermesExecutorTask(task.executor) && isHermesLocalTaskType(task.type)
      ? 'waiting_local_device'
      : 'queued';
  return updateAgentTask(taskId, {
    status: nextStatus,
    progress: 0,
    errorMessage: null,
    userErrorMessage: null,
    reviewCategory: null,
    output: undefined,
    finishedAt: undefined,
    startedAt: undefined,
    externalRunId: undefined,
  });
}

export async function cancelAgentTask(taskId: string): Promise<AgentTask | undefined> {
  const task = await getAgentTask(taskId);
  if (!task || isTerminalStatus(task.status)) return task;
  const executor = getExecutor(task.executor);
  try {
    await executor.cancel(task);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await appendLog(taskId, 'warn', '取消警告', message);
  }
  await appendLog(taskId, 'info', '任务已取消');
  return updateAgentTask(taskId, { status: 'canceled', finishedAt: new Date().toISOString() });
}

export async function createAndEnqueueTask(input: CreateAgentTaskInput): Promise<AgentTask> {
  const task = await createAgentTask(input);
  void enqueueAgentTask(task);
  return task;
}

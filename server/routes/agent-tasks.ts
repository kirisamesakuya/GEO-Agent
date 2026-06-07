import type { Express, Request, Response } from 'express';
import { requireBrandName, requirePublisherUser } from '../middleware/require-publisher.js';
import { ensureAgentTaskScope } from '../lib/publisher-scope.js';
import {
  getAgentTaskPlatformDetail,
  createAgentTask,
  listAgentTasks,
  listAgentTasksPaginated,
  getAgentTaskStats,
} from '../services/agent-task.service.js';
import { skillNameForTaskType } from '../lib/agent-skill.js';
import { getHermesDevice } from '../services/hermes-local.service.js';
import { SETUP_REASON_LABELS } from '../lib/agent-status.js';
import { cancelAgentTask, maybeEnqueueAgentTask, retryAgentTask } from '../agent/worker.js';
import { prisma } from '../db/client.js';
import { checkMinimaxConnection } from '../lib/minimax.js';
import { resolveExecutorKindForTask } from '../agent/executors/index.js';
import { validateAgentTaskSubmission } from '../services/gate.service.js';
import {
  validateAssetTaskSubmission,
  confirmAgentTaskExecution,
} from '../services/asset-task.service.js';
import {
  confirmAgentTaskResult,
  previewAgentTaskResult,
  rejectAgentTaskResult,
  regenerateAgentTaskFromResult,
} from '../services/agent-result-confirmation.service.js';
import type { AgentTaskType } from '../agent/types.js';
import { buildTaskDeliverableView } from '../lib/task-business-output.js';
import {
  approveHermesRunForTask,
  fetchHermesRunSnapshot,
  getGeoApprovalPolicy,
} from '../services/hermes-approval.service.js';
import { isHermesExecutorTask } from '../lib/agent-status.js';
import { getTaskQueueHint } from '../services/hermes-concurrency.service.js';

const VALID_TYPES: AgentTaskType[] = [
  'article_generation', 'geo_analysis', 'geo_quick_start', 'geo_audit', 'geo_schema',
  'geo_llmstxt', 'geo_citability', 'geo_technical', 'geo_crawlers', 'geo_content',
  'geo_platform_optimizer', 'geo_report_pdf', 'geo_compare',
  'geo_report', 'geo_proposal', 'geo_prospect',
  'campaign_plan', 'website_preview', 'brand_extract', 'hermes_publish', 'account_verify',
  'keyword_mining', 'knowledge_extract', 'index_sampling', 'article_rewrite',
];

export function registerAgentTaskRoutes(app: Express) {
  app.get('/api/agent-tasks/stats', async (req, res) => {
    if (!requirePublisherUser(req, res)) return;
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    res.json(await getAgentTaskStats());
  });

  app.get('/api/ai/minimax-health', async (_req, res) => {
    res.json(await checkMinimaxConnection());
  });

  app.get('/api/agent-tasks', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { type, status, limit, page, pageSize } = req.query;
    if (page || pageSize) {
      return res.json(
        await listAgentTasksPaginated({
          type: typeof type === 'string' ? type : undefined,
          status: typeof status === 'string' ? status : undefined,
          brandName,
          page: page ? Number(page) : 1,
          pageSize: pageSize ? Number(pageSize) : 20,
        })
      );
    }
    const tasks = await listAgentTasks({
      type: typeof type === 'string' ? type : undefined,
      status: typeof status === 'string' ? status : undefined,
      brandName,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ tasks, total: tasks.length, page: 1, pageSize: tasks.length, hasMore: false });
  });

  app.get('/api/agent-tasks/:id', async (req, res) => {
    if (!(await ensureAgentTaskScope(req, res, req.params.id))) return;
    const detail = await getAgentTaskPlatformDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: '任务不存在' });
    const { task, logs, skillRuns, automationRuns } = detail;
    const skillName = skillNameForTaskType(task.type);
    const device = await getHermesDevice();
    const artifacts = Array.isArray(task.output?.artifacts)
      ? (task.output!.artifacts as Array<Record<string, unknown>>)
      : [];
    const [confirmations, approvalPolicy, hermesRun] = await Promise.all([
      task.output?.geoReportId
        ? prisma.geoActionConfirmation.findMany({
            where: { reportId: String(task.output.geoReportId) },
            orderBy: { createdAt: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),
      getGeoApprovalPolicy(),
      task.externalRunId && isHermesExecutorTask(task.executor)
        ? fetchHermesRunSnapshot(task.externalRunId)
        : Promise.resolve(null),
    ]);
    res.json({
      task,
      logs,
      skillRuns,
      localRuns: automationRuns,
      confirmations,
      meta: {
        skillName,
        setupReasonLabel: task.reviewCategory
          ? SETUP_REASON_LABELS[task.reviewCategory] ?? task.reviewCategory
          : null,
        device: device
          ? {
              deviceName: device.deviceName,
              hermesVersion: device.hermesVersion,
              lastHeartbeatAt: device.lastHeartbeatAt,
            }
          : null,
        artifacts,
        executorLabel: task.executor === 'nous_hermes' ? '本机 Hermes' : '内置 Web AI',
        deliverable: buildTaskDeliverableView(task.type, task.output ?? undefined),
        approvalPolicy,
        hermesRun,
      },
    });
  });

  app.post('/api/agent-tasks/:id/hermes-approval', async (req, res) => {
    if (!(await ensureAgentTaskScope(req, res, req.params.id))) return;
    const choice = String(req.body?.choice ?? 'once').toLowerCase();
    const allowed = new Set(['once', 'session', 'always', 'deny']);
    if (!allowed.has(choice)) {
      return res.status(400).json({ error: '无效的 choice，应为 once / session / always / deny' });
    }
    try {
      const result = await approveHermesRunForTask(req.params.id, choice as 'once' | 'session' | 'always' | 'deny');
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/agent-tasks', async (req, res) => {
    const { type, title, input, executor, businessRef } = req.body ?? {};
    if (!type || !VALID_TYPES.includes(type)) return res.status(400).json({ error: '无效的任务类型' });
    if (!title || !input) return res.status(400).json({ error: '缺少 title 或 input' });

    const brandName = await requireBrandName(req, res);
    if (!brandName) return;

    const gate = await validateAgentTaskSubmission(brandName, type);
    if (!gate.ok) return res.status(400).json({ error: gate.error });

    const assetGate = validateAssetTaskSubmission({ type, input });
    if (!assetGate.ok) return res.status(400).json({ error: assetGate.error });

    const task = await createAgentTask({
      type, title, input, brandName, businessRef,
      executor: executor ?? (await resolveExecutorKindForTask(type)),
    });
    maybeEnqueueAgentTask(task);
    const queueHint = await getTaskQueueHint(task);
    res.status(201).json({ task, queueHint });
  });

  app.post('/api/agent-tasks/:id/confirm-execution', async (req, res) => {
    if (!(await ensureAgentTaskScope(req, res, req.params.id))) return;
    try {
      const { reportId, confirmedBy } = req.body ?? {};
      const task = await confirmAgentTaskExecution(req.params.id, {
        reportId: reportId ? String(reportId) : undefined,
        confirmedBy: confirmedBy ? String(confirmedBy) : undefined,
      });
      res.json({ task });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '确认失败' });
    }
  });

  app.get('/api/agent-tasks/:id/result-preview', async (req, res) => {
    if (!(await ensureAgentTaskScope(req, res, req.params.id))) return;
    try {
      res.json(await previewAgentTaskResult(req.params.id));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '预览失败' });
    }
  });

  app.post('/api/agent-tasks/:id/confirm-result', async (req, res) => {
    if (!(await ensureAgentTaskScope(req, res, req.params.id))) return;
    try {
      const { confirmedBy, selectedTerms, groupOverrides, selectedEntryKeys } = req.body ?? {};
      const result = await confirmAgentTaskResult(req.params.id, {
        confirmedBy: confirmedBy ? String(confirmedBy) : undefined,
        selectedTerms: Array.isArray(selectedTerms) ? selectedTerms.map(String) : undefined,
        groupOverrides:
          groupOverrides && typeof groupOverrides === 'object'
            ? (groupOverrides as Record<string, string>)
            : undefined,
        selectedEntryKeys: Array.isArray(selectedEntryKeys)
          ? selectedEntryKeys.map(String)
          : undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '确认失败' });
    }
  });

  app.post('/api/agent-tasks/:id/reject-result', async (req, res) => {
    if (!(await ensureAgentTaskScope(req, res, req.params.id))) return;
    try {
      const { reason } = req.body ?? {};
      const result = await rejectAgentTaskResult(
        req.params.id,
        typeof reason === 'string' ? reason : undefined
      );
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '忽略失败' });
    }
  });

  app.post('/api/agent-tasks/:id/regenerate-result', async (req, res) => {
    if (!(await ensureAgentTaskScope(req, res, req.params.id))) return;
    try {
      const task = await regenerateAgentTaskFromResult(req.params.id);
      maybeEnqueueAgentTask(task);
      res.status(201).json({ task });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '重新生成失败' });
    }
  });

  app.post('/api/agent-tasks/:id/retry', async (req, res) => {
    if (!(await ensureAgentTaskScope(req, res, req.params.id))) return;
    const task = await retryAgentTask(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    if (task.status === 'queued') {
      maybeEnqueueAgentTask(task);
    }
    res.json({ task });
  });

  app.post('/api/agent-tasks/:id/cancel', async (req, res) => {
    if (!(await ensureAgentTaskScope(req, res, req.params.id))) return;
    const task = await cancelAgentTask(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    res.json({ task });
  });
}

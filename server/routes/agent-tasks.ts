import type { Express, Request, Response } from 'express';
import {
  createAgentTask,
  getAgentTask,
  getAgentTaskLogs,
  listAgentTasks,
  listAgentTasksPaginated,
  getAgentTaskStats,
} from '../services/agent-task.service.js';
import { cancelAgentTask, enqueueAgentTask, retryAgentTask } from '../agent/worker.js';
import { prisma } from '../db/client.js';
import { checkMinimaxConnection } from '../lib/minimax.js';
import { resolveExecutorKindForTask } from '../agent/executors/index.js';
import { validateAgentTaskSubmission } from '../services/gate.service.js';
import type { AgentTaskType } from '../agent/types.js';

const VALID_TYPES: AgentTaskType[] = [
  'article_generation', 'geo_analysis', 'geo_quick_start', 'geo_audit', 'geo_schema',
  'geo_llmstxt', 'geo_citability', 'geo_report_pdf', 'geo_compare',
  'campaign_plan', 'website_preview', 'brand_extract', 'hermes_publish', 'account_verify',
  'keyword_mining', 'index_sampling', 'article_rewrite',
];

export function registerAgentTaskRoutes(app: Express) {
  app.get('/api/agent-tasks/stats', async (_req, res) => {
    res.json(await getAgentTaskStats());
  });

  app.get('/api/ai/minimax-health', async (_req, res) => {
    res.json(await checkMinimaxConnection());
  });

  app.get('/api/agent-tasks', async (req, res) => {
    const { type, status, limit, brandName, page, pageSize } = req.query;
    if (page || pageSize) {
      return res.json(
        await listAgentTasksPaginated({
          type: typeof type === 'string' ? type : undefined,
          status: typeof status === 'string' ? status : undefined,
          brandName: typeof brandName === 'string' ? brandName : undefined,
          page: page ? Number(page) : 1,
          pageSize: pageSize ? Number(pageSize) : 20,
        })
      );
    }
    const tasks = await listAgentTasks({
      type: typeof type === 'string' ? type : undefined,
      status: typeof status === 'string' ? status : undefined,
      brandName: typeof brandName === 'string' ? brandName : undefined,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ tasks, total: tasks.length, page: 1, pageSize: tasks.length, hasMore: false });
  });

  app.get('/api/agent-tasks/:id', async (req, res) => {
    const task = await getAgentTask(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    const logs = await getAgentTaskLogs(task.id);
    const [skillRuns, localRuns, confirmations] = await Promise.all([
      prisma.agentSkillRun.findMany({ where: { taskId: task.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.localAutomationRun.findMany({ where: { taskId: task.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
      task.output?.geoReportId
        ? prisma.geoActionConfirmation.findMany({
            where: { reportId: String(task.output.geoReportId) },
            orderBy: { createdAt: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),
    ]);
    res.json({ task, logs, skillRuns, localRuns, confirmations });
  });

  app.post('/api/agent-tasks', async (req, res) => {
    const { type, title, input, brandName, executor, businessRef } = req.body ?? {};
    if (!type || !VALID_TYPES.includes(type)) return res.status(400).json({ error: '无效的任务类型' });
    if (!title || !input) return res.status(400).json({ error: '缺少 title 或 input' });

    if (brandName) {
      const gate = await validateAgentTaskSubmission(brandName, type);
      if (!gate.ok) return res.status(400).json({ error: gate.error });
    }

    const task = await createAgentTask({
      type, title, input, brandName, businessRef,
      executor: executor ?? (await resolveExecutorKindForTask(type)),
    });
    void enqueueAgentTask(task);
    res.status(201).json({ task });
  });

  app.post('/api/agent-tasks/:id/retry', async (req, res) => {
    const task = await retryAgentTask(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    void enqueueAgentTask(task);
    res.json({ task });
  });

  app.post('/api/agent-tasks/:id/cancel', async (req, res) => {
    const task = await cancelAgentTask(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    res.json({ task });
  });
}

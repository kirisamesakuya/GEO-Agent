import type { Express } from 'express';
import {
  listGeoReports,
  getGeoReport,
  listCampaignPlans,
  getCampaignPlan,
  publishCampaignPlan,
  buildCampaignInputFromGeoReport,
} from '../services/campaign.service.js';
import { createAgentTask } from '../services/agent-task.service.js';
import { enqueueAgentTask } from '../agent/worker.js';
import { resolveExecutorKindForTask } from '../agent/executors/index.js';
import { checkBudget, freezeBudget } from '../services/budget.service.js';
import {
  validateAgentTaskSubmission,
  validateGeoAnalysisSubmission,
  validateTaskLobbyPublish,
} from '../services/gate.service.js';
import { confirmGeoAuditAction } from '../services/geo-audit.service.js';
import { hasGeoReportConfirmation } from '../services/asset-task.service.js';

export function registerCampaignRoutes(app: Express) {
  app.get('/api/geo-reports', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    res.json({ reports: await listGeoReports(brandName) });
  });

  app.get('/api/geo-reports/:id', async (req, res) => {
    const report = await getGeoReport(req.params.id);
    if (!report) return res.status(404).json({ error: '报告不存在' });
    res.json({ report });
  });

  app.get('/api/geo-reports/:id/article-effects', async (req, res) => {
    const { listArticleEffectsForReport } = await import('../services/article-effect.service.js');
    res.json({ effects: await listArticleEffectsForReport(req.params.id) });
  });

  app.post('/api/geo-analyses', async (req, res) => {
    const { brandName, brand, prospectMode, targetBrand, workspaceBrandName, ...input } = req.body ?? {};
    const workspace = String(workspaceBrandName ?? brandName ?? brand ?? '').trim() || '品牌';
    const gate = await validateGeoAnalysisSubmission(workspace, {
      prospectMode: Boolean(prospectMode),
      targetBrand,
      ...input,
    });
    if (!gate.ok) return res.status(400).json({ error: gate.error });

    const analysisName = gate.analysisBrandName ?? workspace;
    const task = await createAgentTask({
      type: 'geo_analysis',
      title: input.prospectMode
        ? `${analysisName} · 售前 GEO 分析`
        : `${analysisName} · GEO 分析`,
      brandName: analysisName,
      input: {
        brand: analysisName,
        workspaceBrand: workspace,
        prospectMode: Boolean(prospectMode),
        targetBrand,
        ...input,
      },
      executor: await resolveExecutorKindForTask('geo_analysis'),
    });
    void enqueueAgentTask(task);
    res.status(201).json({ task });
  });

  app.get('/api/campaign-plans', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    res.json({ plans: await listCampaignPlans(brandName) });
  });

  app.get('/api/campaign-plans/:id', async (req, res) => {
    const plan = await getCampaignPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: '计划不存在' });
    res.json({ plan });
  });

  app.post('/api/campaign-plans/generate-from-geo', async (req, res) => {
    const { brandName, brand, geoReportId, platforms, budgetMin, budgetMax, userConfirmedExecution } =
      req.body ?? {};
    const name = String(brandName ?? brand ?? '').trim() || '品牌';
    const reportId = String(geoReportId ?? '').trim();
    if (!reportId) return res.status(400).json({ error: '请提供 geoReportId' });

    const confirmed =
      userConfirmedExecution === true ||
      (await hasGeoReportConfirmation(reportId, 'generate_task_pack'));
    if (!confirmed) {
      return res.status(400).json({
        error: '生成整改任务包为中风险动作，请先确认',
        requiresConfirmation: true,
        actionType: 'generate_task_pack',
      });
    }

    if (userConfirmedExecution === true) {
      await confirmGeoAuditAction(reportId, {
        actionType: 'generate_task_pack',
        riskLevel: 'medium',
        payload: { brandName: name },
        confirmedBy: 'merchant',
      });
    }

    const report = await getGeoReport(reportId);
    if (!report) return res.status(404).json({ error: 'GEO 报告不存在' });

    const gate = await validateAgentTaskSubmission(name, 'campaign_plan', 15);
    if (!gate.ok) return res.status(400).json({ error: gate.error });

    const planInput = buildCampaignInputFromGeoReport(report, {
      platforms: Array.isArray(platforms) ? platforms.map(String) : undefined,
      budgetMin: budgetMin != null ? Number(budgetMin) : undefined,
      budgetMax: budgetMax != null ? Number(budgetMax) : undefined,
    });

    const task = await createAgentTask({
      type: 'campaign_plan',
      title: `${name} · GEO 任务包`,
      brandName: name,
      input: { brand: name, ...planInput },
      executor: await resolveExecutorKindForTask('campaign_plan'),
    });
    void enqueueAgentTask(task);
    res.status(201).json({ task });
  });

  app.post('/api/campaign-plans/generate', async (req, res) => {
    const { brandName, brand, goal, ...input } = req.body ?? {};
    const name = brandName ?? brand ?? '品牌';
    const gate = await validateAgentTaskSubmission(name, 'campaign_plan', 15);
    if (!gate.ok) return res.status(400).json({ error: gate.error });

    const task = await createAgentTask({
      type: 'campaign_plan',
      title: `${name} · 投放计划`,
      brandName: name,
      input: { brand: name, goal, ...input },
      executor: await resolveExecutorKindForTask('campaign_plan'),
    });
    void enqueueAgentTask(task);
    res.status(201).json({ task });
  });

  app.post('/api/campaign-plans/:id/publish', async (req, res) => {
    const { brandName } = req.body ?? {};
    const plan = await getCampaignPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: '计划不存在' });

    const name = brandName ?? plan.brandName;
    const totalBudget = plan.packages.reduce((s, p) => s + p.budget, 0);
    const lobbyGate = await validateTaskLobbyPublish(name, totalBudget);
    if (!lobbyGate.ok) return res.status(400).json({ error: lobbyGate.error });

    const budgetCheck = await checkBudget(name, totalBudget);
    if (!budgetCheck.ok) return res.status(400).json({ error: budgetCheck.error });

    const freeze = await freezeBudget(name, totalBudget, plan.id);
    if (!freeze.ok) return res.status(400).json({ error: freeze.error });

    const result = await publishCampaignPlan(plan.id, name);
    res.json(result);
  });
}

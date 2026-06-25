import type { Express } from 'express';
import { requireBrandName, requireBrandAccess, resolveGeoAnalysisWorkspace } from '../middleware/require-publisher.js';
import { ensureGeoReportScope } from '../lib/publisher-scope.js';
import {
  listGeoReports,
  getGeoReport,
  listCampaignPlans,
  getCampaignPlan,
  publishCampaignPlan,
  buildCampaignInputFromGeoReport,
  buildCampaignInputFromBrandProfile,
  buildCampaignInputFromIndexingGap,
  updateCampaignPlanPackages,
  updateCampaignPlanSettings,
  addCampaignPlanPackage,
  deleteCampaignPlanPackage,
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
import { validateSupplementNotes } from '../../lib/campaign-form-limits.js';
import { confirmGeoAuditAction } from '../services/geo-audit.service.js';
import { hasGeoReportConfirmation } from '../services/asset-task.service.js';
import { getTaskQueueHint } from '../services/hermes-concurrency.service.js';
import { appendAuditLog } from '../services/audit.service.js';
import { BRAND_AGREEMENT_VERSION } from '../../lib/marketplace-agreements.js';

export function registerCampaignRoutes(app: Express) {
  app.get('/api/geo-reports', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { ensureDemoPublisherSnapshot, isDemoPublisherSnapshotEnabled } = await import(
      '../db/demo-publisher-snapshot.js'
    );
    if (isDemoPublisherSnapshotEnabled()) {
      await ensureDemoPublisherSnapshot(brandName);
    }
    res.json({ reports: await listGeoReports(brandName, 50) });
  });

  app.get('/api/geo-reports/:id', async (req, res) => {
    if (!(await ensureGeoReportScope(req, res, req.params.id))) return;
    const report = await getGeoReport(req.params.id);
    if (!report) return res.status(404).json({ error: '报告不存在' });
    res.json({ report });
  });

  app.get('/api/geo-reports/:id/article-effects', async (req, res) => {
    if (!(await ensureGeoReportScope(req, res, req.params.id))) return;
    const { listArticleEffectsForReport } = await import('../services/article-effect.service.js');
    res.json({ effects: await listArticleEffectsForReport(req.params.id) });
  });

  app.post('/api/geo-analyses', async (req, res) => {
    const { brandName, brand, prospectMode, targetBrand, workspaceBrandName, ...input } = req.body ?? {};
    const workspace = await resolveGeoAnalysisWorkspace(req, res, {
      prospectMode: Boolean(prospectMode),
      workspaceBrandName,
      brandName,
      brand,
    });
    if (!workspace) return;

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
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    res.json({ plans: await listCampaignPlans(brandName) });
  });

  app.get('/api/campaign-plans/:id', async (req, res) => {
    const plan = await getCampaignPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: '计划不存在' });
    if (!(await requireBrandAccess(req, res, plan.brandName))) return;
    res.json({ plan });
  });

  app.post('/api/campaign-plans/generate-from-geo', async (req, res) => {
    const { geoReportId, platforms, budgetMin, budgetMax, userConfirmedExecution } = req.body ?? {};
    const name = await requireBrandName(req, res);
    if (!name) return;
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
    const queueHint = await getTaskQueueHint(task);
    res.status(201).json({ task, queueHint });
  });

  app.post('/api/campaign-plans/generate', async (req, res) => {
    const name = await requireBrandName(req, res);
    if (!name) return;
    const {
      source,
      supplementNotes,
      sourceIndexPlanId,
      sourceIndexResultIds,
      budgetMin,
      budgetMax,
      platforms,
      ...rest
    } = req.body ?? {};
    const gate = await validateAgentTaskSubmission(name, 'campaign_plan', 15);
    if (!gate.ok) return res.status(400).json({ error: gate.error });

    const notesText = supplementNotes != null ? String(supplementNotes) : undefined;
    const notesError = validateSupplementNotes(notesText);
    if (notesError) return res.status(400).json({ error: notesError });

    const extraPlatforms = Array.isArray(platforms)
      ? platforms.map(String).filter(Boolean)
      : undefined;

    const src = String(source ?? 'brand_profile');
    let planInput: Record<string, unknown>;
    if (src === 'indexing_result') {
      const planId = String(sourceIndexPlanId ?? '').trim();
      if (!planId) {
        return res.status(400).json({ error: '请选择查询计划' });
      }
      const explicitIds = Array.isArray(sourceIndexResultIds)
        ? sourceIndexResultIds.map(String).filter(Boolean)
        : [];
      const { resolveIndexingGapResultIds } = await import('../services/indexing.service.js');
      const resultIds = await resolveIndexingGapResultIds(planId, explicitIds);
      if (!resultIds.length) {
        return res.status(400).json({ error: '该计划暂无排名缺口，请先执行采样或更换计划' });
      }
      planInput = buildCampaignInputFromIndexingGap(name, {
        sourceIndexPlanId: planId,
        sourceIndexResultIds: resultIds,
        budgetMin: budgetMin != null ? Number(budgetMin) : undefined,
        budgetMax: budgetMax != null ? Number(budgetMax) : undefined,
        supplementNotes: notesText?.trim() || undefined,
        platforms: extraPlatforms,
      });
    } else {
      planInput = buildCampaignInputFromBrandProfile(name, {
        budgetMin: budgetMin != null ? Number(budgetMin) : undefined,
        budgetMax: budgetMax != null ? Number(budgetMax) : undefined,
        supplementNotes: notesText?.trim() || undefined,
        platforms: extraPlatforms,
      });
    }

    const task = await createAgentTask({
      type: 'campaign_plan',
      title: `${name} · 投放计划`,
      brandName: name,
      input: { brand: name, ...planInput, ...rest },
      executor: await resolveExecutorKindForTask('campaign_plan'),
    });
    void enqueueAgentTask(task);
    const queueHint = await getTaskQueueHint(task);
    res.status(201).json({ task, queueHint });
  });

  app.patch('/api/campaign-plans/:id/packages', async (req, res) => {
    const plan = await getCampaignPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: '计划不存在' });
    if (!(await requireBrandAccess(req, res, plan.brandName))) return;
    const packages = Array.isArray(req.body?.packages) ? req.body.packages : [];
    if (!packages.length) return res.status(400).json({ error: '请提供任务包数据' });
    const updated = await updateCampaignPlanPackages(plan.id, packages);
    res.json({ plan: updated });
  });

  app.post('/api/campaign-plans/:id/packages', async (req, res) => {
    const plan = await getCampaignPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: '计划不存在' });
    if (!(await requireBrandAccess(req, res, plan.brandName))) return;
    try {
      const updated = await addCampaignPlanPackage(plan.id, req.body ?? {});
      res.status(201).json({ plan: updated });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : '添加失败' });
    }
  });

  app.delete('/api/campaign-plans/:id/packages/:packageId', async (req, res) => {
    const plan = await getCampaignPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: '计划不存在' });
    if (!(await requireBrandAccess(req, res, plan.brandName))) return;
    try {
      const updated = await deleteCampaignPlanPackage(plan.id, req.params.packageId);
      res.json({ plan: updated });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : '删除失败' });
    }
  });

  app.patch('/api/campaign-plans/:id/settings', async (req, res) => {
    const plan = await getCampaignPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: '计划不存在' });
    if (!(await requireBrandAccess(req, res, plan.brandName))) return;
    const { hiddenBudgetMaxCents, perTaskBudgetCapCents, pricingMode } = req.body ?? {};
    const updated = await updateCampaignPlanSettings(plan.id, {
      hiddenBudgetMaxCents:
        hiddenBudgetMaxCents != null ? Math.round(Number(hiddenBudgetMaxCents)) : undefined,
      perTaskBudgetCapCents:
        perTaskBudgetCapCents != null ? Math.round(Number(perTaskBudgetCapCents)) : undefined,
      pricingMode: typeof pricingMode === 'string' ? pricingMode : undefined,
    });
    res.json({ plan: updated });
  });

  app.post('/api/campaign-plans/:id/publish', async (req, res) => {
    const plan = await getCampaignPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: '计划不存在' });
    const name = (await requireBrandAccess(req, res, plan.brandName)) ?? plan.brandName;
    if (!name) return;

    const isQuoteMode = plan.pricingMode === 'provider_quote';
    const totalBudget = plan.packages.reduce((s, p) => s + p.budget, 0);

    if (!isQuoteMode) {
      const lobbyGate = await validateTaskLobbyPublish(name, totalBudget);
      if (!lobbyGate.ok) return res.status(400).json({ error: lobbyGate.error });

      const budgetCheck = await checkBudget(name, totalBudget);
      if (!budgetCheck.ok) return res.status(400).json({ error: budgetCheck.error });

      const freeze = await freezeBudget(name, totalBudget, plan.id);
      if (!freeze.ok) return res.status(400).json({ error: freeze.error });
    }

    const result = await publishCampaignPlan(plan.id, name, {
      taskBriefJson: req.body?.taskBriefJson,
    });
    if (req.body?.agreementVersion === BRAND_AGREEMENT_VERSION) {
      await appendAuditLog({
        action: 'brand_transaction_agreement_accept',
        entity: 'CampaignPlan',
        entityId: plan.id,
        detail: `agreement:${BRAND_AGREEMENT_VERSION}`,
        source: 'publisher',
      });
    }
    res.json(result);
  });
}

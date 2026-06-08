import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
import { ensureIndexPlanScope } from '../lib/publisher-scope.js';
import {
  listIndexPlans,
  createIndexPlan,
  runIndexPlan,
  listIndexResults,
  getIndexPlan,
} from '../services/indexing.service.js';

export function registerIndexingRoutes(app: Express) {
  app.get('/api/indexing/plans', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    res.json({ plans: await listIndexPlans(brandName) });
  });

  app.get('/api/indexing/plans/:id', async (req, res) => {
    const planRow = await ensureIndexPlanScope(req, res, req.params.id);
    if (!planRow) return;
    const plan = await getIndexPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: '计划不存在' });
    const { ensureDemoPublisherSnapshot } = await import('../db/demo-publisher-snapshot.js');
    await ensureDemoPublisherSnapshot(plan.brandName);
    const results = await listIndexResults({ planId: plan.id });
    res.json({ plan, results });
  });

  app.post('/api/indexing/plans', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const {
      name,
      platforms,
      keywordIds,
      queryAt,
      scheduleFrequency,
      scheduleRunTime,
      scheduleWeekday,
      scheduleMonthDay,
    } = req.body ?? {};
    if (!name) return res.status(400).json({ error: '缺少必填字段' });
    try {
      const plan = await createIndexPlan(brandName, {
        name,
        platforms: platforms ?? [],
        keywordIds: keywordIds ?? [],
        queryAt,
        scheduleFrequency,
        scheduleRunTime,
        scheduleWeekday,
        scheduleMonthDay,
      });
      res.json(plan);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '创建失败' });
    }
  });

  app.post('/api/indexing/plans/:id/run', async (req, res) => {
    const planRow = await ensureIndexPlanScope(req, res, req.params.id);
    if (!planRow) return;
    const brandName = planRow.brand.name;
    const plan = await runIndexPlan(req.params.id, brandName);
    res.json(plan);
  });

  app.get('/api/indexing/plans/:id/gap-coverage', async (req, res) => {
    const planRow = await ensureIndexPlanScope(req, res, req.params.id);
    if (!planRow) return;
    const { listGapCoverageForPlan } = await import('../services/article-effect.service.js');
    res.json({ links: await listGapCoverageForPlan(planRow.brand.name, req.params.id) });
  });

  app.get('/api/indexing/results', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const results = await listIndexResults({
      brandName,
      planId: typeof req.query.planId === 'string' ? req.query.planId : undefined,
      platform: typeof req.query.platform === 'string' ? req.query.platform : undefined,
      hit: req.query.hit === 'true' ? true : req.query.hit === 'false' ? false : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    });
    res.json({ results });
  });
}

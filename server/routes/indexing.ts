import type { Express } from 'express';
import {
  listIndexPlans,
  createIndexPlan,
  runIndexPlan,
  listIndexResults,
  getIndexPlan,
} from '../services/indexing.service.js';

export function registerIndexingRoutes(app: Express) {
  app.get('/api/indexing/plans', async (req, res) => {
    const brandName = String(req.query.brandName ?? '');
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    res.json({ plans: await listIndexPlans(brandName) });
  });

  app.get('/api/indexing/plans/:id', async (req, res) => {
    const plan = await getIndexPlan(req.params.id);
    if (!plan) return res.status(404).json({ error: '计划不存在' });
    const results = await listIndexResults({ planId: plan.id });
    res.json({ plan, results });
  });

  app.post('/api/indexing/plans', async (req, res) => {
    const {
      brandName,
      name,
      platforms,
      keywordIds,
      queryAt,
      scheduleFrequency,
      scheduleRunTime,
      scheduleWeekday,
      scheduleMonthDay,
    } = req.body ?? {};
    if (!brandName || !name) return res.status(400).json({ error: '缺少必填字段' });
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
    const { brandName } = req.body ?? {};
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    const plan = await runIndexPlan(req.params.id, brandName);
    res.json(plan);
  });

  app.get('/api/indexing/plans/:id/gap-coverage', async (req, res) => {
    const brandName = String(req.query.brandName ?? '');
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    const { listGapCoverageForPlan } = await import('../services/article-effect.service.js');
    res.json({ links: await listGapCoverageForPlan(brandName, req.params.id) });
  });

  app.get('/api/indexing/results', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
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

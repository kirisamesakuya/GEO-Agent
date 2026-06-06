import type { Express } from 'express';
import {
  listPublishPlans,
  createPublishPlan,
  listPublishRecords,
  executePublishPlan,
  bulkSchedulePublishPlan,
  listPublishJobs,
} from '../services/publish-plan.service.js';

export function registerPublishPlanRoutes(app: Express) {
  app.get('/api/publish-plans', async (req, res) => {
    const brandName = String(req.query.brandName ?? '');
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    res.json({ plans: await listPublishPlans(brandName) });
  });

  app.post('/api/publish-plans', async (req, res) => {
    const { brandName, ...data } = req.body ?? {};
    if (!brandName || !data.name) return res.status(400).json({ error: '缺少必填字段' });
    const plan = await createPublishPlan(brandName, data);
    res.json(plan);
  });

  app.post('/api/publish-plans/:id/execute', async (req, res) => {
    const { brandName } = req.body ?? {};
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    const record = await executePublishPlan(req.params.id, brandName);
    res.json(record);
  });

  app.post('/api/publish-plans/bulk-schedule', async (req, res) => {
    try {
      const result = await bulkSchedulePublishPlan(req.body ?? {});
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '排程失败' });
    }
  });

  app.get('/api/publish-jobs', async (req, res) => {
    const brandName = String(req.query.brandName ?? '');
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    const planId = typeof req.query.planId === 'string' ? req.query.planId : undefined;
    res.json({ jobs: await listPublishJobs(brandName, planId) });
  });

  app.get('/api/publish-records', async (req, res) => {
    const brandName = String(req.query.brandName ?? '');
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    const records = await listPublishRecords(brandName, {
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      reviewCategory:
        typeof req.query.reviewCategory === 'string' ? req.query.reviewCategory : undefined,
    });
    res.json({ records });
  });
}

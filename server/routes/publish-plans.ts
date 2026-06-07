import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
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
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    res.json({ plans: await listPublishPlans(brandName) });
  });

  app.post('/api/publish-plans', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { ...data } = req.body ?? {};
    if (!data.name) return res.status(400).json({ error: '缺少必填字段' });
    const plan = await createPublishPlan(brandName, data);
    res.json(plan);
  });

  app.post('/api/publish-plans/:id/execute', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const record = await executePublishPlan(req.params.id, brandName);
    res.json(record);
  });

  app.post('/api/publish-plans/bulk-schedule', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    try {
      const result = await bulkSchedulePublishPlan({ ...(req.body ?? {}), brandName });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '排程失败' });
    }
  });

  app.get('/api/publish-jobs', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const planId = typeof req.query.planId === 'string' ? req.query.planId : undefined;
    res.json({ jobs: await listPublishJobs(brandName, planId) });
  });

  app.get('/api/publish-records', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const records = await listPublishRecords(brandName, {
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      reviewCategory:
        typeof req.query.reviewCategory === 'string' ? req.query.reviewCategory : undefined,
    });
    res.json({ records });
  });
}

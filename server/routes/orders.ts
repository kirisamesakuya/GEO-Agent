import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
import { ensureTaskOrderScope } from '../lib/publisher-scope.js';
import { requireBrandName } from '../middleware/require-publisher.js';
import { getAuthMode } from '../middleware/request-context.js';
import {
  listPublishedOrders,
  listOrdersByBrand,
  getOrder,
  createTaskOrder,
  confirmAcceptance,
  requestRevision,
  openDispute,
  listProviders,
} from '../services/order.service.js';
import {
  approveArticleDraft,
  requestArticleDraftRevision,
} from '../services/article-delivery.service.js';
import { checkBudget, freezeBudget } from '../services/budget.service.js';
import { validateTaskLobbyPublish } from '../services/gate.service.js';

export function registerOrderRoutes(app: Express) {
  app.get('/api/orders', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (brandName) {
      return res.json({ orders: await listOrdersByBrand(brandName) });
    }
    if (getAuthMode() === 'session') return;
    res.json({ orders: await listPublishedOrders() });
  });

  app.get('/api/orders/:id', async (req, res) => {
    const order = await getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (getAuthMode() === 'session') {
      const brandName = await requireBrandName(req, res);
      if (!brandName || brandName !== order.brandName) {
        return res.status(403).json({ error: '无权访问该订单' });
      }
    }
    res.json({ order });
  });

  app.post('/api/orders', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const input = req.body ?? {};
    if (!input.title || !input.budget) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const budgetAmount = Number(input.budget);
    const lobbyGate = await validateTaskLobbyPublish(brandName, budgetAmount);
    if (!lobbyGate.ok) return res.status(400).json({ error: lobbyGate.error });

    const budgetCheck = await checkBudget(brandName, budgetAmount);
    if (!budgetCheck.ok) return res.status(400).json({ error: budgetCheck.error });

    const platform = input.platform ?? '小红书';

    const order = await createTaskOrder({
      brandName,
      title: input.title,
      type: input.type ?? '达人',
      platform,
      budget: Number(input.budget),
      deliverable: input.deliverable ?? input.description ?? '按任务描述交付',
      acceptance: input.acceptance ?? '截图证明 / 链接回传',
      deadline: input.deadline,
    });
    const freeze = await freezeBudget(brandName, Number(input.budget), order.id);
    if (!freeze.ok) return res.status(400).json({ error: freeze.error });

    res.status(201).json({ order });
  });

  app.post('/api/orders/:id/acceptance', async (req, res) => {
    if (!(await ensureTaskOrderScope(req, res, req.params.id))) return;
    try {
      res.json({ order: await confirmAcceptance(req.params.id) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '验收失败' });
    }
  });

  app.post('/api/orders/:id/draft/approve', async (req, res) => {
    if (!(await ensureTaskOrderScope(req, res, req.params.id))) return;
    try {
      res.json({ order: await approveArticleDraft(req.params.id) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '操作失败' });
    }
  });

  app.post('/api/orders/:id/draft/revision', async (req, res) => {
    if (!(await ensureTaskOrderScope(req, res, req.params.id))) return;
    const { reason } = req.body ?? {};
    try {
      res.json({ order: await requestArticleDraftRevision(req.params.id, reason ?? '') });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '操作失败' });
    }
  });

  app.post('/api/orders/:id/revision', async (req, res) => {
    if (!(await ensureTaskOrderScope(req, res, req.params.id))) return;
    const { reason } = req.body ?? {};
    try {
      res.json({ order: await requestRevision(req.params.id, reason ?? '', 'merchant') });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '返修失败' });
    }
  });

  app.post('/api/orders/:id/disputes', async (req, res) => {
    if (!(await ensureTaskOrderScope(req, res, req.params.id))) return;
    const { reason } = req.body ?? {};
    if (!reason?.trim()) return res.status(400).json({ error: '请填写争议说明' });
    res.json({ order: await openDispute(req.params.id, reason, 'merchant') });
  });

  // Provider 接单/交付/分页见 server/routes/provider.ts（勿在此重复注册，否则 Express 会先匹配旧 handler）

  app.get('/api/providers', async (_req, res) => {
    res.json({ providers: await listProviders() });
  });
}

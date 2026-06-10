import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
import { ensureWebsiteRequestScope } from '../lib/publisher-scope.js';
import {
  createWebsiteLeadRequest,
  createWebsiteRequest,
  listWebsiteRequests,
  getWebsiteRequest,
  confirmWebsiteOrder,
  listWebsiteOrders,
  completeWebsiteOrder,
  updateWebsiteRequestAttachments,
} from '../services/website.service.js';
import { createAgentTask } from '../services/agent-task.service.js';
import { enqueueAgentTask } from '../agent/worker.js';
import { resolveExecutorKindForTask } from '../agent/executors/index.js';
import { validateAgentTaskSubmission } from '../services/gate.service.js';

export function registerWebsiteRoutes(app: Express) {
  app.get('/api/website-requests', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { ensureDemoWebsiteOrders } = await import('../db/demo-orders.js');
    const { isDemoPublisherSnapshotEnabled } = await import('../db/demo-publisher-snapshot.js');
    if (isDemoPublisherSnapshotEnabled()) {
      await ensureDemoWebsiteOrders(brandName);
    }
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ requests: await listWebsiteRequests({ brandName, status }) });
  });

  app.post('/api/website-requests', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { pageType, goal, referenceUrl, modules, attachments, keywords, contact, notes } =
      req.body ?? {};

    if (keywords && contact) {
      if (!pageType || !String(keywords).trim() || !String(contact).trim()) {
        return res.status(400).json({ error: '缺少页面类型、目标关键词或联系方式' });
      }
      try {
        const { request, order } = await createWebsiteLeadRequest({
          brandName,
          pageType,
          referenceUrl,
          keywords: String(keywords).trim(),
          contact: String(contact).trim(),
          notes: notes ? String(notes).trim() : undefined,
          modules: Array.isArray(modules) ? modules : undefined,
        });
        return res.status(201).json({ request, order });
      } catch (err) {
        return res.status(400).json({ error: err instanceof Error ? err.message : '提交失败' });
      }
    }

    if (!pageType || !goal) {
      return res.status(400).json({ error: '缺少页面类型或目标' });
    }
    const request = await createWebsiteRequest({
      brandName,
      pageType,
      goal,
      referenceUrl,
      modules: modules ?? ['Hero', '服务介绍'],
      attachments,
    });
    res.status(201).json({ request });
  });

  app.patch('/api/website-requests/:id/attachments', async (req, res) => {
    if (!(await ensureWebsiteRequestScope(req, res, req.params.id))) return;
    const { attachments } = req.body ?? {};
    if (!Array.isArray(attachments)) {
      return res.status(400).json({ error: 'attachments 须为数组' });
    }
    try {
      res.json({ request: await updateWebsiteRequestAttachments(req.params.id, attachments) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '更新失败' });
    }
  });

  app.get('/api/website-requests/:id', async (req, res) => {
    if (!(await ensureWebsiteRequestScope(req, res, req.params.id))) return;
    const request = await getWebsiteRequest(req.params.id);
    if (!request) return res.status(404).json({ error: '需求不存在' });
    res.json({ request });
  });

  app.post('/api/website-requests/preview', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { pageType, goal, referenceUrl, modules, attachments } = req.body ?? {};
    const gate = await validateAgentTaskSubmission(brandName, 'website_preview', 15);
    if (!gate.ok) return res.status(400).json({ error: gate.error });

    const task = await createAgentTask({
      type: 'website_preview',
      title: `${brandName} · ${pageType ?? '网页'}预览`,
      brandName,
      input: {
        brand: brandName,
        pageType,
        goal,
        referenceUrl,
        modules,
        attachments: Array.isArray(attachments) ? attachments : [],
        taskKind: 'website',
      },
      executor: await resolveExecutorKindForTask('website_preview'),
    });
    void enqueueAgentTask(task);
    res.status(201).json({ task });
  });

  app.post('/api/website-requests/:id/confirm', async (req, res) => {
    const order = await confirmWebsiteOrder(req.params.id);
    res.json({ order });
  });

  app.get('/api/website-orders', async (req, res) => {
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    res.json({ orders: await listWebsiteOrders(brandName) });
  });

  app.post('/api/website-orders/:id/complete', async (req, res) => {
    res.json({ order: await completeWebsiteOrder(req.params.id) });
  });
}

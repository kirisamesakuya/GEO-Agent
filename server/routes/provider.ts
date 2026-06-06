import type { Express } from 'express';
import {
  getProvider,
  listProviders,
  getProviderDashboard,
  upsertProviderProfile,
  submitProviderApplication,
  listTaskMarketplace,
  applyToTaskOrder,
  claimTaskOrder,
  confirmApplication,
  listProviderOrders,
  listProviderOrdersPaginated,
  listProviderAssets,
  addProviderAsset,
  deleteProviderAsset,
  listProviderPricingRules,
  upsertProviderPricingRule,
  deleteProviderPricingRule,
  listProviderApplications,
  withdrawProviderApplication,
  getProviderEarnings,
} from '../services/provider.service.js';
import { getOrder, submitDelivery, openDispute, submitRevisionResponse } from '../services/order.service.js';
import { resolveMarketplaceSlots } from '../lib/marketplace-task-slots.js';
import {
  isArticleContentOrder,
  submitArticleDraft,
  submitFinalArticleDelivery,
} from '../services/article-delivery.service.js';
import {
  listProviderNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notification.service.js';
import {
  listWebsiteOrdersForProvider,
  getWebsiteOrder,
  providerClaimWebsiteOrder,
  providerSubmitWebsiteDelivery,
} from '../services/website.service.js';

import { loadProviderOnboardingOptions } from '../lib/provider-onboarding-config.js';

export function registerProviderRoutes(app: Express) {
  app.get('/api/provider/onboarding-options', async (_req, res) => {
    res.json(loadProviderOnboardingOptions());
  });

  app.get('/api/provider/assets', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : '';
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    res.json({ assets: await listProviderAssets(providerId) });
  });

  app.post('/api/provider/assets', async (req, res) => {
    const { providerId, title, type, url, note } = req.body ?? {};
    if (!providerId || !title || !url) return res.status(400).json({ error: '缺少必填字段' });
    res.status(201).json({ asset: await addProviderAsset(providerId, { title, type, url, note }) });
  });

  app.delete('/api/provider/assets/:id', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : '';
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    try {
      await deleteProviderAsset(providerId, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '删除失败' });
    }
  });

  app.get('/api/provider/dashboard', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : '';
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    const dashboard = await getProviderDashboard(providerId);
    if (!dashboard) return res.status(404).json({ error: '接单方不存在' });
    res.json(dashboard);
  });

  app.get('/api/provider/earnings', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : '';
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    res.json(await getProviderEarnings(providerId));
  });

  app.get('/api/provider/profile', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : '';
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    const provider = await getProvider(providerId);
    if (!provider) return res.status(404).json({ error: '接单方不存在' });
    res.json({ provider });
  });

  app.post('/api/provider/profile', async (req, res) => {
    const { providerId, ...data } = req.body ?? {};
    const provider = await upsertProviderProfile(providerId ?? null, data);
    res.json({ provider });
  });

  app.get('/api/provider/applications', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : '';
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    res.json({ applications: await listProviderApplications(providerId) });
  });

  app.post('/api/provider/applications/withdraw', async (req, res) => {
    const { providerId } = req.body ?? {};
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    try {
      res.json({ provider: await withdrawProviderApplication(providerId) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '撤回失败' });
    }
  });

  app.post('/api/provider/applications/submit', async (req, res) => {
    const { providerId } = req.body ?? {};
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    try {
      res.json({ provider: await submitProviderApplication(providerId) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '提交失败' });
    }
  });

  app.get('/api/provider/notifications', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : '';
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    const unreadOnly = req.query.unread === 'true';
    const [notifications, unreadCount] = await Promise.all([
      listProviderNotifications(providerId, unreadOnly),
      countUnreadNotifications(providerId),
    ]);
    res.json({ notifications, unreadCount });
  });

  app.post('/api/provider/notifications/:id/read', async (req, res) => {
    const providerId = typeof req.body?.providerId === 'string' ? req.body.providerId : '';
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    try {
      res.json({ notification: await markNotificationRead(req.params.id, providerId) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '操作失败' });
    }
  });

  app.post('/api/provider/notifications/read-all', async (req, res) => {
    const { providerId } = req.body ?? {};
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    res.json(await markAllNotificationsRead(providerId));
  });

  app.get('/api/provider/pricing-rules', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : '';
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    res.json({ rules: await listProviderPricingRules(providerId) });
  });

  app.post('/api/provider/pricing-rules', async (req, res) => {
    const { providerId, id, taskType, minBudget, maxBudget, note } = req.body ?? {};
    if (!providerId || !taskType) return res.status(400).json({ error: '缺少必填字段' });
    res.json({
      rule: await upsertProviderPricingRule(providerId, {
        id,
        taskType,
        minBudget: minBudget !== undefined ? Number(minBudget) : undefined,
        maxBudget: maxBudget !== undefined ? Number(maxBudget) : undefined,
        note,
      }),
    });
  });

  app.delete('/api/provider/pricing-rules/:id', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : '';
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    try {
      await deleteProviderPricingRule(providerId, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '删除失败' });
    }
  });

  app.get('/api/provider/task-marketplace', async (req, res) => {
    const { platform, type, minBudget, providerId, industry, city, deadlineBefore } = req.query;
    const tasks = await listTaskMarketplace({
      platform: typeof platform === 'string' ? platform : undefined,
      type: typeof type === 'string' ? type : undefined,
      minBudget: minBudget ? Number(minBudget) : undefined,
      industry: typeof industry === 'string' ? industry : undefined,
      city: typeof city === 'string' ? city : undefined,
      deadlineBefore: typeof deadlineBefore === 'string' ? deadlineBefore : undefined,
      providerId: typeof providerId === 'string' ? providerId : undefined,
    });
    res.json({ tasks });
  });

  app.get('/api/provider/task-marketplace/:id', async (req, res) => {
    const order = await getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: '任务不存在' });
    const slots = await resolveMarketplaceSlots(order);
    res.json({ task: { ...order, ...slots } });
  });

  app.post('/api/provider/task-orders/:id/apply', async (req, res) => {
    const { providerId, providerName, message } = req.body ?? {};
    if (!providerId || !providerName) return res.status(400).json({ error: '缺少接单方信息' });
    try {
      const application = await applyToTaskOrder(req.params.id, providerId, providerName, message);
      res.status(201).json({ application });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '申请失败' });
    }
  });

  app.post('/api/provider/task-orders/:id/claim', async (req, res) => {
    const { providerId, providerName, message } = req.body ?? {};
    if (!providerId || !providerName) return res.status(400).json({ error: '缺少接单方信息' });
    try {
      const order = await claimTaskOrder(req.params.id, providerId, providerName, message);
      res.json({ order });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '领取失败' });
    }
  });

  app.post('/api/provider/applications/:id/confirm', async (req, res) => {
    try {
      res.json({ order: await confirmApplication(req.params.id) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '确认失败' });
    }
  });

  app.get('/api/provider/orders', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : '';
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    if (page || pageSize) {
      return res.json(
        await listProviderOrdersPaginated(providerId, status, page ?? 1, pageSize ?? 20)
      );
    }
    const orders = await listProviderOrders(providerId, status);
    res.json({ orders, total: orders.length, page: 1, pageSize: orders.length, hasMore: false });
  });

  app.get('/api/provider/orders/:id', async (req, res) => {
    const order = await getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ order });
  });

  app.post('/api/provider/orders/:id/disputes', async (req, res) => {
    const { reason, providerId } = req.body ?? {};
    if (!reason) return res.status(400).json({ error: '请填写争议说明' });
    res.json({ order: await openDispute(req.params.id, reason, providerId ?? 'provider') });
  });

  app.post('/api/provider/orders/:id/revision-response', async (req, res) => {
    const { response } = req.body ?? {};
    if (!response) return res.status(400).json({ error: '请填写返修说明' });
    try {
      res.json({ order: await submitRevisionResponse(req.params.id, response) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '提交失败' });
    }
  });

  app.post('/api/provider/orders/:id/deliver', async (req, res) => {
    const { content, link, attachments, stage } = req.body ?? {};
    if (!content) return res.status(400).json({ error: '请提交交付内容' });
    try {
      const order = await getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: '订单不存在' });

      if (isArticleContentOrder(order)) {
        if (stage === 'draft') {
          return res.json({ order: await submitArticleDraft(req.params.id, content, attachments) });
        }
        if (stage === 'final') {
          return res.json({
            order: await submitFinalArticleDelivery(req.params.id, content, link, attachments),
          });
        }
        return res.status(400).json({
          error: '文章类任务请指定 stage：draft（提交草稿）或 final（提交发布交付）',
        });
      }

      res.json({
        order: await submitDelivery(req.params.id, content, link, attachments, 'submitted'),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '提交失败' });
    }
  });

  // Legacy paths kept for compatibility
  app.get('/api/provider/tasks', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : undefined;
    const tasks = await listTaskMarketplace({ providerId });
    res.json({ tasks });
  });

  app.get('/api/provider/website-orders', async (req, res) => {
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : '';
    if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
    res.json({ orders: await listWebsiteOrdersForProvider(providerId) });
  });

  app.get('/api/provider/website-orders/:id', async (req, res) => {
    const order = await getWebsiteOrder(req.params.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ order });
  });

  app.post('/api/provider/website-orders/:id/claim', async (req, res) => {
    const { providerId, providerName } = req.body ?? {};
    if (!providerId || !providerName) return res.status(400).json({ error: '缺少接单方信息' });
    try {
      res.json({ order: await providerClaimWebsiteOrder(req.params.id, providerId, providerName) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '认领失败' });
    }
  });

  app.post('/api/provider/website-orders/:id/deliver', async (req, res) => {
    const { providerId, previewUrl, deliveryNote } = req.body ?? {};
    if (!providerId || !previewUrl) return res.status(400).json({ error: '缺少交付信息' });
    try {
      res.json({
        order: await providerSubmitWebsiteDelivery(req.params.id, providerId, previewUrl, deliveryNote),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '提交失败' });
    }
  });

  app.post('/api/provider/orders/:id/accept', async (req, res) => {
    const { providerId, providerName, message } = req.body ?? {};
    if (!providerId || !providerName) return res.status(400).json({ error: '缺少接单方信息' });
    try {
      const order = await claimTaskOrder(req.params.id, providerId, providerName, message);
      res.json({ order });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '领取失败' });
    }
  });
}

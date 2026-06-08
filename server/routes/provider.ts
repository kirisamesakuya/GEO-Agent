import type { Express } from 'express';
import { requireProviderId, requireProviderIdentity, resolveOptionalProviderId } from '../middleware/require-provider.js';
import {
  getProvider,
  listProviders,
  getProviderDashboard,
  upsertProviderProfile,
  updateProviderPayoutAccount,
  verifyProviderIdentity,
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
import {
  createWithdrawalRequest,
  listWithdrawalRequests,
} from '../services/withdrawal.service.js';
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

/**
 * DEMO_ONLY:
 * 当前 providerId 多由前端 query/body 传入，用于快速演示接单方身份。
 *
 * PRODUCTION_TODO:
 * 真实产品中 providerId 必须由登录态解析；前端应优先调用 /api/provider/me。
 */
export function registerProviderRoutes(app: Express) {
  app.get('/api/provider/onboarding-options', async (_req, res) => {
    const base = loadProviderOnboardingOptions();
    const { getLobbyPlatformLabels } = await import('../services/media-platform-catalog.service.js');
    const mediaPlatforms = await getLobbyPlatformLabels();
    res.json({
      ...base,
      mediaPlatforms: mediaPlatforms.length ? mediaPlatforms : base.mediaPlatforms,
    });
  });

  app.get('/api/provider/assets', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    res.json({ assets: await listProviderAssets(providerId) });
  });

  app.post('/api/provider/assets', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const { title, type, url, note } = req.body ?? {};
    if (!title || !url) return res.status(400).json({ error: '缺少必填字段' });
    res.status(201).json({ asset: await addProviderAsset(providerId, { title, type, url, note }) });
  });

  app.delete('/api/provider/assets/:id', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    try {
      await deleteProviderAsset(providerId, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '删除失败' });
    }
  });

  app.get('/api/provider/dashboard', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const dashboard = await getProviderDashboard(providerId);
    if (!dashboard) return res.status(404).json({ error: '接单方不存在' });
    res.json(dashboard);
  });

  app.get('/api/provider/earnings', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    res.json(await getProviderEarnings(providerId));
  });

  app.get('/api/provider/withdrawals', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ requests: await listWithdrawalRequests({ providerId, status }) });
  });

  app.post('/api/provider/withdrawals', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const { amount, channel, channelLabel } = req.body ?? {};
    if (amount === undefined || !channel) {
      return res.status(400).json({ error: '缺少 amount 或 channel' });
    }
    try {
      const request = await createWithdrawalRequest({
        providerId,
        amount: Number(amount),
        channel,
        channelLabel,
      });
      res.status(201).json({ request });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '提现申请失败' });
    }
  });

  app.get('/api/provider/profile', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const provider = await getProvider(providerId);
    if (!provider) return res.status(404).json({ error: '接单方不存在' });
    res.json({ provider });
  });

  app.post('/api/provider/profile', async (req, res) => {
    const { providerId: rawId, ...data } = req.body ?? {};
    let providerId: string | null = rawId ?? null;
    if (providerId) {
      const scoped = requireProviderId(req, res);
      if (!scoped) return;
      providerId = scoped;
    }
    const provider = await upsertProviderProfile(providerId, data);
    res.json({ provider });
  });

  app.post('/api/provider/identity-verify', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const { realName, idNumber } = req.body ?? {};
    try {
      const provider = await verifyProviderIdentity(providerId, {
        realName: String(realName ?? ''),
        idNumber: String(idNumber ?? ''),
      });
      res.json({ provider });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '认证失败' });
    }
  });

  app.put('/api/provider/payout-account', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const { payoutChannel, payoutAccountName, payoutAccountLabel } = req.body ?? {};
    try {
      const provider = await updateProviderPayoutAccount(providerId, {
        payoutChannel: String(payoutChannel ?? ''),
        payoutAccountName: String(payoutAccountName ?? ''),
        payoutAccountLabel: String(payoutAccountLabel ?? ''),
      });
      res.json({ provider });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '保存失败' });
    }
  });

  app.get('/api/provider/applications', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    res.json({ applications: await listProviderApplications(providerId) });
  });

  app.post('/api/provider/applications/withdraw', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    try {
      res.json({ provider: await withdrawProviderApplication(providerId) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '撤回失败' });
    }
  });

  app.post('/api/provider/applications/submit', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    try {
      res.json({ provider: await submitProviderApplication(providerId) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '提交失败' });
    }
  });

  app.get('/api/provider/notifications', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const unreadOnly = req.query.unread === 'true';
    const [notifications, unreadCount] = await Promise.all([
      listProviderNotifications(providerId, unreadOnly),
      countUnreadNotifications(providerId),
    ]);
    res.json({ notifications, unreadCount });
  });

  app.post('/api/provider/notifications/:id/read', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    try {
      res.json({ notification: await markNotificationRead(req.params.id, providerId) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '操作失败' });
    }
  });

  app.post('/api/provider/notifications/read-all', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    res.json(await markAllNotificationsRead(providerId));
  });

  app.get('/api/provider/pricing-rules', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    res.json({ rules: await listProviderPricingRules(providerId) });
  });

  app.post('/api/provider/pricing-rules', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const { id, taskType, minBudget, maxBudget, note } = req.body ?? {};
    if (!taskType) return res.status(400).json({ error: '缺少必填字段' });
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
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    try {
      await deleteProviderPricingRule(providerId, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '删除失败' });
    }
  });

  app.get('/api/provider/task-marketplace', async (req, res) => {
    const { platform, type, minBudget, industry, city, deadlineBefore } = req.query;
    const providerId = resolveOptionalProviderId(req, res);
    if (providerId === null) return;
    const tasks = await listTaskMarketplace({
      platform: typeof platform === 'string' ? platform : undefined,
      type: typeof type === 'string' ? type : undefined,
      minBudget: minBudget ? Number(minBudget) : undefined,
      industry: typeof industry === 'string' ? industry : undefined,
      city: typeof city === 'string' ? city : undefined,
      deadlineBefore: typeof deadlineBefore === 'string' ? deadlineBefore : undefined,
      providerId,
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
    const identity = await requireProviderIdentity(req, res);
    if (!identity) return;
    const { message } = req.body ?? {};
    try {
      const application = await applyToTaskOrder(
        req.params.id,
        identity.providerId,
        identity.providerName,
        message
      );
      res.status(201).json({ application });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '申请失败' });
    }
  });

  app.post('/api/provider/task-orders/:id/claim', async (req, res) => {
    const identity = await requireProviderIdentity(req, res);
    if (!identity) return;
    const { message } = req.body ?? {};
    try {
      const order = await claimTaskOrder(
        req.params.id,
        identity.providerId,
        identity.providerName,
        message
      );
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
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
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
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const { reason } = req.body ?? {};
    if (!reason) return res.status(400).json({ error: '请填写争议说明' });
    res.json({ order: await openDispute(req.params.id, reason, providerId) });
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
    const providerId = resolveOptionalProviderId(req, res);
    if (providerId === null) return;
    const tasks = await listTaskMarketplace({ providerId });
    res.json({ tasks });
  });

  app.get('/api/provider/website-orders', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    res.json({ orders: await listWebsiteOrdersForProvider(providerId) });
  });

  app.get('/api/provider/website-orders/:id', async (req, res) => {
    const order = await getWebsiteOrder(req.params.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ order });
  });

  app.post('/api/provider/website-orders/:id/claim', async (req, res) => {
    const identity = await requireProviderIdentity(req, res);
    if (!identity) return;
    try {
      res.json({
        order: await providerClaimWebsiteOrder(
          req.params.id,
          identity.providerId,
          identity.providerName
        ),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '认领失败' });
    }
  });

  app.post('/api/provider/website-orders/:id/deliver', async (req, res) => {
    const providerId = requireProviderId(req, res);
    if (!providerId) return;
    const { previewUrl, deliveryNote } = req.body ?? {};
    if (!previewUrl) return res.status(400).json({ error: '缺少交付信息' });
    try {
      res.json({
        order: await providerSubmitWebsiteDelivery(req.params.id, providerId, previewUrl, deliveryNote),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '提交失败' });
    }
  });

  app.post('/api/provider/orders/:id/accept', async (req, res) => {
    const identity = await requireProviderIdentity(req, res);
    if (!identity) return;
    const { message } = req.body ?? {};
    try {
      const order = await claimTaskOrder(
        req.params.id,
        identity.providerId,
        identity.providerName,
        message
      );
      res.json({ order });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '领取失败' });
    }
  });
}

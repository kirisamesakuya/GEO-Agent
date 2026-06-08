import type { Express } from 'express';
import { formatWebsiteLeadGoal } from '../../lib/website-lead-intake.js';
import {
  listAgentTasksPaginated,
  getAgentTaskPlatformDetail,
} from '../services/agent-task.service.js';
import { listAuditLogs } from '../services/audit.service.js';
import { listAllOrders, listAllOrdersPaginated, getOrder } from '../services/order.service.js';
import {
  createWebsiteRequest,
  listWebsiteOrders,
  getWebsiteOrder,
  assignWebsiteOrder,
  updateWebsiteOrder,
  deleteWebsiteOrder,
  updateWebsiteOrderStatus,
  submitWebsiteDelivery,
  requestWebsiteRevision,
  completeWebsiteOrder,
  listWebsiteRequests,
  getWebsiteRequest,
  updateWebsiteRequest,
  deleteWebsiteRequest,
  confirmWebsiteOrder,
  platformDeliverWebsiteOrder,
} from '../services/website.service.js';
import { reviewProviderApplication, confirmApplication } from '../services/provider.service.js';
import {
  getPlatformDashboard,
  listPendingProviderApplications,
  assignTaskOrder,
  reassignTaskOrder,
  releaseTaskOrderToMarketplace,
  getTaskOrderReassignPreview,
  updateOrderStatus,
  resolveDispute,
  listAgentSkillRuns,
  listLocalAutomationRuns,
  flagAgentTaskForReview,
  listAllBudgetLedgers,
  listAllAiCredits,
  listPendingOrderApplications,
  getSystemConfigs,
  upsertSystemConfig,
  listSystemConfigVersions,
  listPlatformMerchants,
  setMerchantStatus,
  getMerchantDetail,
  listPlatformContentGovernance,
  listPlatformRiskTickets,
  listProviderResourcesForReview,
  reviewProviderPlatformResource,
  listPlatformMembers,
  listPlatformRankingOps,
  getPlatformRankingPlanDetail,
  listPlatformFulfillmentRatings,
  getPlatformFulfillmentDetail,
  listPlatformNotifications,
  listPlatformSettlementBatches,
  listPlatformReports,
} from '../services/platform.service.js';
import {
  listOrganizationCertificationsForPlatform,
  reviewOrganizationCertification,
} from '../services/organization-cert.service.js';
import { listAllProvidersForPlatform } from '../services/provider.service.js';
import {
  ROLE_PERMISSIONS,
  PLATFORM_ROLE_LABELS,
  getPlatformRoleFromRequest,
} from '../lib/platform-auth.js';
import {
  requirePlatformPermission,
  requirePlatformRole,
} from '../middleware/require-platform.js';
import { advanceSettlement } from '../services/settlement.service.js';
import {
  listDepositRequests,
  approveDepositRequest,
  rejectDepositRequest,
  platformAdjustBudget,
  listPlatformPublisherAccounts,
  getPlatformPublisherAccountDetail,
} from '../services/budget.service.js';
import { addAiCredits } from '../services/ai-credits.service.js';
import {
  listWithdrawalRequestsWithWallet,
  listPlatformProviderAccounts,
  getWithdrawalRequestStats,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  markWithdrawalPaid,
} from '../services/withdrawal.service.js';
import {
  listPlatformUsers,
  getPlatformUserDetail,
  updateUserStatus,
} from '../services/user-admin.service.js';
import { cancelAgentTask, retryAgentTask } from '../agent/worker.js';
import { enqueueAgentTask } from '../agent/worker.js';

export function registerPlatformRoutes(app: Express) {
  const publicPaths = new Set(['/role-permissions', '/role-switch']);
  app.use('/api/platform', (req, res, next) => {
    if (publicPaths.has(req.path)) return next();
    const role = requirePlatformRole(req, res);
    if (!role) return;
    next();
  });

  app.get('/api/platform/role-permissions', async (_req, res) => {
    res.json({ roles: PLATFORM_ROLE_LABELS, permissions: ROLE_PERMISSIONS });
  });

  app.get('/api/platform/providers', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'providers')) return;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ providers: await listAllProvidersForPlatform(status) });
  });

  app.get('/api/platform/dashboard', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'dashboard')) return;
    res.json(await getPlatformDashboard());
  });

  app.get('/api/platform/stats', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'dashboard')) return;
    res.json(await getPlatformDashboard());
  });

  app.get('/api/platform/agent-tasks', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'agents')) return;
    const { type, status, needsReview, reviewCategory, page, pageSize } = req.query;
    res.json(
      await listAgentTasksPaginated({
        type: typeof type === 'string' ? type : undefined,
        status: typeof status === 'string' ? status : undefined,
        needsReview: needsReview === 'true' ? true : undefined,
        reviewCategory: typeof reviewCategory === 'string' ? reviewCategory : undefined,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 30,
      })
    );
  });

  app.get('/api/platform/agent-tasks/:id', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'agents')) return;
    const detail = await getAgentTaskPlatformDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: '任务不存在' });
    res.json(detail);
  });

  app.post('/api/platform/agent-tasks/:id/retry', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'agents')) return;
    const task = await retryAgentTask(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    void enqueueAgentTask(task);
    res.json({ task });
  });

  app.post('/api/platform/agent-tasks/:id/cancel', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'agents')) return;
    const task = await cancelAgentTask(req.params.id);
    if (!task) return res.status(404).json({ error: '任务不存在' });
    res.json({ task });
  });

  app.get('/api/platform/agent-skill-runs', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'agents')) return;
    res.json({ runs: await listAgentSkillRuns() });
  });

  app.get('/api/platform/local-automation-runs', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'hermes')) return;
    res.json({ runs: await listLocalAutomationRuns() });
  });

  app.post('/api/platform/agent-tasks/:id/manual-flag', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'agent.review')) return;
    const { reason, category } = req.body ?? {};
    if (!reason) return res.status(400).json({ error: '请填写原因' });
    const valid = ['need_reauth', 'need_manual_publish', 'retry_ok', null, undefined];
    if (category !== undefined && !valid.includes(category)) {
      return res.status(400).json({ error: '无效的 reviewCategory' });
    }
    await flagAgentTaskForReview(req.params.id, reason, category ?? null);
    res.json({ success: true });
  });

  app.get('/api/platform/order-applications', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'applications')) return;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const providerName =
      typeof req.query.providerName === 'string' ? req.query.providerName : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const result = await listPendingOrderApplications({ platform, providerName, page, pageSize });
    if (Array.isArray(result)) {
      res.json({ applications: result, total: result.length, page: 1, pageSize: result.length, hasMore: false });
    } else {
      res.json(result);
    }
  });

  app.post('/api/platform/order-applications/:id/confirm', async (req, res) => {
    try {
      res.json({ order: await confirmApplication(req.params.id) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '确认失败' });
    }
  });

  app.get('/api/platform/budget-ledgers', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds')) return;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const anomaly = req.query.anomaly === 'true';
    const { listPlatformBudgetLedgers } = await import('../services/budget.service.js');
    res.json({ ledger: await listPlatformBudgetLedgers({ type, anomaly }) });
  });

  app.get('/api/platform/publisher-accounts', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds')) return;
    const str = (key: string) => (typeof req.query[key] === 'string' ? String(req.query[key]) : undefined);
    const accounts = await listPlatformPublisherAccounts({
      q: str('q'),
      brandName: str('brandName'),
      organizationName: str('organizationName'),
      ownerName: str('ownerName'),
      ownerPhone: str('ownerPhone'),
      ownerUserNo: str('ownerUserNo'),
      brandStatus: str('brandStatus'),
      anomalyOnly: req.query.anomaly === 'true',
    });
    const stats = {
      total: accounts.length,
      totalBalance: accounts.reduce((s, a) => s + a.balance, 0),
      totalFrozen: accounts.reduce((s, a) => s + a.frozen, 0),
      anomaly: accounts.filter((a) => a.anomaly).length,
    };
    res.json({ accounts, stats });
  });

  app.get('/api/platform/publisher-accounts/:brandName', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds')) return;
    try {
      res.json(await getPlatformPublisherAccountDetail(decodeURIComponent(req.params.brandName)));
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : '账户不存在' });
    }
  });

  app.get('/api/platform/ai-credits', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds')) return;
    res.json({ credits: await listAllAiCredits() });
  });

  app.get('/api/platform/task-orders', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'orders')) return;
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 30;
    res.json(await listAllOrdersPaginated(page, pageSize));
  });

  app.get('/api/platform/task-orders/:id', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'orders')) return;
    const order = await getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ order });
  });

  app.get('/api/platform/task-orders/:id/reassign-preview', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'orders.reassign')) return;
    const preview = await getTaskOrderReassignPreview(req.params.id);
    if (!preview) return res.status(404).json({ error: '订单不存在' });
    res.json({ preview });
  });

  app.post('/api/platform/task-orders/:id/assign', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'orders.assign')) return;
    const { providerId, providerName, reason } = req.body ?? {};
    if (!providerId || !providerName) return res.status(400).json({ error: '缺少接单方' });
    res.json({ order: await assignTaskOrder(req.params.id, providerId, providerName, reason) });
  });

  app.post('/api/platform/task-orders/:id/reassign', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'orders.reassign')) return;
    const { providerId, providerName, reason } = req.body ?? {};
    if (!providerId || !providerName || !reason) {
      return res.status(400).json({ error: '缺少接单方或改派原因' });
    }
    try {
      res.json(await reassignTaskOrder(req.params.id, providerId, providerName, reason));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '改派失败' });
    }
  });

  app.post('/api/platform/task-orders/:id/release', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'orders.reassign')) return;
    const { reason } = req.body ?? {};
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: '请填写释放原因' });
    }
    try {
      res.json(await releaseTaskOrderToMarketplace(req.params.id, String(reason)));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '释放失败' });
    }
  });

  app.post('/api/platform/task-orders/:id/settlement', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'settlement.write')) return;
    const { status, note, operatorId } = req.body ?? {};
    if (!status || !['pending_platform', 'pending_offline', 'settled'].includes(status)) {
      return res.status(400).json({ error: '无效的结算状态' });
    }
    try {
      res.json({
        settlement: await advanceSettlement(
          req.params.id,
          status,
          note,
          operatorId ?? 'platform'
        ),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '更新失败' });
    }
  });

  app.post('/api/platform/task-orders/:id/status', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'orders')) return;
    const { status, reason } = req.body ?? {};
    if (!status || !reason) return res.status(400).json({ error: '缺少状态或原因' });
    res.json({ order: await updateOrderStatus(req.params.id, status, reason) });
  });

  app.post('/api/platform/task-orders/:id/revision', async (req, res) => {
    const { reason } = req.body ?? {};
    try {
      const { requestRevision } = await import('../services/order.service.js');
      res.json({ order: await requestRevision(req.params.id, reason ?? '', 'platform') });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '返修失败' });
    }
  });

  app.post('/api/platform/task-orders/:id/dispute-resolve', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'orders')) return;
    const { conclusion } = req.body ?? {};
    if (!conclusion) return res.status(400).json({ error: '请填写结论' });
    res.json({ order: await resolveDispute(req.params.id, conclusion) });
  });

  app.get('/api/platform/website-requests', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ requests: await listWebsiteRequests({ brandName, status }) });
  });

  app.post('/api/platform/website-requests', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    const { brandName, pageType, referenceUrl, keywords, contact, notes, modules } = req.body ?? {};
    if (!brandName || !pageType || !keywords || !contact) {
      return res.status(400).json({ error: '请填写品牌、页面类型、目标关键词与联系方式' });
    }
    try {
      const trimmedKeywords = String(keywords).trim();
      const trimmedContact = String(contact).trim();
      const trimmedNotes = notes ? String(notes).trim() : '';
      const request = await createWebsiteRequest({
        brandName: String(brandName).trim(),
        pageType: String(pageType).trim(),
        goal: formatWebsiteLeadGoal({
          keywords: trimmedKeywords,
          notes: trimmedNotes,
          contact: trimmedContact,
        }),
        referenceUrl: referenceUrl ? String(referenceUrl).trim() : undefined,
        keywords: trimmedKeywords,
        contact: trimmedContact,
        notes: trimmedNotes || undefined,
        modules: Array.isArray(modules) ? modules.map(String) : ['平台录入'],
      });
      res.status(201).json({ request });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '创建失败' });
    }
  });

  app.get('/api/platform/website-requests/:id', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    const request = await getWebsiteRequest(req.params.id);
    if (!request) return res.status(404).json({ error: '需求不存在' });
    res.json({ request });
  });

  app.patch('/api/platform/website-requests/:id', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    try {
      const request = await updateWebsiteRequest(req.params.id, req.body ?? {});
      res.json({ request });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '更新失败' });
    }
  });

  app.delete('/api/platform/website-requests/:id', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    try {
      await deleteWebsiteRequest(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '删除失败' });
    }
  });

  app.post('/api/platform/website-requests/:id/create-order', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    try {
      res.json({ order: await confirmWebsiteOrder(req.params.id) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '创建失败' });
    }
  });

  app.get('/api/platform/website-orders', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    res.json({ orders: await listWebsiteOrders() });
  });

  app.get('/api/platform/website-orders/:id', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    const order = await getWebsiteOrder(req.params.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ order });
  });

  app.patch('/api/platform/website-orders/:id', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    try {
      res.json({ order: await updateWebsiteOrder(req.params.id, req.body ?? {}) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '更新失败' });
    }
  });

  app.delete('/api/platform/website-orders/:id', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    try {
      await deleteWebsiteOrder(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '删除失败' });
    }
  });

  app.post('/api/platform/website-orders/:id/assign', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    const { assigneeId, assigneeName, reason } = req.body ?? {};
    if (!assigneeId || !assigneeName) return res.status(400).json({ error: '缺少指派人员' });
    res.json({ order: await assignWebsiteOrder(req.params.id, assigneeId, assigneeName, reason) });
  });

  app.post('/api/platform/website-orders/:id/status', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    const { status, reason } = req.body ?? {};
    if (!status || !reason) return res.status(400).json({ error: '缺少状态或原因' });
    res.json({ order: await updateWebsiteOrderStatus(req.params.id, status, reason) });
  });

  app.post('/api/platform/website-orders/:id/delivery', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    const { previewUrl, deliveryNote } = req.body ?? {};
    try {
      res.json({ order: await submitWebsiteDelivery(req.params.id, previewUrl, deliveryNote) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '提交失败' });
    }
  });

  app.post('/api/platform/website-orders/:id/offline-deliver', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    const { previewUrl, deliveryNote } = req.body ?? {};
    try {
      res.json({
        order: await platformDeliverWebsiteOrder(req.params.id, {
          previewUrl: String(previewUrl ?? ''),
          deliveryNote: deliveryNote ? String(deliveryNote) : undefined,
        }),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '交付失败' });
    }
  });

  app.post('/api/platform/website-orders/:id/revision', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    const { reason } = req.body ?? {};
    try {
      res.json({ order: await requestWebsiteRevision(req.params.id, reason ?? '') });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '返修失败' });
    }
  });

  app.post('/api/platform/website-orders/:id/complete', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'website')) return;
    const { reason } = req.body ?? {};
    res.json({ order: await completeWebsiteOrder(req.params.id, reason) });
  });

  app.get('/api/platform/merchants', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'merchants')) return;
    res.json({ merchants: await listPlatformMerchants() });
  });

  app.get('/api/platform/merchants/:brandName', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'merchants')) return;
    const detail = await getMerchantDetail(decodeURIComponent(req.params.brandName));
    if (!detail) return res.status(404).json({ error: '商家不存在' });
    res.json(detail);
  });

  app.post('/api/platform/merchants/:brandName/status', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'merchant.disable')) return;
    const { status, reason } = req.body ?? {};
    if ((status !== 'active' && status !== 'disabled') || !reason) {
      return res.status(400).json({ error: '缺少状态或原因' });
    }
    try {
      res.json({ brand: await setMerchantStatus(decodeURIComponent(req.params.brandName), status, reason) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '操作失败' });
    }
  });

  app.get('/api/platform/organization-certifications', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'org_certs')) return;
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    const organizations = await listOrganizationCertificationsForPlatform(status);
    res.json({ organizations });
  });

  app.post('/api/platform/organization-certifications/:id/review', async (req, res) => {
    const role = requirePlatformPermission(req, res, 'merchants');
    if (!role) return;
    const { action, note } = req.body ?? {};
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: '无效操作' });
    }
    try {
      const organization = await reviewOrganizationCertification(req.params.id, action, note);
      res.json({ organization });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '审核失败' });
    }
  });

  app.get('/api/platform/provider-applications', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'providers')) return;
    res.json({ providers: await listPendingProviderApplications() });
  });

  app.post('/api/platform/provider-applications/:id/review', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'providers')) return;
    const { action, note } = req.body ?? {};
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: '无效操作' });
    }
    res.json({ provider: await reviewProviderApplication(req.params.id, action, note) });
  });

  app.get('/api/platform/audit-logs', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'audit')) return;
    const { action, entity, limit, since, until, page, pageSize, source } = req.query;
    res.json(
      await listAuditLogs({
        action: typeof action === 'string' ? action : undefined,
        entity: typeof entity === 'string' ? entity : undefined,
        source: typeof source === 'string' ? source : undefined,
        since: typeof since === 'string' ? since : undefined,
        until: typeof until === 'string' ? until : undefined,
        limit: limit ? Number(limit) : undefined,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 50,
      })
    );
  });

  app.post('/api/platform/role-switch', async (req, res) => {
    const { role, previousRole } = req.body ?? {};
    if (!role) return res.status(400).json({ error: '缺少 role' });
    const { appendAuditLog } = await import('../services/audit.service.js');
    await appendAuditLog({
      action: 'platform_role_switch',
      entity: 'PlatformSession',
      detail: `${previousRole ?? 'unknown'}→${role}`,
      source: 'platform',
    });
    res.json({ ok: true });
  });

  app.post('/api/platform/budget-adjust', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds.adjust')) return;
    const { brandName, amount, reason } = req.body ?? {};
    if (!brandName || amount === undefined || !reason) {
      return res.status(400).json({ error: '缺少品牌、金额或原因' });
    }
    try {
      res.json({ account: await platformAdjustBudget(brandName, Number(amount), reason) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '调整失败' });
    }
  });

  app.post('/api/platform/ai-credits/adjust', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds.adjust')) return;
    const { brandName, amount, reason } = req.body ?? {};
    if (!brandName || amount === undefined || !reason) {
      return res.status(400).json({ error: '缺少品牌、点数或原因' });
    }
    const credits = await addAiCredits(brandName, Number(amount), `平台调整: ${reason}`);
    const { appendAuditLog } = await import('../services/audit.service.js');
    await appendAuditLog({
      action: 'platform_ai_credits_adjust',
      entity: 'AiCredits',
      entityId: brandName,
      detail: `${amount}:${reason}`,
      source: 'platform',
    });
    res.json({ credits });
  });

  app.get('/api/platform/deposit-requests', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds.deposit')) return;
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    res.json({
      requests: await listDepositRequests(
        brandName,
        status === 'all' ? undefined : status || undefined
      ),
    });
  });

  app.post('/api/platform/deposit-requests/:id/approve', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds.deposit')) return;
    try {
      res.json({ request: await approveDepositRequest(req.params.id) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '审批失败' });
    }
  });

  app.post('/api/platform/deposit-requests/:id/reject', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds.deposit')) return;
    const { reason } = req.body ?? {};
    res.json({ request: await rejectDepositRequest(req.params.id, reason) });
  });

  app.get('/api/platform/provider-accounts', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds')) return;
    const providerName = typeof req.query.providerName === 'string' ? req.query.providerName : undefined;
    const payoutBound =
      req.query.payoutBound === 'yes' || req.query.payoutBound === 'no'
        ? req.query.payoutBound
        : undefined;
    const accounts = await listPlatformProviderAccounts({ providerName, payoutBound });
    const stats = {
      total: accounts.length,
      totalExtractable: accounts.reduce((s, a) => s + a.extractable, 0),
      totalFrozen: accounts.reduce((s, a) => s + a.frozen, 0),
      totalWithdrawn: accounts.reduce((s, a) => s + a.withdrawn, 0),
      missingPayout: accounts.filter((a) => !a.hasPayoutAccount).length,
      pendingWithdrawal: accounts.reduce((s, a) => s + a.pendingWithdrawal, 0),
    };
    res.json({ accounts, stats });
  });

  app.get('/api/platform/withdrawal-requests/stats', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds.deposit')) return;
    res.json({ stats: await getWithdrawalRequestStats() });
  });

  app.get('/api/platform/withdrawal-requests', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds.deposit')) return;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const providerName = typeof req.query.providerName === 'string' ? req.query.providerName : undefined;
    res.json({
      requests: await listWithdrawalRequestsWithWallet({ status, providerName, limit: 100 }),
    });
  });

  app.post('/api/platform/withdrawal-requests/:id/approve', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds.deposit')) return;
    const role = getPlatformRoleFromRequest(req);
    try {
      res.json({
        request: await approveWithdrawalRequest(req.params.id, role ?? undefined),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '审批失败' });
    }
  });

  app.post('/api/platform/withdrawal-requests/:id/reject', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds.deposit')) return;
    const { reason } = req.body ?? {};
    const role = getPlatformRoleFromRequest(req);
    try {
      res.json({
        request: await rejectWithdrawalRequest(req.params.id, reason, role ?? undefined),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '驳回失败' });
    }
  });

  app.post('/api/platform/withdrawal-requests/:id/mark-paid', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'funds.deposit')) return;
    const role = getPlatformRoleFromRequest(req);
    const { paidNote, paidVoucher } = req.body ?? {};
    try {
      res.json({
        request: await markWithdrawalPaid(req.params.id, role ?? undefined, {
          paidNote: paidNote ? String(paidNote) : undefined,
          paidVoucher: paidVoucher ? String(paidVoucher) : undefined,
        }),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '标记打款失败' });
    }
  });

  app.get('/api/platform/users', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'users')) return;
    const str = (key: string) => (typeof req.query[key] === 'string' ? String(req.query[key]) : undefined);
    const userType = str('userType');
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 30;
    res.json(
      await listPlatformUsers({
        q: str('q'),
        userNo: str('userNo'),
        phone: str('phone'),
        displayName: str('displayName'),
        organizationName: str('organizationName'),
        certStatus: str('certStatus'),
        userType: userType as 'publisher' | 'provider' | 'platform' | undefined,
        accountType: str('accountType') as 'personal' | 'enterprise' | undefined,
        status: str('status'),
        page,
        pageSize,
      })
    );
  });

  app.get('/api/platform/users/:id', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'users')) return;
    try {
      res.json(await getPlatformUserDetail(req.params.id));
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : '用户不存在' });
    }
  });

  app.post('/api/platform/users/:id/status', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'users')) return;
    const { status, reason } = req.body ?? {};
    if (!['active', 'frozen'].includes(status)) {
      return res.status(400).json({ error: 'status 须为 active 或 frozen' });
    }
    try {
      res.json({
        user: await updateUserStatus(req.params.id, status, reason ? String(reason) : undefined),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '更新失败' });
    }
  });

  app.get('/api/platform/configs', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'configs')) return;
    res.json({ configs: await getSystemConfigs() });
  });

  app.put('/api/platform/configs/:key', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'config.write')) return;
    const { value, reason } = req.body ?? {};
    if (value === undefined) return res.status(400).json({ error: '缺少 value' });
    try {
      res.json({ config: await upsertSystemConfig(req.params.key, String(value), reason) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '保存失败' });
    }
  });

  app.get('/api/platform/configs/:key/versions', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'configs')) return;
    res.json({ versions: await listSystemConfigVersions(req.params.key) });
  });

  // 本期平台不运营商家发布账号，见 src/apps/platform/platform-feature-flags.ts

  app.get('/api/platform/content-governance', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'content_governance')) return;
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const tab = typeof req.query.tab === 'string' ? req.query.tab : undefined;
    res.json(await listPlatformContentGovernance({ brandName, platform, status, tab }));
  });

  app.get('/api/platform/risk-tickets', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'risk_center')) return;
    const level = typeof req.query.level === 'string' ? req.query.level : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    res.json(await listPlatformRiskTickets({ level, status, type }));
  });

  app.get('/api/platform/provider-resources', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'resource_review')) return;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const providerName = typeof req.query.providerName === 'string' ? req.query.providerName : undefined;
    res.json(await listProviderResourcesForReview({ platform, status, providerName }));
  });

  app.post('/api/platform/provider-resources/review', async (req, res) => {
    const role = requirePlatformPermission(req, res, 'resource_review');
    if (!role) return;
    const { providerId, platform, action, note } = req.body ?? {};
    if (!providerId || !platform || !['approve', 'reject', 'reset'].includes(action)) {
      return res.status(400).json({ error: '缺少 providerId、platform 或 action' });
    }
    try {
      res.json({
        provider: await reviewProviderPlatformResource({
          providerId: String(providerId),
          platform: String(platform),
          action,
          note: note ? String(note) : undefined,
        }),
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '审核失败' });
    }
  });

  app.get('/api/platform/members', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'roles')) return;
    res.json(await listPlatformMembers());
  });

  app.get('/api/platform/ranking-ops', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'ranking_ops')) return;
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const anomaly = typeof req.query.anomaly === 'string' ? req.query.anomaly : undefined;
    res.json(await listPlatformRankingOps({ brandName, platform, anomaly }));
  });

  app.get('/api/platform/ranking-ops/:planId', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'ranking_ops')) return;
    const detail = await getPlatformRankingPlanDetail(req.params.planId);
    if (!detail) return res.status(404).json({ error: '监控计划不存在' });
    res.json(detail);
  });

  app.get('/api/platform/fulfillment-ratings', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'fulfillment_rating')) return;
    const providerName = typeof req.query.providerName === 'string' ? req.query.providerName : undefined;
    const scoreMin = req.query.scoreMin ? Number(req.query.scoreMin) : undefined;
    const scoreMax = req.query.scoreMax ? Number(req.query.scoreMax) : undefined;
    res.json(await listPlatformFulfillmentRatings({ providerName, scoreMin, scoreMax }));
  });

  app.get('/api/platform/fulfillment-ratings/:providerId', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'fulfillment_rating')) return;
    const detail = await getPlatformFulfillmentDetail(req.params.providerId);
    if (!detail) return res.status(404).json({ error: '接单方不存在' });
    res.json(detail);
  });

  app.get('/api/platform/notifications', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'notifications')) return;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const read = typeof req.query.read === 'string' ? req.query.read : undefined;
    const providerName = typeof req.query.providerName === 'string' ? req.query.providerName : undefined;
    res.json(await listPlatformNotifications({ type, read, providerName }));
  });

  app.get('/api/platform/settlement-batches', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'settlement')) return;
    const providerName = typeof req.query.providerName === 'string' ? req.query.providerName : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(await listPlatformSettlementBatches({ providerName, status }));
  });

  app.get('/api/platform/reports', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'reports')) return;
    const period = typeof req.query.period === 'string' ? req.query.period : undefined;
    const businessLine = typeof req.query.businessLine === 'string' ? req.query.businessLine : undefined;
    res.json(await listPlatformReports({ period, businessLine }));
  });

  // Legacy
  app.get('/api/platform/orders', async (_req, res) => {
    res.json({ orders: await listAllOrders() });
  });
}

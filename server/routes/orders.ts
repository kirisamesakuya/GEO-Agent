import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
import { ensureTaskOrderScope } from '../lib/publisher-scope.js';
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
  withdrawPublisherTaskOrder,
  type ListOrdersByBrandOptions,
} from '../services/order.service.js';
import {
  approveArticleDraft,
  requestArticleDraftRevision,
} from '../services/article-delivery.service.js';
import { checkBudget, freezeBudget } from '../services/budget.service.js';
import { validateTaskLobbyPublish } from '../services/gate.service.js';
import { countTaskOrdersByStage } from '../services/article-delivery-list.service.js';
import type { ArticleDeliveryStageFilter } from '../lib/article-delivery-stage.js';
import { appendAuditLog } from '../services/audit.service.js';
import { BRAND_AGREEMENT_VERSION } from '../../lib/marketplace-agreements.js';
import {
  acceptTaskOrderQuote,
  getOrderWithQuotesForPublisher,
  rejectTaskOrderQuote,
  QuoteError,
} from '../services/quote.service.js';

const STAGE_FILTERS = new Set<ArticleDeliveryStageFilter>([
  'all',
  'pending_provider',
  'writing',
  'draft_review',
  'draft_revision',
  'pending_publish',
  'published',
  'pending_acceptance',
  'completed',
  'cancelled',
]);

function parseListOrdersOptions(query: Record<string, unknown>): ListOrdersByBrandOptions {
  const opts: ListOrdersByBrandOptions = {};
  if (query.articleOnly === 'true' || query.articleOnly === '1') {
    opts.articleOnly = true;
  }
  if (typeof query.status === 'string' && query.status.trim()) {
    opts.status = query.status.trim();
  }
  if (typeof query.stage === 'string' && STAGE_FILTERS.has(query.stage as ArticleDeliveryStageFilter)) {
    const stage = query.stage as ArticleDeliveryStageFilter;
    if (stage !== 'all') opts.stage = stage;
  }
  if (typeof query.platform === 'string' && query.platform.trim()) {
    opts.platform = query.platform.trim();
  }
  return opts;
}

export function registerOrderRoutes(app: Express) {
  app.get('/api/orders/stats', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;

    const articleOnly = req.query.articleOnly !== 'false';
    const statusCounts = await countTaskOrdersByStage(brandName, articleOnly);
    res.json({ statusCounts });
  });

  app.get('/api/orders', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (brandName) {
      const options = parseListOrdersOptions(req.query as Record<string, unknown>);
      return res.json({ orders: await listOrdersByBrand(brandName, options) });
    }
    if (getAuthMode() === 'session') return;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    res.json({ orders: await listPublishedOrders(platform) });
  });

  app.get('/api/orders/:id', async (req, res) => {
    const brandName = getAuthMode() === 'session' ? await requireBrandName(req, res) : null;
    if (getAuthMode() === 'session' && !brandName) return;

    if (brandName) {
      const orderWithQuotes = await getOrderWithQuotesForPublisher(req.params.id, brandName);
      if (!orderWithQuotes) return res.status(404).json({ error: '订单不存在' });
      return res.json({ order: orderWithQuotes });
    }

    const order = await getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ order });
  });

  app.post('/api/orders', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const input = req.body ?? {};
    if (!input.title) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const pricingMode = input.pricingMode ?? 'provider_quote';
    const isQuote = pricingMode === 'provider_quote';

    if (!isQuote) {
      if (!input.budget) return res.status(400).json({ error: '缺少预算' });
      const budgetAmount = Number(input.budget);
      const lobbyGate = await validateTaskLobbyPublish(brandName, budgetAmount);
      if (!lobbyGate.ok) return res.status(400).json({ error: lobbyGate.error });

      const budgetCheck = await checkBudget(brandName, budgetAmount);
      if (!budgetCheck.ok) return res.status(400).json({ error: budgetCheck.error });
    }

    const platform = input.platform ?? '小红书';

    const order = await createTaskOrder({
      brandName,
      title: input.title,
      type: input.type ?? '达人',
      platform,
      budget: isQuote ? 0 : Number(input.budget),
      deliverable: input.deliverable ?? input.description ?? '按任务描述交付',
      acceptance: input.acceptance ?? '截图证明 / 链接回传',
      deadline: input.deadline,
      pricingMode,
      hiddenBudgetMaxCents: input.hiddenBudgetMaxCents,
      perTaskBudgetCapCents: input.perTaskBudgetCapCents,
      taskBriefJson: input.taskBriefJson ? JSON.stringify(input.taskBriefJson) : undefined,
      description: input.description,
      industry: input.industry,
      city: input.city,
    });

    if (!isQuote) {
      const freeze = await freezeBudget(brandName, Number(input.budget), order.id);
      if (!freeze.ok) return res.status(400).json({ error: freeze.error });
    }

    if (input.agreementVersion === BRAND_AGREEMENT_VERSION) {
      await appendAuditLog({
        action: 'brand_transaction_agreement_accept',
        entity: 'TaskOrder',
        entityId: order.id,
        detail: `agreement:${BRAND_AGREEMENT_VERSION}`,
        source: 'publisher',
      });
    }

    res.status(201).json({ order });
  });

  app.post('/api/orders/:id/quotes/:quoteId/accept', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    if (!(await ensureTaskOrderScope(req, res, req.params.id))) return;
    const { idempotencyKey } = req.body ?? {};
    try {
      const order = await acceptTaskOrderQuote(
        req.params.id,
        req.params.quoteId,
        brandName,
        idempotencyKey
      );
      res.json({ order });
    } catch (err) {
      if (err instanceof QuoteError) {
        return res.status(err.httpStatus).json({ error: err.message, code: err.code });
      }
      res.status(400).json({ error: err instanceof Error ? err.message : '确认失败' });
    }
  });

  app.post('/api/orders/:id/quotes/:quoteId/reject', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    if (!(await ensureTaskOrderScope(req, res, req.params.id))) return;
    try {
      res.json(await rejectTaskOrderQuote(req.params.id, req.params.quoteId, brandName));
    } catch (err) {
      if (err instanceof QuoteError) {
        return res.status(err.httpStatus).json({ error: err.message, code: err.code });
      }
      res.status(400).json({ error: err instanceof Error ? err.message : '拒绝失败' });
    }
  });

  app.post('/api/orders/:id/withdraw', async (req, res) => {
    if (!(await ensureTaskOrderScope(req, res, req.params.id))) return;
    const { reason } = req.body ?? {};
    try {
      res.json({ order: await withdrawPublisherTaskOrder(req.params.id, reason) });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '撤回失败' });
    }
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

  app.get('/api/providers/:id', async (req, res) => {
    const { getProvider } = await import('../services/provider.service.js');
    const provider = await getProvider(req.params.id);
    if (!provider) return res.status(404).json({ error: '接单方不存在' });
    res.json({
      provider: {
        id: provider.id,
        name: provider.name,
        platforms: provider.platforms,
        industryTags: provider.industryTags,
        caseLinks: provider.caseLinks,
        capabilities: provider.capabilities,
      },
    });
  });
}

import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
import {
  countArticleDeliveriesByStage,
  countTaskOrdersByStage,
  listArticleDeliveries,
} from '../services/article-delivery-list.service.js';
import type { ArticleDeliveryStageFilter } from '../lib/article-delivery-stage.js';

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

function parseStageFilter(raw: unknown): ArticleDeliveryStageFilter | undefined {
  if (typeof raw !== 'string' || !STAGE_FILTERS.has(raw as ArticleDeliveryStageFilter)) {
    return undefined;
  }
  return raw as ArticleDeliveryStageFilter;
}

export function registerArticleDeliveryRoutes(app: Express) {
  app.get('/api/article-deliveries/stats', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;

    const [stageCounts, taskOrderStatusCounts] = await Promise.all([
      countArticleDeliveriesByStage(brandName),
      countTaskOrdersByStage(brandName, true),
    ]);

    res.json({ stageCounts, taskOrderStatusCounts });
  });

  app.get('/api/article-deliveries', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;

    const stage = parseStageFilter(req.query.stage);
    const source = req.query.source;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;

    const rows = await listArticleDeliveries({
      brandName,
      ...(stage && stage !== 'all' ? { stage } : {}),
      ...(source === 'ai_generated' || source === 'manual_order' || source === 'imported'
        ? { source }
        : {}),
      ...(platform ? { platform } : {}),
      limit,
    });

    res.json({ rows });
  });
}

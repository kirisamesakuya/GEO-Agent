import type { Express } from 'express';
import { requireBrandName, requireBrandAccess } from '../middleware/require-publisher.js';
import { previewArticleGenerationInput } from '../services/article-generation.service.js';
import { getContentItemEffectSummary } from '../services/article-effect.service.js';
import { prisma } from '../db/client.js';

export function registerArticleGenerationRoutes(app: Express) {
  app.post('/api/article-generation/preview', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { input } = req.body ?? {};
    if (!input) {
      return res.status(400).json({ error: '缺少 input' });
    }
    try {
      const preview = await previewArticleGenerationInput(brandName, input);
      res.json({ preview });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '预览失败' });
    }
  });

  app.get('/api/content-items/:id/effect', async (req, res) => {
    const item = await prisma.contentItem.findUnique({
      where: { id: req.params.id },
      include: { batch: { select: { brandName: true } } },
    });
    if (!item) return res.status(404).json({ error: '文章不存在' });
    if (!(await requireBrandAccess(req, res, item.batch.brandName))) return;
    const summary = await getContentItemEffectSummary(req.params.id);
    if (!summary) return res.status(404).json({ error: '文章不存在' });
    res.json(summary);
  });
}

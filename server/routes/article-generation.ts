import type { Express } from 'express';
import { previewArticleGenerationInput } from '../services/article-generation.service.js';
import { getContentItemEffectSummary } from '../services/article-effect.service.js';

export function registerArticleGenerationRoutes(app: Express) {
  app.post('/api/article-generation/preview', async (req, res) => {
    const { brandName, input } = req.body ?? {};
    if (!brandName || !input) {
      return res.status(400).json({ error: '缺少 brandName 或 input' });
    }
    try {
      const preview = await previewArticleGenerationInput(String(brandName), input);
      res.json({ preview });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '预览失败' });
    }
  });

  app.get('/api/content-items/:id/effect', async (req, res) => {
    const summary = await getContentItemEffectSummary(req.params.id);
    if (!summary) return res.status(404).json({ error: '文章不存在' });
    res.json(summary);
  });
}

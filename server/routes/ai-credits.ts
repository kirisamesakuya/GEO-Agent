import type { Express } from 'express';
import { requireBrandName, requireBrandNameParam } from '../middleware/require-publisher.js';
import { getAiCredits, addAiCredits, syncAiCreditsFromCloud } from '../services/ai-credits.service.js';

export function registerAiCreditsRoutes(app: Express) {
  app.get('/api/ai-credits/:brandName', async (req, res) => {
    try {
      const brandName = await requireBrandNameParam(req, res, req.params.brandName);
      if (!brandName) return;
      res.json(await getAiCredits(brandName));
    } catch (err) {
      console.error('[ai-credits]', err);
      res.status(500).json({ error: '词元账户加载失败' });
    }
  });

  app.post('/api/ai-credits/:brandName/sync', async (req, res) => {
    const brandName = await requireBrandNameParam(req, res, req.params.brandName);
    if (!brandName) return;
    try {
      res.json(await syncAiCreditsFromCloud(brandName));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '同步失败' });
    }
  });

  app.post('/api/ai-credits/deposit', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { amount, note } = req.body ?? {};
    if (!amount) return res.status(400).json({ error: '缺少参数' });
    res.json(await addAiCredits(brandName, Number(amount), note));
  });
}

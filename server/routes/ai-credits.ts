import type { Express } from 'express';
import { getAiCredits, addAiCredits, syncAiCreditsFromCloud } from '../services/ai-credits.service.js';

export function registerAiCreditsRoutes(app: Express) {
  app.get('/api/ai-credits/:brandName', async (req, res) => {
    if (req.params.brandName === '__all__') {
      return res.status(400).json({ error: '请选择具体品牌' });
    }
    res.json(await getAiCredits(req.params.brandName));
  });

  app.post('/api/ai-credits/:brandName/sync', async (req, res) => {
    try {
      res.json(await syncAiCreditsFromCloud(decodeURIComponent(req.params.brandName)));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '同步失败' });
    }
  });

  app.post('/api/ai-credits/deposit', async (req, res) => {
    const { brandName, amount, note } = req.body ?? {};
    if (!brandName || !amount) return res.status(400).json({ error: '缺少参数' });
    res.json(await addAiCredits(brandName, Number(amount), note));
  });
}

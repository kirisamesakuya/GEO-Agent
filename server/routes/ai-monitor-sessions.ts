import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
import {
  listAiMonitorSessions,
  startAiMonitorVerify,
  updateAiMonitorAccountLabel,
  updateAiMonitorSessionStatus,
  type AiMonitorSessionStatus,
} from '../services/ai-monitor-session.service.js';

export function registerAiMonitorSessionRoutes(app: Express) {
  app.get('/api/ai-monitor-sessions', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    res.json(await listAiMonitorSessions(brandName));
  });

  app.put('/api/ai-monitor-sessions', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { platform, accountLabel, status } = req.body ?? {};
    if (!platform || typeof platform !== 'string') {
      return res.status(400).json({ error: '缺少 platform' });
    }
    try {
      if (typeof status === 'string' && status.trim()) {
        const session = await updateAiMonitorSessionStatus(
          brandName,
          platform,
          status.trim() as AiMonitorSessionStatus
        );
        if (!session) return res.status(404).json({ error: '品牌不存在' });
        return res.json({ session });
      }
      const label = typeof accountLabel === 'string' ? accountLabel : '';
      const session = await updateAiMonitorAccountLabel(brandName, platform, label);
      if (!session) return res.status(404).json({ error: '品牌不存在' });
      res.json({ session });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '更新失败' });
    }
  });

  app.post('/api/ai-monitor-sessions/verify', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const platforms = Array.isArray(req.body?.platforms)
      ? (req.body.platforms as unknown[]).map(String).filter(Boolean)
      : undefined;
    try {
      const result = await startAiMonitorVerify(brandName, platforms);
      if (!result) return res.status(404).json({ error: '品牌不存在' });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '检测失败' });
    }
  });
}

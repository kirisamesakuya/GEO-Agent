import type { Express } from 'express';
import {
  getAiMonitorPlatformCatalog,
  listEnabledAiMonitorPlatformCatalog,
  resetAiMonitorPlatformCatalog,
  saveAiMonitorPlatformCatalog,
} from '../services/ai-monitor-platform-catalog.service.js';

export function registerMonitorPlatformRoutes(app: Express) {
  app.get('/api/ai-monitor-platforms', async (_req, res) => {
    const platforms = await listEnabledAiMonitorPlatformCatalog();
    res.json({ platforms });
  });
}

export function registerPlatformMonitorPlatformAdminRoutes(
  app: Express,
  requirePlatformPermission: (
    req: import('express').Request,
    res: import('express').Response,
    permission: string
  ) => string | null
) {
  app.get('/api/platform/monitor-platforms', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'monitor_platforms')) return;
    res.json({ platforms: await getAiMonitorPlatformCatalog() });
  });

  app.put('/api/platform/monitor-platforms', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'config.write')) return;
    const { platforms, reason } = req.body ?? {};
    if (!Array.isArray(platforms)) {
      return res.status(400).json({ error: '缺少 platforms 数组' });
    }
    try {
      const saved = await saveAiMonitorPlatformCatalog(platforms, reason ? String(reason) : undefined);
      res.json({ platforms: saved });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '保存失败' });
    }
  });

  app.post('/api/platform/monitor-platforms/reset', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'config.write')) return;
    const { reason } = req.body ?? {};
    try {
      const platforms = await resetAiMonitorPlatformCatalog(reason ? String(reason) : undefined);
      res.json({ platforms });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '恢复失败' });
    }
  });
}

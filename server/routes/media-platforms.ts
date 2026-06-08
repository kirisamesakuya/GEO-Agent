import type { Express } from 'express';
import type { MediaPlatformCategory } from '../../lib/media-platform-catalog.js';
import {
  getMediaPlatformCatalog,
  listMediaPlatformCatalog,
  resetMediaPlatformCatalog,
  saveMediaPlatformCatalog,
} from '../services/media-platform-catalog.service.js';

function parseCategories(raw: unknown): MediaPlatformCategory[] | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean) as MediaPlatformCategory[];
}

export function registerMediaPlatformRoutes(app: Express) {
  app.get('/api/media-platforms', async (req, res) => {
    const categories = parseCategories(req.query.categories);
    const scope = typeof req.query.scope === 'string' ? req.query.scope : '';
    let resolvedCategories = categories;
    if (!resolvedCategories?.length) {
      if (scope === 'lobby') {
        resolvedCategories = ['content_publish', 'website', 'official_media'];
      } else if (scope === 'publish') {
        resolvedCategories = ['content_publish'];
      } else if (scope === 'ai') {
        resolvedCategories = ['ai_search'];
      }
    }
    const platforms = await listMediaPlatformCatalog({
      enabledOnly: true,
      categories: resolvedCategories,
    });
    res.json({ platforms });
  });
}

export function registerPlatformMediaPlatformAdminRoutes(
  app: Express,
  requirePlatformPermission: (
    req: import('express').Request,
    res: import('express').Response,
    permission: string
  ) => string | null
) {
  app.get('/api/platform/media-platforms', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'media_platforms')) return;
    res.json({ platforms: await getMediaPlatformCatalog() });
  });

  app.put('/api/platform/media-platforms', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'config.write')) return;
    const { platforms, reason } = req.body ?? {};
    if (!Array.isArray(platforms)) {
      return res.status(400).json({ error: '缺少 platforms 数组' });
    }
    try {
      const saved = await saveMediaPlatformCatalog(platforms, reason ? String(reason) : undefined);
      res.json({ platforms: saved });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '保存失败' });
    }
  });

  app.post('/api/platform/media-platforms/reset', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'config.write')) return;
    const { reason } = req.body ?? {};
    try {
      const platforms = await resetMediaPlatformCatalog(reason ? String(reason) : undefined);
      res.json({ platforms });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '恢复失败' });
    }
  });

  app.get('/api/platform/custom-publish-platforms', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'custom_publish_platforms')) return;
    const brandName = typeof req.query.brandName === 'string' ? req.query.brandName : undefined;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const { listAdminCustomPublishPlatforms } = await import(
      '../services/custom-publish-platform.service.js'
    );
    res.json({ items: await listAdminCustomPublishPlatforms({ brandName, platform }) });
  });

  app.post('/api/platform/custom-publish-platforms', async (req, res) => {
    if (!requirePlatformPermission(req, res, 'config.write')) return;
    const { brandName, platform, abbr, gradient, loginUrl, loginHint } = req.body ?? {};
    if (!brandName || typeof brandName !== 'string') {
      return res.status(400).json({ error: '请选择品牌' });
    }
    if (!platform || typeof platform !== 'string') {
      return res.status(400).json({ error: '请填写平台名称' });
    }
    try {
      const { createCustomPublishPlatform } = await import(
        '../services/custom-publish-platform.service.js'
      );
      const result = await createCustomPublishPlatform(brandName.trim(), {
        platform,
        abbr: typeof abbr === 'string' ? abbr : undefined,
        gradient: typeof gradient === 'string' ? gradient : undefined,
        loginUrl: typeof loginUrl === 'string' ? loginUrl : undefined,
        loginHint: typeof loginHint === 'string' ? loginHint : undefined,
      });
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '添加失败' });
    }
  });
}

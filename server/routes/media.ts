import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
import {
  listMediaAssets,
  createMediaAsset,
  deleteMediaAsset,
} from '../services/media-asset.service.js';

export function registerMediaRoutes(app: Express) {
  app.get('/api/media-assets', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const assets = await listMediaAssets(
      brandName,
      typeof req.query.group === 'string' ? req.query.group : undefined
    );
    res.json({ assets });
  });

  app.post('/api/media-assets', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { url, name, group, tags, platforms } = req.body ?? {};
    if (!url || !name) return res.status(400).json({ error: '缺少必填字段' });
    const asset = await createMediaAsset(brandName, { url, name, group, tags, platforms });
    res.json(asset);
  });

  app.delete('/api/media-assets/:id', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    await deleteMediaAsset(req.params.id, brandName);
    res.json({ ok: true });
  });
}

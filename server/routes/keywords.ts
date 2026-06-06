import type { Express } from 'express';
import {
  listKeywords,
  createKeyword,
  bulkCreateKeywords,
  deleteKeyword,
  syncKeywordsFromBrand,
} from '../services/keyword.service.js';
import type { KeywordGroup } from '../services/keyword.service.js';

export function registerKeywordRoutes(app: Express) {
  app.get('/api/keywords', async (req, res) => {
    const brandName = String(req.query.brandName ?? '');
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    const keywords = await listKeywords(brandName, {
      group: typeof req.query.group === 'string' ? req.query.group : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    });
    res.json({ keywords });
  });

  app.post('/api/keywords/sync', async (req, res) => {
    const { brandName } = req.body ?? {};
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    const added = await syncKeywordsFromBrand(brandName);
    res.json({ added });
  });

  app.post('/api/keywords', async (req, res) => {
    const { brandName, term, group } = req.body ?? {};
    if (!brandName || !term) return res.status(400).json({ error: '缺少 brandName 或 term' });
    const kw = await createKeyword(brandName, term, (group as KeywordGroup) ?? 'brand');
    res.json(kw);
  });

  app.post('/api/keywords/bulk', async (req, res) => {
    const { brandName, items } = req.body ?? {};
    if (!brandName || !Array.isArray(items)) {
      return res.status(400).json({ error: '缺少 brandName 或 items' });
    }
    const created = await bulkCreateKeywords(brandName, items);
    res.json({ created, count: created.length });
  });

  app.delete('/api/keywords/:id', async (req, res) => {
    const brandName = String(req.query.brandName ?? req.body?.brandName ?? '');
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    await deleteKeyword(req.params.id, brandName);
    res.json({ ok: true });
  });
}

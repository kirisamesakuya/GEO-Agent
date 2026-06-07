import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
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
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const keywords = await listKeywords(brandName, {
      group: typeof req.query.group === 'string' ? req.query.group : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    });
    res.json({ keywords });
  });

  app.post('/api/keywords/sync', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const added = await syncKeywordsFromBrand(brandName);
    res.json({ added });
  });

  app.post('/api/keywords', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { term, group } = req.body ?? {};
    if (!term) return res.status(400).json({ error: '缺少 term' });
    const kw = await createKeyword(brandName, term, (group as KeywordGroup) ?? 'brand');
    res.json(kw);
  });

  app.post('/api/keywords/bulk', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { items } = req.body ?? {};
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: '缺少 items' });
    }
    const created = await bulkCreateKeywords(brandName, items);
    res.json({ created, count: created.length });
  });

  app.delete('/api/keywords/:id', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    await deleteKeyword(req.params.id, brandName);
    res.json({ ok: true });
  });
}

import type { Express } from 'express';
import {
  listKnowledge,
  upsertKnowledge,
  deleteKnowledge,
} from '../services/knowledge.service.js';
import type { KnowledgeCategory } from '../services/knowledge.service.js';

export function registerKnowledgeRoutes(app: Express) {
  app.get('/api/knowledge', async (req, res) => {
    const brandName = String(req.query.brandName ?? '');
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    const entries = await listKnowledge(
      brandName,
      typeof req.query.category === 'string' ? req.query.category : undefined
    );
    res.json({ entries });
  });

  app.post('/api/knowledge', async (req, res) => {
    const { brandName, id, category, title, body, sortOrder } = req.body ?? {};
    if (!brandName || !category || !title) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    const entry = await upsertKnowledge(brandName, {
      id,
      category: category as KnowledgeCategory,
      title,
      body: body ?? '',
      sortOrder,
    });
    res.json(entry);
  });

  app.delete('/api/knowledge/:id', async (req, res) => {
    const brandName = String(req.query.brandName ?? req.body?.brandName ?? '');
    if (!brandName) return res.status(400).json({ error: '缺少 brandName' });
    await deleteKnowledge(req.params.id, brandName);
    res.json({ ok: true });
  });
}

import type { Express } from 'express';
import { requireBrandName } from '../middleware/require-publisher.js';
import {
  listKnowledge,
  upsertKnowledge,
  deleteKnowledge,
} from '../services/knowledge.service.js';
import type { KnowledgeCategory } from '../services/knowledge.service.js';

export function registerKnowledgeRoutes(app: Express) {
  app.get('/api/knowledge', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const entries = await listKnowledge(
      brandName,
      typeof req.query.category === 'string' ? req.query.category : undefined
    );
    res.json({ entries });
  });

  app.post('/api/knowledge', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { id, category, title, body, sortOrder } = req.body ?? {};
    if (!category || !title) {
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
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    await deleteKnowledge(req.params.id, brandName);
    res.json({ ok: true });
  });
}

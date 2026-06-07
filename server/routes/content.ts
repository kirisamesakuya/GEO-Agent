import type { Express, Request, Response } from 'express';
import { prisma } from '../db/client.js';
import { requireBrandName } from '../middleware/require-publisher.js';
import { ensureContentBatchScope } from '../lib/publisher-scope.js';
import {
  createContentBatch,
  getContentBatch,
  listContentBatches,
  updateContentItem,
  deleteContentItems,
  enqueueHermesPublishFromLibrary,
  confirmBatchPublish,
} from '../services/content.service.js';
import { createSelfAccountPublishFromBatch } from '../services/publish-plan.service.js';

export function registerContentRoutes(app: Express) {
  app.get('/api/content-batches', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { platform, projectId, limit } = req.query;
    const batches = await listContentBatches({
      brandName,
      platform: typeof platform === 'string' ? platform : undefined,
      projectId: typeof projectId === 'string' ? projectId : undefined,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ batches });
  });

  app.get('/api/content-batches/:id', async (req, res) => {
    if (!(await ensureContentBatchScope(req, res, req.params.id))) return;
    const batch = await getContentBatch(req.params.id);
    if (!batch) return res.status(404).json({ error: '批次不存在' });
    res.json({ batch });
  });

  app.get('/api/content-items/:id', async (req, res) => {
    const item = await prisma.contentItem.findUnique({
      where: { id: req.params.id },
      include: { batch: { select: { id: true, brandName: true } } },
    });
    if (!item) return res.status(404).json({ error: '内容不存在' });
    if (!(await ensureContentBatchScope(req, res, item.batchId))) return;
    res.json({
      item: {
        id: item.id,
        batchId: item.batchId,
        brandName: item.batch.brandName,
        title: item.title,
        platform: item.platform,
        status: item.status,
        version: item.version,
        structure: item.structure,
        previewText: item.previewText,
        fullContent: item.fullContent,
        generationMetaJson: item.generationMetaJson,
        qualityChecksJson: item.qualityChecksJson,
        effectBaselineJson: item.effectBaselineJson,
        effectVerificationJson: item.effectVerificationJson,
      },
    });
  });

  app.patch('/api/content-batches/:batchId/items/:itemId', async (req, res) => {
    if (!(await ensureContentBatchScope(req, res, req.params.batchId))) return;
    const item = await updateContentItem(req.params.batchId, req.params.itemId, req.body ?? {});
    if (!item) return res.status(404).json({ error: '内容不存在' });
    res.json({ item });
  });

  app.post('/api/content-batches/items/bulk-delete', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { itemIds } = req.body ?? {};
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: '请选择要删除的文章' });
    }
    try {
      const result = await deleteContentItems({
        itemIds: itemIds.map(String),
        brandName,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '删除失败' });
    }
  });

  app.post('/api/content-batches/:id/confirm-publish', async (req, res) => {
    if (!(await ensureContentBatchScope(req, res, req.params.id))) return;
    const batch = await getContentBatch(req.params.id);
    if (!batch) return res.status(404).json({ error: '批次不存在' });
    try {
      const task = await confirmBatchPublish(req.params.id, batch.brandName);
      res.status(201).json({ task });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '发布失败' });
    }
  });

  app.post('/api/content-batches/:id/hermes-publish', async (req, res) => {
    const batch = await ensureContentBatchScope(req, res, req.params.id);
    if (!batch) return;
    const { contentItemIds, accountBindingId } = req.body ?? {};
    if (!accountBindingId) return res.status(400).json({ error: '请选择本机发布账号' });
    try {
      const result = await enqueueHermesPublishFromLibrary({
        brandName: batch.brandName,
        batchId: req.params.id,
        contentItemIds: Array.isArray(contentItemIds) ? contentItemIds.map(String) : [],
        accountBindingId: String(accountBindingId),
      });
      res.status(201).json({
        success: true,
        mode: 'hermes_mock',
        message: '已提交 Hermes 模拟发布任务（不经过平台官方接口）',
        ...result,
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '发布失败' });
    }
  });

  app.post('/api/content-batches/:id/publish-draft', async (req, res) => {
    const batch = await ensureContentBatchScope(req, res, req.params.id);
    if (!batch) return;
    const { contentItemIds, accountBindingId, frequency, runCount, autoComment } = req.body ?? {};
    if (!accountBindingId) return res.status(400).json({ error: '请选择用于发布的绑定账号' });
    try {
      const result = await createSelfAccountPublishFromBatch({
        brandName: batch.brandName,
        batchId: req.params.id,
        contentItemIds: Array.isArray(contentItemIds) ? contentItemIds : undefined,
        accountBindingId,
        frequency,
        runCount: runCount ? Number(runCount) : undefined,
        autoComment: Boolean(autoComment),
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : '发布失败' });
    }
  });

  app.post('/api/content-batches', async (req, res) => {
    const brandName = await requireBrandName(req, res);
    if (!brandName) return;
    const { platform, articles, taskId, status } = req.body ?? {};
    if (!platform || !articles?.length) return res.status(400).json({ error: '缺少必填字段' });
    const batch = await createContentBatch({ brandName, platform, articles, taskId, status });
    res.status(201).json({ batch });
  });
}

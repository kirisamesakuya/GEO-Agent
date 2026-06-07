import type { Request, Response } from 'express';
import { requireBrandAccess } from '../middleware/require-publisher.js';
import { getAgentTask } from '../services/agent-task.service.js';
import { prisma } from '../db/client.js';

export async function ensureAgentTaskScope(req: Request, res: Response, taskId: string) {
  const task = await getAgentTask(taskId);
  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return null;
  }
  if (task.brandName) {
    const brand = await requireBrandAccess(req, res, task.brandName);
    if (!brand) return null;
  }
  return task;
}

export async function ensureContentBatchScope(req: Request, res: Response, batchId: string) {
  const batch = await prisma.contentBatch.findUnique({ where: { id: batchId } });
  if (!batch) {
    res.status(404).json({ error: '批次不存在' });
    return null;
  }
  const brand = await requireBrandAccess(req, res, batch.brandName);
  if (!brand) return null;
  return batch;
}

export async function ensureIndexPlanScope(req: Request, res: Response, planId: string) {
  const plan = await prisma.indexQueryPlan.findUnique({
    where: { id: planId },
    include: { brand: { select: { name: true } } },
  });
  if (!plan) {
    res.status(404).json({ error: '计划不存在' });
    return null;
  }
  const brand = await requireBrandAccess(req, res, plan.brand.name);
  if (!brand) return null;
  return plan;
}

export async function ensureGeoReportScope(req: Request, res: Response, reportId: string) {
  const report = await prisma.geoReport.findUnique({ where: { id: reportId } });
  if (!report) {
    res.status(404).json({ error: '报告不存在' });
    return null;
  }
  const brand = await requireBrandAccess(req, res, report.brandName);
  if (!brand) return null;
  return report;
}

export async function ensureWebsiteRequestScope(req: Request, res: Response, requestId: string) {
  const row = await prisma.websiteRequest.findUnique({ where: { id: requestId } });
  if (!row) {
    res.status(404).json({ error: '需求不存在' });
    return null;
  }
  const brand = await requireBrandAccess(req, res, row.brandName);
  if (!brand) return null;
  return row;
}

export async function ensureTaskOrderScope(req: Request, res: Response, orderId: string) {
  const order = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return null;
  }
  const brand = await requireBrandAccess(req, res, order.brandName);
  if (!brand) return null;
  return order;
}

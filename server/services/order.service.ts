import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';
import { createProviderNotification } from './notification.service.js';
import {
  notifyPublisherOrderAccepted,
  notifyPublisherOrderPendingReview,
} from '../lib/publisher-notification-events.js';
import { isAllBrandsScope } from './organization.service.js';
import { paginatedResult, parsePagination } from '../lib/pagination.js';
import { isArticleContentOrder } from './article-delivery.service.js';
import { ensureDemoMarketplaceReady } from '../lib/ensure-demo-marketplace.js';

export async function listPublishedOrders(platform?: string) {
  await ensureDemoMarketplaceReady();
  return prisma.taskOrder.findMany({
    where: {
      status: 'published',
      ...(platform ? { platform } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listOrdersByBrand(brandName: string) {
  await ensureDemoMarketplaceReady();
  return prisma.taskOrder.findMany({
    where: isAllBrandsScope(brandName) ? {} : { brandName },
    include: { deliveries: true, revisions: true, settlement: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function listOrdersByProvider(providerId: string) {
  return prisma.taskOrder.findMany({
    where: { providerId },
    include: { deliveries: true, revisions: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export type DeliveryAttachmentItem = {
  type: 'screenshot' | 'file' | 'link';
  name: string;
  url: string;
};

export async function getOrder(id: string) {
  return prisma.taskOrder.findUnique({
    where: { id },
    include: {
      deliveries: true,
      revisions: true,
      assignments: { orderBy: { createdAt: 'desc' } },
      settlement: true,
    },
  });
}

function parseAttachments(raw: string | null | undefined): DeliveryAttachmentItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DeliveryAttachmentItem[]) : [];
  } catch {
    return [];
  }
}

function acceptanceRequiresScreenshot(acceptance: string): boolean {
  return /截图|screen/i.test(acceptance);
}

export async function createTaskOrder(input: {
  brandName: string;
  title: string;
  type: string;
  platform: string;
  budget: number;
  deliverable: string;
  acceptance: string;
  description?: string;
  industry?: string;
  city?: string;
  deadline?: string;
}) {
  return prisma.taskOrder.create({
    data: {
      ...input,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
      status: 'published',
    },
  });
}

export async function openDispute(orderId: string, reason: string, actor: string) {
  await prisma.orderRevision.create({
    data: { orderId, reason: `[争议] ${reason}`, status: 'dispute' },
  });
  const order = await prisma.taskOrder.update({
    where: { id: orderId },
    data: { status: 'disputed' },
  });
  await appendAuditLog({
    action: 'order_dispute',
    entity: 'TaskOrder',
    entityId: orderId,
    detail: `${actor}: ${reason}`,
  });
  return order;
}

export async function acceptOrder(orderId: string, providerId: string, providerName: string) {
  const order = await prisma.taskOrder.update({
    where: { id: orderId },
    data: { status: 'in_progress', providerId, providerName },
  });
  await appendAuditLog({ action: 'order_accept', entity: 'TaskOrder', entityId: orderId });
  await notifyPublisherOrderAccepted({
    brandName: order.brandName,
    orderId: order.id,
    orderTitle: order.title,
    providerName,
  });
  return order;
}

export async function submitDelivery(
  orderId: string,
  content: string,
  link?: string,
  attachments?: DeliveryAttachmentItem[],
  status: 'submitted' | 'draft' = 'submitted'
) {
  const order = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('订单不存在');

  if (isArticleContentOrder(order)) {
    if (status === 'draft') {
      throw new Error('文章类任务请使用「提交文章草稿」接口');
    }
    throw new Error('文章类任务请先完成审稿，再提交最终发布交付');
  }

  const items = attachments ?? [];
  if (status === 'submitted') {
    if (acceptanceRequiresScreenshot(order.acceptance)) {
      const hasScreenshot =
        items.some((a) => a.type === 'screenshot') || /截图|screen/i.test(content);
      if (!hasScreenshot) {
        throw new Error('本任务验收要求截图证明，请上传至少一张截图');
      }
    }
    if (!link?.trim() && /链接|link/i.test(order.acceptance)) {
      throw new Error('本任务验收要求交付链接，请填写链接');
    }
  }

  await prisma.orderDelivery.create({
    data: {
      orderId,
      content,
      link: link ?? null,
      attachments: items.length ? JSON.stringify(items) : null,
      status,
    },
  });

  const updated = await prisma.taskOrder.update({
    where: { id: orderId },
    data: { status: 'pending_review' },
    include: { deliveries: true, revisions: true, settlement: true },
  });
  if (status === 'submitted') {
    await notifyPublisherOrderPendingReview({
      brandName: order.brandName,
      orderId: order.id,
      orderTitle: order.title,
    });
  }
  return updated;
}

export async function confirmAcceptance(orderId: string) {
  const existing = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!existing) throw new Error('订单不存在');
  if (existing.status !== 'pending_review') {
    throw new Error('仅待验收订单可确认完成');
  }

  const order = await prisma.taskOrder.update({
    where: { id: orderId },
    data: { status: 'completed' },
  });

  const { releaseBudget } = await import('./budget.service.js');
  await releaseBudget(order.brandName, order.budget, orderId);

  const { ensureSettlementOnAcceptance } = await import('./settlement.service.js');
  await ensureSettlementOnAcceptance(orderId, order.budget);

  await appendAuditLog({
    action: 'order_acceptance_confirm',
    entity: 'TaskOrder',
    entityId: orderId,
    detail: `released:${order.budget}`,
  });
  return prisma.taskOrder.findUnique({
    where: { id: orderId },
    include: { deliveries: true, revisions: true, settlement: true },
  });
}

export async function requestRevision(orderId: string, reason: string, actor = 'merchant') {
  if (!reason.trim()) throw new Error('请填写返修原因');
  const existing = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!existing) throw new Error('订单不存在');
  if (existing.status !== 'pending_review') {
    throw new Error('仅待最终验收的订单可要求返修；文章草稿请在审稿区操作');
  }
  await prisma.orderRevision.create({ data: { orderId, reason, status: 'open' } });
  const order = await prisma.taskOrder.update({ where: { id: orderId }, data: { status: 'revision' } });
  if (existing?.providerId) {
    await createProviderNotification({
      providerId: existing.providerId,
      type: 'revision',
      title: '订单需返修',
      body: reason.slice(0, 200),
      refId: orderId,
    });
  }
  await appendAuditLog({
    action: 'order_revision_request',
    entity: 'TaskOrder',
    entityId: orderId,
    detail: `${actor}: ${reason}`,
  });
  return order;
}

export async function submitRevisionResponse(orderId: string, response: string) {
  if (!response.trim()) throw new Error('请填写返修说明');
  const order = await prisma.taskOrder.findUnique({
    where: { id: orderId },
    include: { revisions: { orderBy: { createdAt: 'desc' } } },
  });
  if (!order) throw new Error('订单不存在');
  if (order.status !== 'revision') throw new Error('仅最终返修中订单可提交响应');
  const openRevision = order.revisions.find((r) => r.status === 'open');
  if (!openRevision) throw new Error('无待处理返修记录');

  await prisma.orderRevision.update({
    where: { id: openRevision.id },
    data: { status: 'responded' },
  });

  await prisma.orderDelivery.create({
    data: {
      orderId,
      content: `【返修响应】${response}`,
      status: 'revision_response',
    },
  });

  return prisma.taskOrder.update({
    where: { id: orderId },
    data: { status: 'pending_review' },
    include: { deliveries: true, revisions: true, settlement: true },
  });
}

export async function listAllOrders() {
  return prisma.taskOrder.findMany({
    include: { deliveries: true, revisions: true, settlement: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function listAllOrdersPaginated(page = 1, pageSize = 20) {
  const { skip, take } = parsePagination({ page: String(page), pageSize: String(pageSize) }, pageSize);
  const [orders, total] = await Promise.all([
    prisma.taskOrder.findMany({
      include: { deliveries: true, revisions: true, settlement: true },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
    prisma.taskOrder.count(),
  ]);
  const result = paginatedResult(orders, total, page, pageSize);
  return { orders: result.items, total: result.total, page: result.page, pageSize: result.pageSize, hasMore: result.hasMore };
}

export { parseAttachments };

export async function listProviders() {
  return prisma.provider.findMany({ where: { status: 'active' } });
}

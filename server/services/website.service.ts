import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';
import { isAllBrandsScope } from './organization.service.js';

export type WebsiteAttachment = { name: string; url: string; mimeType?: string };

function parseJsonArray(raw: string | null | undefined): WebsiteAttachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as WebsiteAttachment[]) : [];
  } catch {
    return [];
  }
}

function mapWebsiteRequest<T extends { modules: string; attachments?: string | null }>(
  row: T & { orders?: unknown[] }
) {
  return {
    ...row,
    modules: JSON.parse(row.modules ?? '[]') as string[],
    attachments: parseJsonArray(row.attachments),
  };
}

export async function createWebsiteRequest(input: {
  brandName: string;
  pageType: string;
  goal: string;
  referenceUrl?: string;
  modules: string[];
  previewHtml?: string;
  taskId?: string;
  attachments?: WebsiteAttachment[];
}) {
  const row = await prisma.websiteRequest.create({
    data: {
      brandName: input.brandName,
      pageType: input.pageType,
      goal: input.goal,
      referenceUrl: input.referenceUrl,
      modules: JSON.stringify(input.modules),
      attachments: input.attachments?.length ? JSON.stringify(input.attachments) : null,
      previewHtml: input.previewHtml,
      taskId: input.taskId,
      status: input.previewHtml ? 'preview_ready' : 'draft',
    },
    include: { orders: true },
  });
  return mapWebsiteRequest(row);
}

export async function getWebsiteRequest(id: string) {
  const row = await prisma.websiteRequest.findUnique({ where: { id }, include: { orders: true } });
  return row ? mapWebsiteRequest(row) : null;
}

export async function listWebsiteRequests(filters?: {
  brandName?: string;
  status?: string;
}) {
  const brandFilter =
    filters?.brandName && !isAllBrandsScope(filters.brandName)
      ? { brandName: filters.brandName }
      : {};
  const rows = await prisma.websiteRequest.findMany({
    where: {
      ...brandFilter,
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: { orders: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapWebsiteRequest);
}

export async function updateWebsiteRequestAttachments(
  id: string,
  attachments: WebsiteAttachment[]
) {
  const row = await prisma.websiteRequest.update({
    where: { id },
    data: { attachments: attachments.length ? JSON.stringify(attachments) : null },
    include: { orders: true },
  });
  return mapWebsiteRequest(row);
}

export async function confirmWebsiteOrder(requestId: string) {
  const request = await prisma.websiteRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error('网页需求不存在');
  if (request.status === 'ordered') {
    const existing = await prisma.websiteOrder.findFirst({ where: { requestId } });
    if (existing) return existing;
  }

  const order = await prisma.websiteOrder.create({
    data: { requestId, brandName: request.brandName, status: 'pending' },
  });
  await prisma.websiteRequest.update({ where: { id: requestId }, data: { status: 'ordered' } });
  await appendAuditLog({
    action: 'website_order_created',
    entity: 'WebsiteOrder',
    entityId: order.id,
    detail: request.brandName,
  });
  return order;
}

export async function listWebsiteOrders(brandName?: string) {
  const brandFilter =
    brandName && !isAllBrandsScope(brandName) ? { brandName } : {};
  return prisma.websiteOrder.findMany({
    where: brandFilter,
    include: { request: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getWebsiteOrder(id: string) {
  const order = await prisma.websiteOrder.findUnique({
    where: { id },
    include: { request: true },
  });
  if (!order?.request) return order;
  return {
    ...order,
    request: mapWebsiteRequest(order.request),
  };
}

export async function assignWebsiteOrder(
  orderId: string,
  assigneeId: string,
  assigneeName: string,
  reason?: string
) {
  const order = await prisma.websiteOrder.update({
    where: { id: orderId },
    data: { assigneeId, assigneeName, status: 'in_progress' },
  });
  await appendAuditLog({
    action: 'website_order_assign',
    entity: 'WebsiteOrder',
    entityId: orderId,
    detail: `${assigneeName}:${reason ?? ''}`,
    source: 'platform',
  });
  return order;
}

export async function updateWebsiteOrderStatus(
  orderId: string,
  status: string,
  reason: string
) {
  const order = await prisma.websiteOrder.update({
    where: { id: orderId },
    data: { status },
  });
  await appendAuditLog({
    action: 'website_order_status_change',
    entity: 'WebsiteOrder',
    entityId: orderId,
    detail: `${status}:${reason}`,
    source: 'platform',
  });
  return order;
}

export async function submitWebsiteDelivery(
  orderId: string,
  previewUrl: string,
  deliveryNote?: string
) {
  if (!previewUrl.trim()) throw new Error('请填写交付预览链接');
  const order = await prisma.websiteOrder.update({
    where: { id: orderId },
    data: {
      previewUrl,
      deliveryNote: deliveryNote ?? null,
      status: 'pending_review',
    },
  });
  await appendAuditLog({
    action: 'website_order_delivery',
    entity: 'WebsiteOrder',
    entityId: orderId,
    detail: previewUrl,
    source: 'platform',
  });
  return order;
}

export async function requestWebsiteRevision(orderId: string, reason: string) {
  if (!reason.trim()) throw new Error('请填写返修原因');
  const order = await prisma.websiteOrder.update({
    where: { id: orderId },
    data: { status: 'revision', revisionReason: reason },
  });
  await appendAuditLog({
    action: 'website_order_revision',
    entity: 'WebsiteOrder',
    entityId: orderId,
    detail: reason,
    source: 'platform',
  });
  return order;
}

export async function listWebsiteOrdersForProvider(providerId: string) {
  return prisma.websiteOrder.findMany({
    where: {
      OR: [{ assigneeId: providerId }, { assigneeId: null, status: { in: ['pending', 'revision'] } }],
    },
    include: { request: true },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function providerClaimWebsiteOrder(
  orderId: string,
  providerId: string,
  providerName: string
) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider || provider.applicationStatus !== 'approved') {
    throw new Error('入驻审核通过后才可认领网站订单');
  }
  const order = await prisma.websiteOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('网站订单不存在');
  if (order.assigneeId && order.assigneeId !== providerId) {
    throw new Error('该订单已被其他人员接单');
  }
  return assignWebsiteOrder(orderId, providerId, providerName, '接单方认领');
}

export async function providerSubmitWebsiteDelivery(
  orderId: string,
  providerId: string,
  previewUrl: string,
  deliveryNote?: string
) {
  const order = await prisma.websiteOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('网站订单不存在');
  if (order.assigneeId !== providerId) throw new Error('无权提交该订单交付');
  return submitWebsiteDelivery(orderId, previewUrl, deliveryNote);
}

export async function completeWebsiteOrder(orderId: string, reason?: string) {
  const order = await prisma.websiteOrder.update({
    where: { id: orderId },
    data: { status: 'completed' },
  });
  await appendAuditLog({
    action: 'website_order_complete',
    entity: 'WebsiteOrder',
    entityId: orderId,
    detail: reason ?? '验收通过',
    source: 'platform',
  });
  return order;
}

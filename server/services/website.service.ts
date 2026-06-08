// 网页客资需求：发布端提交 → 平台线下交付登记。
// 不走 TaskOrder 接单申请、不走 ArticleDelivery 文章履约链路。
import {
  formatWebsiteLeadGoal,
  parseWebsiteLeadGoal,
} from '../../lib/website-lead-intake.js';
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
  keywords?: string;
  contact?: string;
  notes?: string;
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
      keywords: input.keywords ?? null,
      contact: input.contact ?? null,
      notes: input.notes ?? null,
      modules: JSON.stringify(input.modules),
      attachments: input.attachments?.length ? JSON.stringify(input.attachments) : null,
      previewHtml: input.previewHtml,
      taskId: input.taskId,
      status: input.previewHtml ? 'preview_ready' : 'submitted',
    },
    include: { orders: true },
  });
  return mapWebsiteRequest(row);
}

/** 发布端客资表单：创建需求并自动转执行订单（平台直接接单） */
export async function createWebsiteLeadRequest(input: {
  brandName: string;
  pageType: string;
  referenceUrl?: string;
  keywords: string;
  contact: string;
  notes?: string;
  modules?: string[];
}) {
  const goal = formatWebsiteLeadGoal({
    keywords: input.keywords,
    notes: input.notes ?? '',
    contact: input.contact,
  });
  const request = await createWebsiteRequest({
    brandName: input.brandName,
    pageType: input.pageType,
    goal,
    referenceUrl: input.referenceUrl,
    keywords: input.keywords.trim(),
    contact: input.contact.trim(),
    notes: input.notes?.trim() || undefined,
    modules: input.modules ?? ['客资提交'],
  });
  const order = await confirmWebsiteOrder(request.id);
  return { request, order };
}

/** 平台一期线下交付：登记预览链接并标记完成 */
export async function platformDeliverWebsiteOrder(
  orderId: string,
  input: { previewUrl: string; deliveryNote?: string }
) {
  await submitWebsiteDelivery(orderId, input.previewUrl, input.deliveryNote);
  return completeWebsiteOrder(orderId, input.deliveryNote ?? '平台线下交付完成');
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

export async function updateWebsiteRequest(
  id: string,
  input: {
    brandName?: string;
    pageType?: string;
    referenceUrl?: string | null;
    keywords?: string;
    contact?: string;
    notes?: string | null;
    modules?: string[];
    status?: string;
  }
) {
  const existing = await prisma.websiteRequest.findUnique({ where: { id } });
  if (!existing) throw new Error('需求不存在');

  const keywords =
    input.keywords !== undefined
      ? input.keywords
      : (existing.keywords ?? parseWebsiteLeadGoal(existing.goal).keywords);
  const notes =
    input.notes !== undefined
      ? (input.notes ?? '')
      : (existing.notes ?? parseWebsiteLeadGoal(existing.goal).notes);
  const contact =
    input.contact !== undefined
      ? input.contact
      : (existing.contact ?? parseWebsiteLeadGoal(existing.goal).contact);

  const row = await prisma.websiteRequest.update({
    where: { id },
    data: {
      ...(input.brandName !== undefined ? { brandName: input.brandName.trim() } : {}),
      ...(input.pageType !== undefined ? { pageType: input.pageType.trim() } : {}),
      ...(input.referenceUrl !== undefined ? { referenceUrl: input.referenceUrl || null } : {}),
      ...(input.keywords !== undefined ? { keywords: input.keywords.trim() || null } : {}),
      ...(input.contact !== undefined ? { contact: input.contact.trim() || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.modules !== undefined ? { modules: JSON.stringify(input.modules) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      goal: formatWebsiteLeadGoal({ keywords, notes, contact }),
    },
    include: { orders: true },
  });
  return mapWebsiteRequest(row);
}

export async function deleteWebsiteRequest(id: string) {
  const request = await prisma.websiteRequest.findUnique({
    where: { id },
    include: { orders: true },
  });
  if (!request) throw new Error('需求不存在');
  if (request.orders.length) throw new Error('已有关联执行订单，请先删除订单');
  await prisma.websiteRequest.delete({ where: { id } });
  await appendAuditLog({
    action: 'website_request_delete',
    entity: 'WebsiteRequest',
    entityId: id,
    detail: request.brandName,
    source: 'platform',
  });
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
  const rows = await prisma.websiteOrder.findMany({
    where: brandFilter,
    include: { request: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((o) =>
    o.request ? { ...o, request: mapWebsiteRequest(o.request) } : o
  );
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

export async function updateWebsiteOrder(
  orderId: string,
  input: {
    assigneeId?: string | null;
    assigneeName?: string | null;
    previewUrl?: string | null;
    deliveryNote?: string | null;
    status?: string;
  }
) {
  const order = await prisma.websiteOrder.update({
    where: { id: orderId },
    data: {
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
      ...(input.assigneeName !== undefined ? { assigneeName: input.assigneeName } : {}),
      ...(input.previewUrl !== undefined ? { previewUrl: input.previewUrl } : {}),
      ...(input.deliveryNote !== undefined ? { deliveryNote: input.deliveryNote } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    include: { request: true },
  });
  await appendAuditLog({
    action: 'website_order_update',
    entity: 'WebsiteOrder',
    entityId: orderId,
    detail: JSON.stringify(input),
    source: 'platform',
  });
  return order.request
    ? { ...order, request: mapWebsiteRequest(order.request) }
    : order;
}

export async function deleteWebsiteOrder(orderId: string) {
  const order = await prisma.websiteOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.status === 'completed') throw new Error('已交付订单不可删除');
  await prisma.websiteOrder.delete({ where: { id: orderId } });
  const remaining = await prisma.websiteOrder.count({ where: { requestId: order.requestId } });
  if (remaining === 0) {
    await prisma.websiteRequest.update({
      where: { id: order.requestId },
      data: { status: 'submitted' },
    });
  }
  await appendAuditLog({
    action: 'website_order_delete',
    entity: 'WebsiteOrder',
    entityId: orderId,
    detail: order.brandName,
    source: 'platform',
  });
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
    where: { assigneeId: providerId },
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

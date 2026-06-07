import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';
import { createProviderNotification } from './notification.service.js';
import { notifyPublisherArticleDraftSubmitted } from '../lib/publisher-notification-events.js';
import type { DeliveryAttachmentItem } from './order.service.js';
export function isArticleContentOrder(order: { type: string; deliverable: string }): boolean {
  const articleTypes = new Set(['种草', '探店', '问答覆盖', '测评', '文章', 'GEO']);
  if (articleTypes.has(order.type)) return true;
  return /文章|笔记|种草|测评|问答|文案/i.test(order.deliverable);
}

export async function submitArticleDraft(
  orderId: string,
  content: string,
  attachments?: DeliveryAttachmentItem[]
) {
  if (!content.trim()) throw new Error('请填写文章正文或草稿说明');

  const order = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('订单不存在');
  if (!isArticleContentOrder(order)) throw new Error('本订单非文章类任务，请使用通用交付');
  if (!['in_progress', 'draft_revision'].includes(order.status)) {
    throw new Error('当前状态不可提交文章草稿');
  }

  await prisma.orderDelivery.create({
    data: {
      orderId,
      content: content.trim(),
      attachments: attachments?.length ? JSON.stringify(attachments) : null,
      status: 'draft_submitted',
      stage: 'draft',
      reviewStatus: 'submitted',
    },
  });

  const updated = await prisma.taskOrder.update({
    where: { id: orderId },
    data: { status: 'draft_review' },
    include: { deliveries: true, revisions: true, settlement: true },
  });

  await appendAuditLog({
    action: 'order_draft_submit',
    entity: 'TaskOrder',
    entityId: orderId,
  });

  await notifyPublisherArticleDraftSubmitted({
    brandName: order.brandName,
    orderId: order.id,
    orderTitle: order.title,
  });

  return updated;
}

export async function approveArticleDraft(orderId: string, actor = 'merchant') {
  const order = await prisma.taskOrder.findUnique({
    where: { id: orderId },
    include: { deliveries: { orderBy: { createdAt: 'desc' } }, revisions: true, settlement: true },
  });
  if (!order) throw new Error('订单不存在');
  if (order.status !== 'draft_review') throw new Error('仅待审稿状态可通过审稿');

  const latestDraft = getLatestDraftDelivery(order.deliveries);
  if (!latestDraft) throw new Error('未找到待审草稿');

  await prisma.orderDelivery.update({
    where: { id: latestDraft.id },
    data: { reviewStatus: 'approved', reviewedAt: new Date() },
  });

  const updated = await prisma.taskOrder.update({
    where: { id: orderId },
    data: { status: 'draft_approved' },
    include: { deliveries: true, revisions: true, settlement: true },
  });

  if (order.providerId) {
    await createProviderNotification({
      providerId: order.providerId,
      type: 'order',
      title: '文章草稿已通过',
      body: `「${order.title}」审稿通过，请前往平台发布并回填链接与证明后提交最终交付。`,
      refId: orderId,
    });
  }

  await appendAuditLog({
    action: 'order_draft_approve',
    entity: 'TaskOrder',
    entityId: orderId,
    detail: actor,
  });

  return updated;
}

export async function requestArticleDraftRevision(orderId: string, reason: string, actor = 'merchant') {
  if (!reason.trim()) throw new Error('请填写修改意见');

  const order = await prisma.taskOrder.findUnique({
    where: { id: orderId },
    include: { deliveries: { orderBy: { createdAt: 'desc' } } },
  });
  if (!order) throw new Error('订单不存在');
  if (order.status !== 'draft_review') throw new Error('仅待审稿状态可要求修改');

  const latestDraft = getLatestDraftDelivery(order.deliveries);
  if (!latestDraft) throw new Error('未找到待审草稿');

  await prisma.orderDelivery.update({
    where: { id: latestDraft.id },
    data: {
      reviewStatus: 'revision_requested',
      reviewNote: reason.trim(),
      reviewedAt: new Date(),
    },
  });

  await prisma.orderRevision.create({
    data: { orderId, reason: `[审稿修改] ${reason.trim()}`, status: 'draft' },
  });

  const updated = await prisma.taskOrder.update({
    where: { id: orderId },
    data: { status: 'draft_revision' },
    include: { deliveries: true, revisions: true, settlement: true },
  });

  if (order.providerId) {
    await createProviderNotification({
      providerId: order.providerId,
      type: 'revision',
      title: '文章草稿需修改',
      body: reason.slice(0, 200),
      refId: orderId,
    });
  }

  await appendAuditLog({
    action: 'order_draft_revision',
    entity: 'TaskOrder',
    entityId: orderId,
    detail: `${actor}: ${reason}`,
  });

  return updated;
}

export async function submitFinalArticleDelivery(
  orderId: string,
  content: string,
  link?: string,
  attachments?: DeliveryAttachmentItem[]
) {
  if (!content.trim()) throw new Error('请填写发布说明');

  const order = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('订单不存在');
  if (!isArticleContentOrder(order)) throw new Error('本订单非文章类任务');
  if (!['draft_approved', 'revision'].includes(order.status)) {
    throw new Error('请先完成文章审稿通过，再提交发布链接与最终交付');
  }

  const items = attachments ?? [];
  if (!link?.trim()) {
    throw new Error('请填写已发布文章的链接');
  }
  const hasScreenshot =
    items.some((a) => a.type === 'screenshot') || /截图|screen/i.test(content);
  if (acceptanceRequiresScreenshot(order.acceptance) && !hasScreenshot) {
    throw new Error('请上传至少一张发布截图证明');
  }

  await prisma.orderDelivery.create({
    data: {
      orderId,
      content: content.trim(),
      link: link.trim(),
      attachments: items.length ? JSON.stringify(items) : null,
      status: 'final_submitted',
      stage: 'final',
    },
  });

  const updated = await prisma.taskOrder.update({
    where: { id: orderId },
    data: { status: 'pending_review' },
    include: { deliveries: true, revisions: true, settlement: true },
  });

  await appendAuditLog({
    action: 'order_final_delivery',
    entity: 'TaskOrder',
    entityId: orderId,
  });

  return updated;
}

function acceptanceRequiresScreenshot(acceptance: string): boolean {
  return /截图|screen/i.test(acceptance);
}

export function getLatestDraftDelivery<
  T extends { stage: string; reviewStatus: string | null; createdAt: Date | string }
>(deliveries: T[]): T | undefined {
  return deliveries
    .filter((d) => d.stage === 'draft' && d.reviewStatus === 'submitted')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

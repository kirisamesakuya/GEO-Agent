import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';
import { freezeBudget, releaseBudget } from './budget.service.js';
import {
  MIN_PROVIDER_NET_CENTS,
  splitFromProviderNetCents,
} from '../../lib/platform-fee.js';
import { isQuoteOrder, assertQuoteBypassAllowed } from '../../lib/quote-order.js';
import { ENABLE_PROVIDER_QUOTE, QUOTE_ACCEPT_FREEZE } from '../../lib/feature-flags.js';
import { createProviderNotification } from './notification.service.js';

export class QuoteError extends Error {
  code: string;
  httpStatus: number;
  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function maskQuoteForPublisher(quote: {
  id: string;
  providerId: string;
  providerName: string;
  publisherPayAmountCents: number;
  mediaName: string | null;
  mediaType: string | null;
  publishPlatform: string | null;
  estimatedPublishAt: Date | null;
  deliveryPromise: string | null;
  includeLink: boolean;
  includeScreenshot: boolean;
  includeIndexingProof: boolean;
  message: string | null;
  status: string;
  createdAt: Date;
}) {
  return {
    id: quote.id,
    providerId: quote.providerId,
    providerName: quote.providerName,
    publisherPayAmountCents: quote.publisherPayAmountCents,
    publisherPayAmountYuan: (quote.publisherPayAmountCents / 100).toFixed(2),
    mediaName: quote.mediaName,
    mediaType: quote.mediaType,
    publishPlatform: quote.publishPlatform,
    estimatedPublishAt: quote.estimatedPublishAt?.toISOString() ?? null,
    deliveryPromise: quote.deliveryPromise,
    includeLink: quote.includeLink,
    includeScreenshot: quote.includeScreenshot,
    includeIndexingProof: quote.includeIndexingProof,
    message: quote.message,
    status: quote.status,
    createdAt: quote.createdAt.toISOString(),
  };
}

function maskQuoteForProvider(quote: Record<string, unknown>) {
  return quote;
}

export async function submitTaskOrderQuote(
  orderId: string,
  providerId: string,
  providerName: string,
  input: {
    providerExpectedIncomeCents: number;
    mediaName?: string;
    mediaType?: string;
    publishPlatform?: string;
    estimatedPublishAt?: string;
    quoteExpiresAt: string;
    includeLink?: boolean;
    includeScreenshot?: boolean;
    includeIndexingProof?: boolean;
    deliveryPromise?: string;
    overRangeReason?: string | null;
    message?: string;
  }
) {
  if (!ENABLE_PROVIDER_QUOTE) throw new QuoteError('QUOTE_DISABLED', '报价撮合未开启');

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new QuoteError('PROVIDER_NOT_FOUND', '接单方不存在');
  if (provider.applicationStatus !== 'approved') {
    throw new QuoteError('PROVIDER_NOT_APPROVED', '入驻审核通过后才可报价', 403);
  }

  const order = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!order || !isQuoteOrder(order)) {
    throw new QuoteError('QUOTE_PRICING_MODE_REQUIRED', '该任务不支持报价');
  }
  if (!['quote_open', 'quote_review'].includes(order.status)) {
    throw new QuoteError('QUOTE_ORDER_NOT_OPEN', '任务当前不可报价');
  }

  const netCents = input.providerExpectedIncomeCents;
  if (!Number.isInteger(netCents) || netCents < MIN_PROVIDER_NET_CENTS) {
    throw new QuoteError('QUOTE_BELOW_MIN', `期望到手价不能低于 ¥${MIN_PROVIDER_NET_CENTS / 100}`);
  }

  const expiresAt = new Date(input.quoteExpiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    throw new QuoteError('QUOTE_EXPIRED', '请设置有效的报价有效期');
  }

  const split = splitFromProviderNetCents(netCents);
  if (order.perTaskBudgetCapCents && split.publisherPayAmountCents > order.perTaskBudgetCapCents) {
    throw new QuoteError('QUOTE_OVER_TASK_CAP', '成交支付价超过单任务上限');
  }

  if (
    order.suggestedMinCents &&
    order.suggestedMaxCents &&
    (netCents < order.suggestedMinCents || netCents > order.suggestedMaxCents) &&
    !input.overRangeReason?.trim()
  ) {
    throw new QuoteError('QUOTE_OVER_RANGE', '报价超出建议区间，请填写原因');
  }

  const existing = await prisma.taskOrderQuote.findFirst({
    where: { orderId, providerId, status: 'pending' },
  });
  if (existing) throw new QuoteError('QUOTE_DUPLICATE', '您已提交过报价');

  const quote = await prisma.$transaction(async (tx) => {
    const q = await tx.taskOrderQuote.create({
      data: {
        orderId,
        providerId,
        providerName,
        providerExpectedIncomeCents: netCents,
        publisherPayAmountCents: split.publisherPayAmountCents,
        platformServiceFeeCents: split.platformServiceFeeCents,
        serviceFeeRateBps: split.serviceFeeRateBps,
        mediaName: input.mediaName ?? null,
        mediaType: input.mediaType ?? null,
        publishPlatform: input.publishPlatform ?? order.platform,
        estimatedPublishAt: input.estimatedPublishAt ? new Date(input.estimatedPublishAt) : null,
        deliveryPromise: input.deliveryPromise ?? null,
        includeLink: input.includeLink ?? false,
        includeScreenshot: input.includeScreenshot ?? true,
        includeIndexingProof: input.includeIndexingProof ?? false,
        overRangeReason: input.overRangeReason ?? null,
        quoteExpiresAt: expiresAt,
        message: input.message ?? null,
        status: 'pending',
      },
    });
    if (order.status === 'quote_open') {
      await tx.taskOrder.update({ where: { id: orderId }, data: { status: 'quote_review' } });
    }
    return q;
  });

  await appendAuditLog({
    action: 'quote_submit',
    entity: 'TaskOrderQuote',
    entityId: quote.id,
    detail: `${orderId}:${providerId}`,
  });

  return maskQuoteForProvider(quote as unknown as Record<string, unknown>);
}

export async function listProviderQuotes(providerId: string) {
  const rows = await prisma.taskOrderQuote.findMany({
    where: { providerId },
    orderBy: { createdAt: 'desc' },
    include: { order: { select: { id: true, title: true, brandName: true, status: true, platform: true } } },
  });
  return rows.map((q) => ({
    ...q,
    publisherPayAmountYuan: (q.publisherPayAmountCents / 100).toFixed(2),
    providerExpectedIncomeYuan: (q.providerExpectedIncomeCents / 100).toFixed(2),
    platformServiceFeeYuan: (q.platformServiceFeeCents / 100).toFixed(2),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    quoteExpiresAt: q.quoteExpiresAt?.toISOString() ?? null,
    estimatedPublishAt: q.estimatedPublishAt?.toISOString() ?? null,
  }));
}

export async function getOrderWithQuotesForPublisher(orderId: string, brandName: string) {
  const order = await prisma.taskOrder.findUnique({
    where: { id: orderId },
    include: {
      quotes: { where: { status: { in: ['pending', 'accepted'] } }, orderBy: { createdAt: 'asc' } },
      deliveries: true,
      revisions: true,
      settlement: true,
    },
  });
  if (!order || order.brandName !== brandName) return null;
  return {
    ...order,
    quotes: order.quotes.map(maskQuoteForPublisher),
  };
}

export async function acceptTaskOrderQuote(
  orderId: string,
  quoteId: string,
  brandName: string,
  idempotencyKey?: string
) {
  if (!ENABLE_PROVIDER_QUOTE) throw new QuoteError('QUOTE_DISABLED', '报价撮合未开启');

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.taskOrder.findUnique({ where: { id: orderId } });
    if (!order || order.brandName !== brandName) {
      throw new QuoteError('ORDER_NOT_FOUND', '订单不存在', 404);
    }
    if (!isQuoteOrder(order)) throw new QuoteError('QUOTE_PRICING_MODE_REQUIRED', '非报价任务');
    if (!['quote_open', 'quote_review'].includes(order.status)) {
      throw new QuoteError('QUOTE_ORDER_NOT_OPEN', '任务当前不可确认报价');
    }
    if (order.selectedQuoteId && order.selectedQuoteId !== quoteId) {
      throw new QuoteError('QUOTE_ALREADY_SELECTED', '已选中其他报价', 409);
    }
    if (order.selectedQuoteId === quoteId && order.status === 'matched') {
      return { order, quote: await tx.taskOrderQuote.findUnique({ where: { id: quoteId } }), idempotent: true };
    }

    const quote = await tx.taskOrderQuote.findUnique({ where: { id: quoteId } });
    if (!quote || quote.orderId !== orderId) throw new QuoteError('QUOTE_NOT_FOUND', '报价不存在', 404);
    if (quote.status !== 'pending') throw new QuoteError('QUOTE_NOT_PENDING', '报价不可确认');
    if (quote.quoteExpiresAt && quote.quoteExpiresAt <= new Date()) {
      throw new QuoteError('QUOTE_EXPIRED', '报价已过期');
    }

    const gCents = quote.publisherPayAmountCents;
    if (order.perTaskBudgetCapCents && gCents > order.perTaskBudgetCapCents) {
      throw new QuoteError('QUOTE_OVER_TASK_CAP', '成交支付价超过单任务上限');
    }

    if (order.hiddenBudgetMaxCents) {
      const planFrozen = await tx.taskOrder.aggregate({
        where: {
          brandName,
          planId: order.planId ?? undefined,
          status: { in: ['matched', 'in_progress', 'pending_review', 'awaiting_freeze'] },
        },
        _sum: { publisherPayAmountCents: true },
      });
      const frozenTotal = planFrozen._sum.publisherPayAmountCents ?? 0;
      if (frozenTotal + gCents > order.hiddenBudgetMaxCents) {
        throw new QuoteError('QUOTE_OVER_PLAN_CAP', '超过隐藏预算总上限');
      }
    }

    await tx.taskOrder.update({
      where: { id: orderId },
      data: { status: 'awaiting_freeze', selectedQuoteId: quoteId },
    });

    if (QUOTE_ACCEPT_FREEZE) {
      const freeze = await freezeBudget(brandName, gCents / 100, idempotencyKey ?? orderId);
      if (!freeze.ok) {
        await tx.taskOrder.update({ where: { id: orderId }, data: { status: 'quote_review', selectedQuoteId: null } });
        throw new QuoteError('FREEZE_INSUFFICIENT_BALANCE', freeze.error ?? '余额不足');
      }
    }

    const updatedOrder = await tx.taskOrder.update({
      where: { id: orderId },
      data: {
        status: 'matched',
        selectedQuoteId: quoteId,
        acceptedAt: new Date(),
        providerId: quote.providerId,
        providerName: quote.providerName,
        publisherPayAmountCents: quote.publisherPayAmountCents,
        platformServiceFeeCents: quote.platformServiceFeeCents,
        providerIncomeCents: quote.providerExpectedIncomeCents,
        serviceFeeRateBps: quote.serviceFeeRateBps,
        feeChargeSide: 'provider',
        budget: quote.publisherPayAmountCents / 100,
        freezeRequestId: idempotencyKey ?? orderId,
      },
    });

    await tx.taskOrderQuote.update({ where: { id: quoteId }, data: { status: 'accepted' } });
    await tx.taskOrderQuote.updateMany({
      where: { orderId, id: { not: quoteId }, status: 'pending' },
      data: { status: 'rejected' },
    });

    return { order: updatedOrder, quote, idempotent: false };
  });

  if (!result.idempotent) {
    await appendAuditLog({
      action: 'quote_accept',
      entity: 'TaskOrder',
      entityId: orderId,
      detail: quoteId,
    });
    await createProviderNotification({
      providerId: result.quote!.providerId,
      type: 'quote_accepted',
      title: '报价已被确认',
      body: `任务「${result.order.title}」报价已确认，请开始履约`,
      refId: orderId,
    });
  }

  return result.order;
}

export async function rejectTaskOrderQuote(orderId: string, quoteId: string, brandName: string) {
  const order = await prisma.taskOrder.findUnique({ where: { id: orderId } });
  if (!order || order.brandName !== brandName) throw new QuoteError('ORDER_NOT_FOUND', '订单不存在', 404);

  const quote = await prisma.taskOrderQuote.updateMany({
    where: { id: quoteId, orderId, status: 'pending' },
    data: { status: 'rejected' },
  });
  if (!quote.count) throw new QuoteError('QUOTE_NOT_FOUND', '报价不存在');

  await appendAuditLog({ action: 'quote_reject', entity: 'TaskOrderQuote', entityId: quoteId, detail: orderId });
  return { ok: true };
}

export { assertQuoteBypassAllowed, isQuoteOrder };

import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';

export async function getAiCredits(brandName: string) {
  let row = await prisma.aiCredits.findUnique({
    where: { brandName },
    include: { mirror: true },
  });
  if (!row) {
    row = await prisma.aiCredits.create({
      data: { brandName, balance: 1000 },
      include: { mirror: true },
    });
  }
  return {
    brandName: row.brandName,
    balance: row.balance,
    lastSyncAt: row.mirror?.lastSyncAt?.toISOString() ?? null,
    mirroredBalance: row.mirror?.mirroredBalance ?? null,
  };
}

export async function syncAiCreditsFromCloud(brandName: string) {
  const current = await getAiCredits(brandName);
  const externalBalance = current.balance + Math.floor(Math.random() * 30) + 5;

  await prisma.aiCreditMirror.upsert({
    where: { brandName },
    create: {
      brandName,
      mirroredBalance: externalBalance,
      lastSyncAt: new Date(),
      externalUserId: 'agentsyun-demo',
    },
    update: {
      mirroredBalance: externalBalance,
      lastSyncAt: new Date(),
    },
  });

  const row = await prisma.aiCredits.update({
    where: { brandName },
    data: { balance: externalBalance },
    include: { mirror: true },
  });

  await prisma.aiCreditSyncLog.create({
    data: {
      brandName,
      balance: externalBalance,
      status: 'ok',
      detail: '演示同步：Agent 云镜像余额',
    },
  });

  await appendAuditLog({
    action: 'ai_credits_sync',
    entity: 'AiCredits',
    entityId: brandName,
    detail: String(externalBalance),
  });

  return {
    brandName: row.brandName,
    balance: row.balance,
    lastSyncAt: row.mirror?.lastSyncAt?.toISOString() ?? new Date().toISOString(),
    mirroredBalance: externalBalance,
  };
}

export async function addAiCredits(brandName: string, amount: number, note?: string) {
  const current = await getAiCredits(brandName);
  const row = await prisma.aiCredits.update({
    where: { brandName },
    data: { balance: current.balance + amount },
  });
  await appendAuditLog({
    action: 'ai_credits_deposit',
    entity: 'AiCredits',
    entityId: brandName,
    detail: note ?? `+${amount}`,
  });
  return getAiCredits(brandName);
}

export async function consumeAiCredits(
  brandName: string,
  amount: number
): Promise<{ ok: boolean; balance: number; error?: string }> {
  const current = await getAiCredits(brandName);
  if (current.balance < amount) {
    return { ok: false, balance: current.balance, error: 'AI 算力不足，请前往 AI 算力页充值' };
  }
  const row = await prisma.aiCredits.update({
    where: { brandName },
    data: { balance: current.balance - amount },
  });
  return { ok: true, balance: row.balance };
}

export async function checkAiCredits(
  brandName: string,
  required = 10
): Promise<{ ok: boolean; balance: number; error?: string }> {
  const current = await getAiCredits(brandName);
  if (current.balance < required) {
    return {
      ok: false,
      balance: current.balance,
      error: 'AI 算力不足，请前往 AI 算力页同步或充值',
    };
  }
  return { ok: true, balance: current.balance };
}

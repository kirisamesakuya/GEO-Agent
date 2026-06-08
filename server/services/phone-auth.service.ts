import { randomInt } from 'crypto';
import type { Request } from 'express';
import { prisma } from '../db/client.js';
import { createSession } from './auth.service.js';
import { getAuthMode } from '../middleware/request-context.js';

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
export const MOCK_VERIFICATION_CODE = '123456';

function normalizePhone(phone: string) {
  const p = phone.trim();
  if (!/^1\d{10}$/.test(p)) {
    throw new Error('请输入有效的 11 位手机号');
  }
  return p;
}

function generateCode() {
  if (getAuthMode() === 'demo' || process.env.NODE_ENV !== 'production') {
    return MOCK_VERIFICATION_CODE;
  }
  return String(randomInt(100000, 999999));
}

export async function sendVerificationCode(phone: string, scene: 'register' | 'login') {
  const normalized = normalizePhone(phone);
  const recent = await prisma.verificationCode.findFirst({
    where: { phone: normalized, scene },
    orderBy: { createdAt: 'desc' },
  });
  if (recent && !recent.usedAt && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new Error('发送过于频繁，请稍后再试');
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await prisma.verificationCode.create({
    data: { phone: normalized, code, scene, expiresAt },
  });

  const response: { ok: true; expiresAt: string; mockCode?: string } = {
    ok: true,
    expiresAt: expiresAt.toISOString(),
  };
  if (getAuthMode() === 'demo' || process.env.NODE_ENV !== 'production') {
    response.mockCode = code;
  }
  return response;
}

async function verifyCode(phone: string, code: string, scene: 'register' | 'login') {
  const normalized = normalizePhone(phone);
  const trimmedCode = code.trim();
  const record = await prisma.verificationCode.findFirst({
    where: { phone: normalized, scene, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw new Error('验证码无效或已过期');
  if (record.expiresAt < new Date()) throw new Error('验证码已过期');
  if (record.code !== trimmedCode) throw new Error('验证码错误');

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return normalized;
}

async function appendLoginLog(input: {
  userId?: string;
  phone: string;
  req: Request;
  result: 'success' | 'failed';
  reason?: string;
}) {
  await prisma.loginLog.create({
    data: {
      userId: input.userId,
      phone: input.phone,
      ip: input.req.ip ?? input.req.socket.remoteAddress ?? undefined,
      userAgent: input.req.headers['user-agent']?.slice(0, 500),
      result: input.result,
      reason: input.reason,
    },
  });
}

export async function registerWithPhone(input: {
  phone: string;
  code: string;
  displayName?: string;
  req: Request;
}) {
  const phone = await verifyCode(input.phone, input.code, 'register');
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    await appendLoginLog({
      userId: existing.id,
      phone,
      req: input.req,
      result: 'failed',
      reason: '手机号已注册',
    });
    throw new Error('该手机号已注册，请直接登录');
  }

  const displayName = input.displayName?.trim() || `用户${phone.slice(-4)}`;
  const user = await prisma.user.create({
    data: { phone, displayName, accountType: 'personal', status: 'active' },
  });

  const { token, expiresAt } = await createSession(user.id);
  await appendLoginLog({ userId: user.id, phone, req: input.req, result: 'success' });
  return { user, token, expiresAt };
}

export async function loginWithPhone(input: { phone: string; code: string; req: Request }) {
  const phone = await verifyCode(input.phone, input.code, 'login');
  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        displayName: `用户${phone.slice(-4)}`,
        accountType: 'personal',
        status: 'active',
      },
    });
  }
  if (user.status !== 'active') {
    await appendLoginLog({
      userId: user.id,
      phone,
      req: input.req,
      result: 'failed',
      reason: '账号已冻结',
    });
    throw new Error('账号已冻结，请联系平台客服');
  }

  const { token, expiresAt } = await createSession(user.id);
  await appendLoginLog({ userId: user.id, phone, req: input.req, result: 'success' });
  return { user, token, expiresAt };
}

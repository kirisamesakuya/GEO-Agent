import type { Express } from 'express';
import { getAuthMode } from '../middleware/request-context.js';
import {
  clearSessionCookieHeader,
  createSession,
  deleteSession,
  DEMO_USER_IDS,
  ensureDemoAuthUsers,
  parseSessionToken,
  resolveContextFromSession,
  resolveDemoContext,
  sessionCookieHeader,
} from '../services/auth.service.js';
import { prisma } from '../db/client.js';
import { getProvider } from '../services/provider.service.js';

export function registerAuthRoutes(app: Express) {
  app.get('/api/auth/me', async (req, res) => {
    if (!req.ctx) {
      return res.status(401).json({ error: '未登录', authMode: getAuthMode() });
    }
    res.json({
      userId: req.ctx.userId,
      userType: req.ctx.userType,
      authMode: req.ctx.authMode,
      organizationId: req.ctx.organizationId,
      brandIds: req.ctx.brandIds,
      brandName: req.ctx.brandName,
      providerId: req.ctx.providerId,
      platformRole: req.ctx.platformRole,
    });
  });

  app.get('/api/provider/me', async (req, res) => {
    const providerId = req.ctx?.providerId;
    if (!providerId) {
      return res.status(401).json({
        error: '未登录或未绑定接单方',
        authMode: getAuthMode(),
      });
    }
    const provider = await getProvider(providerId);
    if (!provider) return res.status(404).json({ error: '接单方不存在' });
    res.json({ provider, authMode: req.ctx?.authMode ?? getAuthMode() });
  });

  app.get('/api/publisher/me', async (req, res) => {
    if (!req.ctx || req.ctx.userType !== 'publisher') {
      return res.status(401).json({
        error: '未登录或非商家端用户',
        authMode: getAuthMode(),
      });
    }
    const brands = req.ctx.brandIds?.length
      ? await prisma.brand.findMany({
          where: { id: { in: req.ctx.brandIds }, status: { not: 'archived' } },
          select: { id: true, name: true, isDefault: true },
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        })
      : req.ctx.organizationId
        ? await prisma.brand.findMany({
            where: { organizationId: req.ctx.organizationId, status: { not: 'archived' } },
            select: { id: true, name: true, isDefault: true },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
          })
        : [];
    res.json({
      userId: req.ctx.userId,
      organizationId: req.ctx.organizationId,
      brandName: req.ctx.brandName,
      brands,
      authMode: req.ctx.authMode,
    });
  });

  app.post('/api/auth/demo-login', async (req, res) => {
    if (getAuthMode() !== 'demo') {
      return res.status(403).json({ error: '生产环境不支持 Demo 登录' });
    }
    const userType = (req.body?.userType ?? 'publisher') as 'publisher' | 'provider' | 'platform';
    const userId =
      userType === 'provider'
        ? DEMO_USER_IDS.provider
        : userType === 'platform'
          ? DEMO_USER_IDS.platform
          : DEMO_USER_IDS.publisher;

    const firstProvider = await prisma.provider.findFirst({
      where: { applicationStatus: 'approved' },
      orderBy: { createdAt: 'asc' },
    });
    await ensureDemoAuthUsers(firstProvider?.id);

    const { token, expiresAt } = await createSession(userId);
    res.setHeader('Set-Cookie', sessionCookieHeader(token, expiresAt));
    const ctx = await resolveContextFromSession(token);
    res.json({ ok: true, authMode: 'demo', context: ctx ?? (await resolveDemoContext(req)) });
  });

  app.post('/api/auth/logout', async (req, res) => {
    const token = parseSessionToken(req);
    if (token) await deleteSession(token);
    res.setHeader('Set-Cookie', clearSessionCookieHeader());
    res.json({ ok: true });
  });
}

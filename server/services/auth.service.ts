import { randomBytes } from 'crypto';
import type { Request } from 'express';
import { prisma } from '../db/client.js';
import {
  getPlatformRoleFromRequest,
  isValidPlatformRole,
  type PlatformRole,
} from '../lib/platform-auth.js';
import type { AuthMode, RequestContext, UserType } from '../middleware/request-context.js';
import { getAuthMode } from '../middleware/request-context.js';

const SESSION_COOKIE = 'geo_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const DEMO_USER_IDS = {
  publisher: 'publisher-demo',
  provider: 'provider-demo',
  platform: 'platform-demo',
} as const;

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function parseSessionToken(req: Request): string | null {
  const header = req.headers.cookie ?? '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1]?.trim() ?? null;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  return { token, expiresAt };
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function resolveContextFromSession(token: string): Promise<RequestContext | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          providerLinks: { take: 1, orderBy: { createdAt: 'asc' } },
          platformRoles: { take: 1, orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  const user = session.user;
  if (user.status !== 'active') return null;

  const providerLink = user.providerLinks[0];
  if (providerLink) {
    return {
      userId: user.id,
      userType: 'provider',
      authMode: 'session',
      providerId: providerLink.providerId,
    };
  }

  const platformRole = user.platformRoles[0]?.role;
  if (platformRole && isValidPlatformRole(platformRole)) {
    return {
      userId: user.id,
      userType: 'platform',
      authMode: 'session',
      platformRole,
    };
  }

  const orgMember = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });
  const brandIds = orgMember
    ? (
        await prisma.brand.findMany({
          where: { organizationId: orgMember.organizationId },
          select: { id: true, name: true },
        })
      ).map((b) => b.id)
    : [];

  const defaultBrand = orgMember
    ? await prisma.brand.findFirst({
        where: { organizationId: orgMember.organizationId, isDefault: true },
        select: { name: true },
      })
    : null;

  return {
    userId: user.id,
    userType: 'publisher',
    authMode: 'session',
    organizationId: orgMember?.organizationId,
    brandIds,
    brandName: defaultBrand?.name,
  };
}

function inferUserTypeFromPath(path: string): UserType {
  if (path.startsWith('/api/provider')) return 'provider';
  if (path.startsWith('/api/platform')) return 'platform';
  return 'publisher';
}

function readClientProviderId(req: Request): string {
  const fromQuery = typeof req.query.providerId === 'string' ? req.query.providerId : '';
  const fromBody = (req.body as { providerId?: string } | undefined)?.providerId ?? '';
  const fromHeader = req.headers['x-demo-provider-id'];
  const fromHeaderStr = typeof fromHeader === 'string' ? fromHeader : Array.isArray(fromHeader) ? fromHeader[0] : '';
  return (fromQuery || fromBody || fromHeaderStr || '').trim();
}

function readClientBrandName(req: Request): string {
  const fromQuery = typeof req.query.brandName === 'string' ? req.query.brandName : '';
  const fromBody = (req.body as { brandName?: string } | undefined)?.brandName ?? '';
  const fromHeader = req.headers['x-demo-brand-name'];
  const fromHeaderStr = typeof fromHeader === 'string' ? fromHeader : Array.isArray(fromHeader) ? fromHeader[0] : '';
  return (fromQuery || fromBody || fromHeaderStr || '').trim();
}

/**
 * DEMO_ONLY:
 * Demo 模式下从请求路径与参数推断身份上下文，仅用于本地演示。
 *
 * PRODUCTION_TODO:
 * 生产环境 AUTH_MODE=session，身份必须来自 Session / Token，不得信任前端参数。
 */
export async function resolveDemoContext(req: Request): Promise<RequestContext> {
  const userType = inferUserTypeFromPath(req.path);
  const providerId = readClientProviderId(req);
  const brandName = readClientBrandName(req);
  const platformRole = getPlatformRoleFromRequest(req);

  if (userType === 'provider') {
    let resolvedProviderId = providerId;
    if (!resolvedProviderId) {
      const link = await prisma.providerUser.findFirst({
        where: { userId: DEMO_USER_IDS.provider },
        orderBy: { createdAt: 'asc' },
      });
      resolvedProviderId = link?.providerId ?? '';
    }
    return {
      userId: DEMO_USER_IDS.provider,
      userType: 'provider',
      authMode: 'demo',
      providerId: resolvedProviderId || undefined,
    };
  }

  if (userType === 'platform') {
    return {
      userId: DEMO_USER_IDS.platform,
      userType: 'platform',
      authMode: 'demo',
      platformRole: platformRole ?? 'admin',
    };
  }

  const orgMember = await prisma.organizationMember.findFirst({
    where: { userId: DEMO_USER_IDS.publisher },
    orderBy: { createdAt: 'asc' },
  });
  const resolvedBrandName =
    brandName ||
    (orgMember
      ? (
          await prisma.brand.findFirst({
            where: { organizationId: orgMember.organizationId, isDefault: true },
            select: { name: true },
          })
        )?.name
      : undefined) ||
    '云杉口腔';

  const brandIds = orgMember
    ? (
        await prisma.brand.findMany({
          where: { organizationId: orgMember.organizationId },
          select: { id: true },
        })
      ).map((b) => b.id)
    : [];

  return {
    userId: DEMO_USER_IDS.publisher,
    userType: 'publisher',
    authMode: 'demo',
    organizationId: orgMember?.organizationId,
    brandIds,
    brandName: resolvedBrandName,
  };
}

export async function resolveRequestContext(req: Request): Promise<RequestContext | null> {
  const token = parseSessionToken(req);
  if (token) {
    const fromSession = await resolveContextFromSession(token);
    if (fromSession) return fromSession;
  }

  if (getAuthMode() === 'demo') {
    return resolveDemoContext(req);
  }

  return null;
}

export async function ensureDemoAuthUsers(providerId?: string) {
  const users = [
    { id: DEMO_USER_IDS.publisher, displayName: 'Demo 商家用户' },
    { id: DEMO_USER_IDS.provider, displayName: 'Demo 接单用户' },
    { id: DEMO_USER_IDS.platform, displayName: 'Demo 平台用户' },
  ];

  const phoneById: Record<string, string> = {
    [DEMO_USER_IDS.publisher]: '13800001001',
    [DEMO_USER_IDS.provider]: '13800001111',
    [DEMO_USER_IDS.platform]: '13800002999',
  };
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        displayName: u.displayName,
        phone: phoneById[u.id],
        accountType: u.id === DEMO_USER_IDS.publisher ? 'enterprise' : 'personal',
        status: 'active',
      },
      update: {
        displayName: u.displayName,
        phone: phoneById[u.id],
        status: 'active',
      },
    });
  }

  await prisma.platformUserRole.upsert({
    where: { userId_role: { userId: DEMO_USER_IDS.platform, role: 'admin' } },
    create: { userId: DEMO_USER_IDS.platform, role: 'admin' },
    update: {},
  });

  if (providerId) {
    await prisma.providerUser.upsert({
      where: { providerId_userId: { providerId, userId: DEMO_USER_IDS.provider } },
      create: { providerId, userId: DEMO_USER_IDS.provider, role: 'owner' },
      update: {},
    });
  }
}

export function sessionCookieHeader(token: string, expiresAt: Date): string {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export type { AuthMode, PlatformRole };

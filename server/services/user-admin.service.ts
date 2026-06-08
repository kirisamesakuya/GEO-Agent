import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';
import { getProviderWalletSummary, listWithdrawalRequests } from './withdrawal.service.js';

export type AdminUserType = 'publisher' | 'provider' | 'platform';

function deriveUserType(user: {
  platformRoles: { role: string }[];
  providerLinks: { providerId: string }[];
  id: string;
}, orgMember: boolean): AdminUserType {
  if (user.platformRoles.length > 0) return 'platform';
  if (user.providerLinks.length > 0) return 'provider';
  if (orgMember) return 'publisher';
  const knownPublisherIds = ['publisher-demo'];
  if (knownPublisherIds.includes(user.id)) return 'publisher';
  return 'publisher';
}

export async function listPlatformUsers(options?: {
  q?: string;
  userNo?: string;
  phone?: string;
  displayName?: string;
  organizationName?: string;
  certStatus?: string;
  userType?: AdminUserType;
  accountType?: 'personal' | 'enterprise';
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const {
    q,
    userNo,
    phone,
    displayName,
    organizationName,
    certStatus,
    userType,
    accountType,
    status,
    page = 1,
    pageSize = 30,
  } = options ?? {};
  const where: Record<string, unknown> = {};
  if (accountType) where.accountType = accountType;
  if (status) where.status = status;

  if (userNo?.trim() && /^\d+$/.test(userNo.trim())) {
    const n = Number(userNo.trim());
    if (Number.isSafeInteger(n) && n > 0) where.userNo = n;
  }
  if (phone?.trim()) where.phone = { contains: phone.trim() };
  if (displayName?.trim()) where.displayName = { contains: displayName.trim() };

  if (q?.trim() && !userNo?.trim() && !phone?.trim() && !displayName?.trim()) {
    const qTrim = q.trim();
    const or: Record<string, unknown>[] = [
      { phone: { contains: qTrim } },
      { displayName: { contains: qTrim } },
      { email: { contains: qTrim } },
    ];
    if (/^\d+$/.test(qTrim)) {
      const n = Number(qTrim);
      if (Number.isSafeInteger(n) && n > 0) or.push({ userNo: n });
    }
    where.OR = or;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        platformRoles: true,
        providerLinks: {
          include: { provider: { select: { id: true, name: true, applicationStatus: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  const userIds = users.map((u) => u.id);
  const orgMembers = await prisma.organizationMember.findMany({
    where: { userId: { in: userIds } },
    include: { organization: { select: { id: true, name: true, certStatus: true } } },
  });
  const orgByUser = new Map(orgMembers.map((m) => [m.userId, m]));

  const lastLogins = await Promise.all(
    userIds.map(async (userId) => {
      const log = await prisma.loginLog.findFirst({
        where: { userId, result: 'success' },
        orderBy: { createdAt: 'desc' },
      });
      return [userId, log?.createdAt.toISOString() ?? null] as const;
    })
  );
  const lastLoginMap = new Map(lastLogins);

  let rows = users.map((u) => {
    const org = orgByUser.get(u.id);
    const derivedType = deriveUserType(u, Boolean(org));
    return {
      id: u.id,
      userNo: u.userNo,
      phone: u.phone,
      displayName: u.displayName,
      accountType: u.accountType,
      status: u.status,
      userType: derivedType,
      platformRole: u.platformRoles[0]?.role ?? null,
      providerName: u.providerLinks[0]?.provider.name ?? null,
      providerApplicationStatus: u.providerLinks[0]?.provider.applicationStatus ?? null,
      organizationName: org?.organization.name ?? null,
      certStatus: org?.organization.certStatus ?? null,
      createdAt: u.createdAt.toISOString(),
      lastLogin: lastLoginMap.get(u.id) ?? null,
    };
  });

  if (userType) {
    rows = rows.filter((r) => r.userType === userType);
  }

  if (organizationName?.trim()) {
    const orgQ = organizationName.trim();
    rows = rows.filter((r) => (r.organizationName ?? '').includes(orgQ));
  }

  if (certStatus) {
    if (certStatus === 'uncertified') {
      rows = rows.filter((r) => !r.certStatus || r.certStatus === 'uncertified');
    } else {
      rows = rows.filter((r) => r.certStatus === certStatus);
    }
  }

  const stats = {
    total: await prisma.user.count(),
    personal: await prisma.user.count({ where: { accountType: 'personal' } }),
    enterprise: await prisma.user.count({ where: { accountType: 'enterprise' } }),
    frozen: await prisma.user.count({ where: { status: 'frozen' } }),
    platform: await prisma.platformUserRole.groupBy({ by: ['userId'] }).then((g) => g.length),
    provider: await prisma.providerUser.groupBy({ by: ['userId'] }).then((g) => g.length),
    publisher: await prisma.organizationMember.groupBy({ by: ['userId'] }).then((g) => g.length),
  };

  return { users: rows, total, page, pageSize, stats };
}

function resolveUserLookup(userKey: string): { id: string } | { userNo: number } {
  if (/^\d+$/.test(userKey)) {
    const userNo = Number(userKey);
    if (Number.isSafeInteger(userNo) && userNo > 0) return { userNo };
  }
  return { id: userKey };
}

export async function getPlatformUserDetail(userKey: string) {
  const user = await prisma.user.findUnique({
    where: resolveUserLookup(userKey),
    include: {
      platformRoles: true,
      providerLinks: { include: { provider: true } },
      sessions: { where: { expiresAt: { gt: new Date() } }, select: { id: true, createdAt: true } },
    },
  });
  if (!user) throw new Error('用户不存在');

  const userId = user.id;

  const orgMember = await prisma.organizationMember.findFirst({
    where: { userId },
    include: {
      organization: { include: { brands: { select: { id: true, name: true, isDefault: true } } } },
    },
  });

  const derivedType = deriveUserType(user, Boolean(orgMember));

  let budgetAccount: { brandName: string; balance: number; frozen: number } | null = null;
  let budgetLedger: Array<Record<string, unknown>> = [];
  if (derivedType === 'publisher' && orgMember) {
    const defaultBrand =
      orgMember.organization.brands.find((b) => b.isDefault) ?? orgMember.organization.brands[0];
    if (defaultBrand) {
      const account = await prisma.budgetAccount.findUnique({ where: { brandName: defaultBrand.name } });
      if (account) {
        budgetAccount = {
          brandName: defaultBrand.name,
          balance: account.balance,
          frozen: account.frozen,
        };
      }
      budgetLedger = await prisma.budgetLedger.findMany({
        where: { brandName: defaultBrand.name },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    }
  }

  let wallet: Awaited<ReturnType<typeof getProviderWalletSummary>> | null = null;
  let withdrawals: Awaited<ReturnType<typeof listWithdrawalRequests>> = [];
  const providerId = user.providerLinks[0]?.providerId;
  if (providerId) {
    wallet = await getProviderWalletSummary(providerId);
    withdrawals = await listWithdrawalRequests({ providerId, limit: 10 });
  }

  const loginLogs = await prisma.loginLog.findMany({
    where: { OR: [{ userId }, { phone: user.phone ?? undefined }] },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return {
    user: {
      id: user.id,
      userNo: user.userNo,
      phone: user.phone,
      displayName: user.displayName,
      accountType: user.accountType,
      status: user.status,
      userType: derivedType,
      platformRole: user.platformRoles[0]?.role ?? null,
      createdAt: user.createdAt.toISOString(),
      activeSessions: user.sessions.length,
    },
    organization: orgMember
      ? {
          id: orgMember.organization.id,
          name: orgMember.organization.name,
          certStatus: orgMember.organization.certStatus,
          legalName: orgMember.organization.legalName,
          certReviewedAt: orgMember.organization.certReviewedAt?.toISOString() ?? null,
          brands: orgMember.organization.brands,
        }
      : null,
    provider: user.providerLinks[0]
      ? {
          id: user.providerLinks[0].provider.id,
          name: user.providerLinks[0].provider.name,
          applicationStatus: user.providerLinks[0].provider.applicationStatus,
        }
      : null,
    budgetAccount,
    budgetLedger,
    wallet,
    withdrawals,
    loginLogs: loginLogs.map((l) => ({
      id: l.id,
      result: l.result,
      reason: l.reason,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export async function updateUserStatus(userId: string, status: 'active' | 'frozen', reason?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('用户不存在');
  if (!['active', 'frozen'].includes(status)) throw new Error('无效状态');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  if (status === 'frozen') {
    await prisma.session.deleteMany({ where: { userId } });
  }

  await appendAuditLog({
    action: status === 'frozen' ? 'user_freeze' : 'user_unfreeze',
    entity: 'User',
    entityId: userId,
    detail: reason ?? user.displayName ?? user.phone ?? userId,
    source: 'platform',
  });

  return updated;
}

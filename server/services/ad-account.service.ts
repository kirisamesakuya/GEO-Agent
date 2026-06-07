import { prisma } from '../db/client.js';
import { findBrandRow } from './brand.service.js';
import { loadPlatformAuthConfig } from '../lib/account-platform-config.js';

export interface AdAccountDto {
  id: string;
  platform: string;
  accountName: string;
  externalAccountId?: string;
  ownerType: string;
  ownerId: string;
  ownerName: string;
  authMethod: string;
  authStatus: string;
  riskStatus: string;
  permissions: string;
  expiresAt?: string;
  lastCheckedAt?: string;
  legacyBindingId?: string;
  disabled: boolean;
  assignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdAccountAssignmentDto {
  id: string;
  accountId: string;
  accountName?: string;
  platform?: string;
  targetType: string;
  targetId: string;
  targetName?: string;
  role: string;
  isDefault: boolean;
  enabled: boolean;
  createdAt: string;
}

export interface AvailablePublishAccountDto {
  id: string;
  adAccountId: string;
  platform: string;
  accountName: string;
  status: string;
  permissions: string;
  lastChecked: string;
  authMethod?: string;
  expiresAt?: string;
  ownerType: string;
  ownerName: string;
  isDefault: boolean;
}

function bindingStatusToAuthStatus(status: string, expiresAt?: Date | null): string {
  if (expiresAt && expiresAt < new Date()) return 'expired';
  if (status === '已授权' || status === '正常') return 'authorized';
  if (status === '授权中') return 'pending';
  if (status === '校验失败') return 'failed';
  return 'unauthorized';
}

function authStatusToBindingLabel(authStatus: string): string {
  if (authStatus === 'authorized') return '已授权';
  if (authStatus === 'pending') return '授权中';
  if (authStatus === 'failed') return '校验失败';
  if (authStatus === 'expired') return '待授权';
  return '待授权';
}

function mapAdAccount(
  row: {
    id: string;
    platform: string;
    accountName: string;
    externalAccountId: string | null;
    ownerType: string;
    ownerId: string;
    ownerName: string;
    authMethod: string;
    authStatus: string;
    riskStatus: string;
    permissions: string;
    expiresAt: Date | null;
    lastCheckedAt: Date | null;
    legacyBindingId: string | null;
    disabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count?: { assignments: number };
  }
): AdAccountDto {
  return {
    id: row.id,
    platform: row.platform,
    accountName: row.accountName,
    externalAccountId: row.externalAccountId ?? undefined,
    ownerType: row.ownerType,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    authMethod: row.authMethod,
    authStatus: row.authStatus,
    riskStatus: row.riskStatus,
    permissions: row.permissions,
    expiresAt: row.expiresAt?.toISOString(),
    lastCheckedAt: row.lastCheckedAt?.toISOString(),
    legacyBindingId: row.legacyBindingId ?? undefined,
    disabled: row.disabled,
    assignmentCount: row._count?.assignments ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function appendUsageLog(
  accountId: string,
  action: string,
  opts?: { businessRefType?: string; businessRefId?: string; result?: string; detail?: string }
) {
  await prisma.adAccountUsageLog.create({
    data: {
      accountId,
      action,
      businessRefType: opts?.businessRefType ?? null,
      businessRefId: opts?.businessRefId ?? null,
      result: opts?.result ?? 'success',
      detail: opts?.detail ?? null,
    },
  });
}

/** 将单条 AccountBinding 同步为 AdAccount + 默认分配 */
export async function migrateBindingToAdAccount(bindingId: string): Promise<string> {
  const binding = await prisma.accountBinding.findUnique({
    where: { id: bindingId },
    include: { brand: true },
  });
  if (!binding) throw new Error('绑定记录不存在');

  const existing = await prisma.adAccount.findFirst({
    where: { legacyBindingId: binding.id },
  });
  if (existing) {
    await syncAdAccountFromBinding(existing.id, binding);
    return existing.id;
  }

  const authStatus = bindingStatusToAuthStatus(binding.status, binding.expiresAt);
  const account = await prisma.adAccount.create({
    data: {
      platform: binding.platform,
      accountName: binding.accountName,
      externalAccountId: binding.externalAccountId,
      ownerType: 'brand',
      ownerId: binding.brandId,
      ownerName: binding.brand.name,
      authMethod: binding.authMethod,
      authStatus,
      permissions: binding.permissions,
      expiresAt: binding.expiresAt,
      lastCheckedAt: binding.lastChecked !== '—' ? new Date() : null,
      legacyBindingId: binding.id,
    },
  });

  await prisma.adAccountAssignment.upsert({
    where: {
      accountId_targetType_targetId: {
        accountId: account.id,
        targetType: 'brand',
        targetId: binding.brandId,
      },
    },
    create: {
      accountId: account.id,
      targetType: 'brand',
      targetId: binding.brandId,
      targetName: binding.brand.name,
      role: 'owner',
      isDefault: true,
      enabled: true,
    },
    update: { enabled: true, targetName: binding.brand.name },
  });

  await appendUsageLog(account.id, 'migrated', {
    businessRefType: 'account_binding',
    businessRefId: binding.id,
    detail: '从 AccountBinding 迁移',
  });

  return account.id;
}

async function syncAdAccountFromBinding(
  adAccountId: string,
  binding: {
    accountName: string;
    status: string;
    permissions: string;
    authMethod: string;
    externalAccountId: string | null;
    expiresAt: Date | null;
    lastChecked: string;
    platform: string;
  }
) {
  await prisma.adAccount.update({
    where: { id: adAccountId },
    data: {
      accountName: binding.accountName,
      authStatus: bindingStatusToAuthStatus(binding.status, binding.expiresAt),
      permissions: binding.permissions,
      authMethod: binding.authMethod,
      externalAccountId: binding.externalAccountId,
      expiresAt: binding.expiresAt,
      lastCheckedAt: binding.lastChecked !== '—' ? new Date() : undefined,
      platform: binding.platform,
    },
  });
}

export async function syncAdAccountAfterBindingVerify(bindingId: string) {
  const ad = await prisma.adAccount.findFirst({ where: { legacyBindingId: bindingId } });
  if (!ad) {
    await migrateBindingToAdAccount(bindingId);
    return;
  }
  const binding = await prisma.accountBinding.findUnique({ where: { id: bindingId } });
  if (binding) await syncAdAccountFromBinding(ad.id, binding);
}

export async function ensureBrandBindingsMigrated(brandName: string) {
  const brand = await findBrandRow(brandName);
  if (!brand) return;
  const bindings = await prisma.accountBinding.findMany({
    where: { brandId: brand.id, platform: { not: '任务接单端' } },
  });
  for (const b of bindings) {
    await migrateBindingToAdAccount(b.id);
  }
}

export async function listAdAccounts(filters?: {
  brandName?: string;
  platform?: string;
  authStatus?: string;
  ownerType?: string;
  q?: string;
}): Promise<AdAccountDto[]> {
  if (filters?.brandName) {
    await ensureBrandBindingsMigrated(filters.brandName);
  } else {
    const brands = await prisma.brand.findMany({ where: { status: { not: 'archived' } }, select: { name: true } });
    for (const b of brands) await ensureBrandBindingsMigrated(b.name);
  }

  const where: Record<string, unknown> = { disabled: false };
  if (filters?.platform) where.platform = filters.platform;
  if (filters?.authStatus) where.authStatus = filters.authStatus;
  if (filters?.ownerType) where.ownerType = filters.ownerType;
  if (filters?.q) {
    where.OR = [
      { accountName: { contains: filters.q } },
      { externalAccountId: { contains: filters.q } },
      { ownerName: { contains: filters.q } },
    ];
  }

  if (filters?.brandName) {
    const brand = await findBrandRow(filters.brandName);
    if (!brand) return [];
    const assignedIds = (
      await prisma.adAccountAssignment.findMany({
        where: { targetType: 'brand', targetId: brand.id, enabled: true },
        select: { accountId: true },
      })
    ).map((a) => a.accountId);
    where.id = { in: assignedIds.length ? assignedIds : ['__none__'] };
  }

  const rows = await prisma.adAccount.findMany({
    where,
    include: { _count: { select: { assignments: true } } },
    orderBy: [{ platform: 'asc' }, { accountName: 'asc' }],
  });
  return rows.map(mapAdAccount);
}

export async function createAdAccount(input: {
  platform: string;
  accountName: string;
  ownerType: string;
  ownerId: string;
  ownerName: string;
  authMethod?: string;
  brandNameForAssignment?: string;
}) {
  let ownerId = input.ownerId;
  let ownerName = input.ownerName;
  if (input.brandNameForAssignment && input.ownerType === 'brand') {
    const brand = await findBrandRow(input.brandNameForAssignment);
    if (brand) {
      ownerId = brand.id;
      ownerName = brand.name;
    }
  }

  const account = await prisma.adAccount.create({
    data: {
      platform: input.platform,
      accountName: input.accountName.trim() || '未命名账号',
      ownerType: input.ownerType,
      ownerId,
      ownerName,
      authMethod: input.authMethod ?? 'browser',
      authStatus: 'unauthorized',
      permissions: '{}',
    },
    include: { _count: { select: { assignments: true } } },
  });

  if (input.brandNameForAssignment) {
    const brand = await findBrandRow(input.brandNameForAssignment);
    if (brand) {
      await prisma.adAccountAssignment.create({
        data: {
          accountId: account.id,
          targetType: 'brand',
          targetId: brand.id,
          targetName: brand.name,
          role: 'owner',
          isDefault: false,
          enabled: true,
        },
      });
      const existingDefault = await prisma.adAccountAssignment.findFirst({
        where: {
          targetType: 'brand',
          targetId: brand.id,
          isDefault: true,
          account: { platform: input.platform },
        },
      });
      if (!existingDefault) {
        await prisma.adAccountAssignment.updateMany({
          where: { accountId: account.id, targetId: brand.id },
          data: { isDefault: true },
        });
      }

      const binding = await prisma.accountBinding.findFirst({
        where: { brandId: brand.id, platform: input.platform },
      });
      if (binding) {
        await prisma.adAccount.update({
          where: { id: account.id },
          data: { legacyBindingId: binding.id },
        });
      } else if (loadPlatformAuthConfig().some((e) => e.platform === input.platform)) {
        const entry = loadPlatformAuthConfig().find((e) => e.platform === input.platform);
        const created = await prisma.accountBinding.create({
          data: {
            brandId: brand.id,
            platform: input.platform,
            accountName: input.accountName.trim() || '未绑定',
            status: '待授权',
            permissions: entry?.permissionsLabel ?? '发布',
            lastChecked: '—',
          },
        });
        await prisma.adAccount.update({
          where: { id: account.id },
          data: { legacyBindingId: created.id },
        });
      }
    }
  }

  await appendUsageLog(account.id, 'bind', { detail: '创建投放账号资产' });

  const full = await prisma.adAccount.findUnique({
    where: { id: account.id },
    include: { _count: { select: { assignments: true } } },
  });
  return mapAdAccount(full!);
}

export async function updateAdAccount(
  id: string,
  data: Partial<{ accountName: string; ownerType: string; ownerId: string; ownerName: string; disabled: boolean }>
) {
  const row = await prisma.adAccount.update({
    where: { id },
    data: {
      ...(data.accountName !== undefined ? { accountName: data.accountName } : {}),
      ...(data.ownerType !== undefined ? { ownerType: data.ownerType } : {}),
      ...(data.ownerId !== undefined ? { ownerId: data.ownerId } : {}),
      ...(data.ownerName !== undefined ? { ownerName: data.ownerName } : {}),
      ...(data.disabled !== undefined ? { disabled: data.disabled } : {}),
    },
    include: { _count: { select: { assignments: true } } },
  });
  if (row.legacyBindingId && data.accountName) {
    await prisma.accountBinding.update({
      where: { id: row.legacyBindingId },
      data: { accountName: data.accountName },
    });
  }
  return mapAdAccount(row);
}

export async function disableAdAccount(id: string) {
  return updateAdAccount(id, { disabled: true });
}

export async function listAdAccountAssignments(filters?: {
  brandName?: string;
  accountId?: string;
}): Promise<AdAccountAssignmentDto[]> {
  const where: Record<string, unknown> = {};
  if (filters?.accountId) where.accountId = filters.accountId;
  if (filters?.brandName) {
    const brand = await findBrandRow(filters.brandName);
    if (!brand) return [];
    where.targetType = 'brand';
    where.targetId = brand.id;
  }

  const rows = await prisma.adAccountAssignment.findMany({
    where,
    include: { account: { select: { accountName: true, platform: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    accountName: r.account.accountName,
    platform: r.account.platform,
    targetType: r.targetType,
    targetId: r.targetId,
    targetName: r.targetName ?? undefined,
    role: r.role,
    isDefault: r.isDefault,
    enabled: r.enabled,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createAdAccountAssignment(input: {
  accountId: string;
  targetType: string;
  targetId: string;
  targetName?: string;
  role?: string;
  isDefault?: boolean;
}) {
  const row = await prisma.adAccountAssignment.create({
    data: {
      accountId: input.accountId,
      targetType: input.targetType,
      targetId: input.targetId,
      targetName: input.targetName ?? null,
      role: input.role ?? 'operator',
      isDefault: input.isDefault ?? false,
      enabled: true,
    },
  });
  await appendUsageLog(input.accountId, 'assign', {
    businessRefType: input.targetType,
    businessRefId: input.targetId,
    detail: `分配给 ${input.targetName ?? input.targetId}`,
  });
  return {
    id: row.id,
    accountId: row.accountId,
    targetType: row.targetType,
    targetId: row.targetId,
    targetName: row.targetName ?? undefined,
    role: row.role,
    isDefault: row.isDefault,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function updateAdAccountAssignment(
  id: string,
  data: Partial<{ role: string; isDefault: boolean; enabled: boolean }>
) {
  const row = await prisma.adAccountAssignment.update({
    where: { id },
    data: {
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
    },
  });
  if (data.isDefault) {
    await prisma.adAccountAssignment.updateMany({
      where: {
        targetType: row.targetType,
        targetId: row.targetId,
        account: { platform: (await prisma.adAccount.findUnique({ where: { id: row.accountId } }))?.platform },
        NOT: { id: row.id },
      },
      data: { isDefault: false },
    });
  }
  await appendUsageLog(row.accountId, 'assign', { businessRefId: id, detail: '更新分配关系' });
  return row;
}

export async function deleteAdAccountAssignment(id: string) {
  const row = await prisma.adAccountAssignment.delete({ where: { id } });
  await appendUsageLog(row.accountId, 'assign', { result: 'success', detail: '删除分配关系' });
}

export async function listAdAccountUsageLogs(filters?: {
  accountId?: string;
  brandName?: string;
  limit?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.accountId) where.accountId = filters.accountId;
  if (filters?.brandName) {
    const brand = await findBrandRow(filters.brandName);
    if (!brand) return [];
    const accountIds = (
      await prisma.adAccountAssignment.findMany({
        where: { targetType: 'brand', targetId: brand.id },
        select: { accountId: true },
      })
    ).map((a) => a.accountId);
    where.accountId = { in: accountIds.length ? accountIds : ['__none__'] };
  }

  const rows = await prisma.adAccountUsageLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ?? 100,
    include: { account: { select: { platform: true, accountName: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    platform: r.account.platform,
    accountName: r.account.accountName,
    action: r.action,
    businessRefType: r.businessRefType ?? undefined,
    businessRefId: r.businessRefId ?? undefined,
    result: r.result,
    detail: r.detail ?? undefined,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** 品牌可用发布账号：优先新表，校验分配与授权；id 为 bindingId 以兼容发布 API */
export async function listAvailableAdAccountsForBrand(
  brandName: string
): Promise<AvailablePublishAccountDto[]> {
  await ensureBrandBindingsMigrated(brandName);
  const brand = await findBrandRow(brandName);
  if (!brand) return [];

  const assignments = await prisma.adAccountAssignment.findMany({
    where: { targetType: 'brand', targetId: brand.id, enabled: true },
    include: { account: true },
  });

  const out: AvailablePublishAccountDto[] = [];
  for (const a of assignments) {
    const acc = a.account;
    if (acc.disabled) continue;
    if (acc.authStatus !== 'authorized') continue;
    if (!acc.legacyBindingId) continue;
    const binding = await prisma.accountBinding.findUnique({ where: { id: acc.legacyBindingId } });
    if (!binding || binding.platform === '任务接单端') continue;

    out.push({
      id: binding.id,
      adAccountId: acc.id,
      platform: binding.platform,
      accountName: binding.accountName,
      status: authStatusToBindingLabel(acc.authStatus),
      permissions: binding.permissions,
      lastChecked: binding.lastChecked,
      authMethod: binding.authMethod,
      expiresAt: binding.expiresAt?.toISOString(),
      ownerType: acc.ownerType,
      ownerName: acc.ownerName,
      isDefault: a.isDefault,
    });
  }

  out.sort((x, y) => {
    if (x.isDefault !== y.isDefault) return x.isDefault ? -1 : 1;
    return x.platform.localeCompare(y.platform);
  });

  return out;
}

/** 解析发布时传入的账号 ID（支持 adAccountId 或 legacy bindingId） */
export async function resolvePublishBindingForBrand(brandName: string, accountId: string) {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');

  await ensureBrandBindingsMigrated(brandName);

  let binding = await prisma.accountBinding.findFirst({
    where: { id: accountId, brandId: brand.id },
  });

  if (!binding) {
    const ad = await prisma.adAccount.findFirst({
      where: { id: accountId },
      include: { assignments: true },
    });
    if (ad?.legacyBindingId) {
      const assigned = ad.assignments.some(
        (x) => x.targetType === 'brand' && x.targetId === brand.id && x.enabled
      );
      if (!assigned) throw new Error('该账号未分配给当前品牌');
      if (ad.authStatus !== 'authorized') {
        throw new Error('账号未完成本机登录确认或已失效，请先在「发布账号」页确认');
      }
      binding = await prisma.accountBinding.findFirst({
        where: { id: ad.legacyBindingId, brandId: brand.id },
      });
    }
  }

  if (!binding) throw new Error('发布账号不存在');

  const adRow = await prisma.adAccount.findFirst({ where: { legacyBindingId: binding.id } });
  if (adRow) {
    const assigned = await prisma.adAccountAssignment.findFirst({
      where: { accountId: adRow.id, targetType: 'brand', targetId: brand.id, enabled: true },
    });
    if (!assigned) throw new Error('该账号未分配给当前品牌');
    if (adRow.authStatus !== 'authorized') {
      throw new Error(`${binding.platform} 未完成本机登录确认，请先在「发布账号」页确认`);
    }
  } else if (binding.status !== '已授权' && binding.status !== '正常') {
    throw new Error(`${binding.platform} 未完成本机登录确认，请先在「发布账号」页确认`);
  }

  return binding;
}

export async function getAdAccountAuthBindingId(adAccountId: string): Promise<string> {
  const row = await prisma.adAccount.findUnique({ where: { id: adAccountId } });
  if (!row?.legacyBindingId) throw new Error('该账号尚未关联平台绑定记录');
  return row.legacyBindingId;
}

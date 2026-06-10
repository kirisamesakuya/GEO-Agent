import { prisma } from '../db/client.js';
import {
  normalizeBrandDescription,
  normalizeBrandName,
  validateBrandProfileText,
} from '../../lib/brand-profile-limits.js';
import { appendAuditLog } from './audit.service.js';
import { createAgentTask } from './agent-task.service.js';
import { resolveExecutorKindForTask } from '../agent/executors/index.js';
import {
  parseBrandSourceMaterials,
  type BrandSourceMaterial,
} from '../../lib/brand-source-material.js';

export interface BrandProfileDto {
  id?: string;
  website: string;
  name: string;
  industry: string;
  city: string;
  ownerName?: string;
  storeCount: number;
  description: string;
  keywords: string[];
  competitors: string[];
  forbiddenWords: string[];
  sourceMaterials?: BrandSourceMaterial[];
  status?: string;
  isDefault?: boolean;
}

export interface BrandListItem {
  id: string;
  name: string;
  industry: string;
  city: string;
  ownerName: string;
  status: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapBrand(row: {
  id: string;
  website: string;
  name: string;
  industry: string;
  city: string;
  ownerName?: string;
  storeCount: number;
  description: string;
  keywords: string;
  competitors: string;
  forbiddenWords: string;
  sourceMaterials?: string;
  status?: string;
  isDefault?: boolean;
}): BrandProfileDto {
  return {
    id: row.id,
    website: row.website,
    name: row.name,
    industry: row.industry,
    city: row.city,
    ownerName: row.ownerName ?? '',
    storeCount: row.storeCount,
    description: row.description,
    keywords: JSON.parse(row.keywords) as string[],
    competitors: JSON.parse(row.competitors) as string[],
    forbiddenWords: JSON.parse(row.forbiddenWords) as string[],
    sourceMaterials: parseBrandSourceMaterials(row.sourceMaterials),
    status: row.status,
    isDefault: row.isDefault,
  };
}

export async function listBrands(): Promise<BrandListItem[]> {
  const rows = await prisma.brand.findMany({
    where: { status: { not: 'archived' } },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    industry: r.industry,
    city: r.city,
    ownerName: r.ownerName ?? '',
    status: r.status,
    isDefault: r.isDefault,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function findBrandRow(brandName?: string) {
  if (brandName) {
    return prisma.brand.findFirst({ where: { name: brandName } });
  }
  return (
    (await prisma.brand.findFirst({ where: { isDefault: true } })) ??
    (await prisma.brand.findFirst({ orderBy: { createdAt: 'asc' } }))
  );
}

export async function getBrandProfile(brandName?: string): Promise<BrandProfileDto | null> {
  const row = await findBrandRow(brandName);
  return row ? mapBrand(row) : null;
}

export async function isBrandDisabled(brandName: string): Promise<boolean> {
  const row = await prisma.brand.findFirst({ where: { name: brandName } });
  return row?.status === 'disabled';
}

export async function updateBrandProfile(
  patch: Partial<BrandProfileDto>,
  brandName?: string
): Promise<BrandProfileDto> {
  const validationError = validateBrandProfileText({
    name: patch.name,
    description: patch.description,
  });
  if (validationError) throw new Error(validationError);

  const normalizedPatch: Partial<BrandProfileDto> = { ...patch };
  if (patch.name !== undefined) normalizedPatch.name = normalizeBrandName(patch.name);
  if (patch.description !== undefined) {
    normalizedPatch.description = normalizeBrandDescription(patch.description);
  }

  let row = await findBrandRow(brandName ?? normalizedPatch.name);
  if (!row) throw new Error('Brand not found');

  row = await prisma.brand.update({
    where: { id: row.id },
    data: {
      ...(normalizedPatch.website !== undefined ? { website: normalizedPatch.website } : {}),
      ...(normalizedPatch.name !== undefined ? { name: normalizedPatch.name } : {}),
      ...(normalizedPatch.industry !== undefined ? { industry: normalizedPatch.industry } : {}),
      ...(normalizedPatch.city !== undefined ? { city: normalizedPatch.city } : {}),
      ...(normalizedPatch.ownerName !== undefined ? { ownerName: normalizedPatch.ownerName } : {}),
      ...(normalizedPatch.storeCount !== undefined ? { storeCount: normalizedPatch.storeCount } : {}),
      ...(normalizedPatch.description !== undefined ? { description: normalizedPatch.description } : {}),
      ...(normalizedPatch.keywords !== undefined ? { keywords: JSON.stringify(normalizedPatch.keywords) } : {}),
      ...(normalizedPatch.competitors !== undefined
        ? { competitors: JSON.stringify(normalizedPatch.competitors) }
        : {}),
      ...(normalizedPatch.forbiddenWords !== undefined
        ? { forbiddenWords: JSON.stringify(normalizedPatch.forbiddenWords) }
        : {}),
      ...(normalizedPatch.sourceMaterials !== undefined
        ? { sourceMaterials: JSON.stringify(normalizedPatch.sourceMaterials) }
        : {}),
    },
  });
  if (patch.keywords !== undefined) {
    const { syncKeywordsFromBrand } = await import('./keyword.service.js');
    await syncKeywordsFromBrand(row.name);
  }
  return mapBrand(row);
}

export async function saveBrandProfile(profile: BrandProfileDto): Promise<BrandProfileDto> {
  const existing = await prisma.brand.findFirst({ where: { name: profile.name } });
  if (existing) {
    return updateBrandProfile(profile, profile.name);
  }
  const org =
    (await prisma.organization.findFirst()) ??
    (await prisma.organization.create({ data: { name: '默认组织' } }));

  const row = await prisma.brand.create({
    data: {
      organizationId: org.id,
      website: profile.website,
      name: profile.name,
      industry: profile.industry,
      city: profile.city,
      storeCount: profile.storeCount,
      description: profile.description,
      keywords: JSON.stringify(profile.keywords),
      competitors: JSON.stringify(profile.competitors),
      forbiddenWords: JSON.stringify(profile.forbiddenWords),
      sourceMaterials: JSON.stringify(profile.sourceMaterials ?? []),
      isDefault: (await prisma.brand.count()) === 0,
    },
  });
  return mapBrand(row);
}

export async function createBrand(input: {
  name: string;
  website?: string;
  industry?: string;
  city?: string;
  ownerName?: string;
}): Promise<BrandProfileDto> {
  const trimmed = normalizeBrandName(input.name);
  if (!trimmed) throw new Error('品牌名称不能为空');
  const dup = await prisma.brand.findFirst({
    where: { name: trimmed, status: { not: 'archived' } },
  });
  if (dup) throw new Error('品牌名称已存在');

  const org =
    (await prisma.organization.findFirst()) ??
    (await prisma.organization.create({ data: { name: '默认组织' } }));

  const row = await prisma.brand.create({
    data: {
      organizationId: org.id,
      name: trimmed,
      website: input.website ?? '',
      industry: input.industry ?? '其他',
      city: input.city ?? '',
      ownerName: input.ownerName?.trim() ?? '',
      storeCount: 1,
      description: '',
      keywords: JSON.stringify([]),
      competitors: JSON.stringify([]),
      forbiddenWords: JSON.stringify([]),
    },
  });

  await prisma.aiCredits.upsert({
    where: { brandName: row.name },
    create: { brandName: row.name, balance: 500 },
    update: {},
  });
  await prisma.budgetAccount.upsert({
    where: { brandName: row.name },
    create: { brandName: row.name, balance: 5000, frozen: 0 },
    update: {},
  });

  const { ensurePlatformAccountBindings } = await import('./account-bind.service.js');
  await ensurePlatformAccountBindings(row.id);

  await appendAuditLog({
    action: 'brand_create',
    entity: 'Brand',
    entityId: row.id,
    detail: trimmed,
  });

  return mapBrand(row);
}

export async function archiveBrand(brandId: string): Promise<void> {
  const row = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!row) throw new Error('品牌不存在');
  if (row.status === 'archived') throw new Error('品牌已删除');

  const activeCount = await prisma.brand.count({
    where: { status: { not: 'archived' } },
  });
  if (activeCount <= 1) throw new Error('至少保留一个品牌');

  await prisma.brand.update({
    where: { id: brandId },
    data: { status: 'archived' },
  });

  if (row.isDefault) {
    const next = await prisma.brand.findFirst({
      where: { status: { not: 'archived' }, id: { not: brandId } },
      orderBy: { createdAt: 'asc' },
    });
    if (next) {
      await prisma.brand.update({
        where: { id: row.id },
        data: { isDefault: false },
      });
      await prisma.brand.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  await appendAuditLog({
    action: 'brand_archive',
    entity: 'Brand',
    entityId: row.id,
    detail: row.name,
  });
}

export interface AccountDto {
  id: string;
  platform: string;
  accountName: string;
  status: string;
  permissions: string;
  lastChecked: string;
  authMethod?: string;
  expiresAt?: string;
}

export async function listAccounts(brandName?: string): Promise<AccountDto[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];
  const row = await prisma.brand.findUnique({
    where: { id: brand.id },
    include: { accountBindings: true },
  });
  if (!row) return [];
  return row.accountBindings
    .filter((a) => !['任务接单端'].includes(a.platform))
    .map((a) => ({
      id: a.id,
      platform: a.platform,
      accountName: a.accountName,
      status: a.status,
      permissions: a.permissions,
      lastChecked: a.lastChecked,
      authMethod: a.authMethod,
      expiresAt: a.expiresAt?.toISOString(),
    }));
}

export async function verifyAccount(_id: string): Promise<AccountDto[]> {
  throw new Error('请使用「校验登录状态」，已停用本地快速校验');
}

export async function startAccountVerifyTask(
  accountId: string,
  brandName?: string,
  extraInput?: Record<string, unknown>
) {
  const binding = await prisma.accountBinding.findUnique({
    where: { id: accountId },
    include: { brand: true },
  });
  if (!binding) throw new Error('账号绑定不存在');
  const name = brandName ?? binding.brand.name;

  const task = await createAgentTask({
    type: 'account_verify',
    title: `${name} · ${binding.platform} 账号校验`,
    brandName: name,
    input: {
      accountId,
      platform: binding.platform,
      accountName: binding.accountName,
      bindSessionId: binding.bindSessionId ?? undefined,
      ...extraInput,
    },
    businessRef: accountId,
    executor: await resolveExecutorKindForTask('account_verify'),
  });

  await appendAuditLog({
    action: 'account_verify_start',
    entity: 'AccountBinding',
    entityId: accountId,
    detail: binding.platform,
  });

  return task;
}

export async function unbindAccount(id: string): Promise<AccountDto[]> {
  const binding = await prisma.accountBinding.findUnique({ where: { id }, include: { brand: true } });
  await prisma.accountBinding.update({
    where: { id },
    data: {
      status: '待授权',
      accountName: '未绑定',
      lastChecked: '—',
      bindSessionId: null,
      authMethod: 'browser',
      externalAccountId: null,
    },
  });
  await appendAuditLog({
    action: 'account_unbind',
    entity: 'AccountBinding',
    entityId: id,
    detail: binding?.platform,
  });
  return listAccounts(binding?.brand.name);
}

export async function bindWxAccount(brandName?: string): Promise<AccountDto[]> {
  const { legacyBindWx } = await import('./account-bind.service.js');
  const result = await legacyBindWx(brandName);
  return result.accounts;
}

export async function updateAccount(id: string, data: Partial<AccountDto>): Promise<AccountDto[]> {
  const binding = await prisma.accountBinding.findUnique({ where: { id }, include: { brand: true } });
  await prisma.accountBinding.update({
    where: { id },
    data: {
      ...(data.accountName !== undefined ? { accountName: data.accountName } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.permissions !== undefined ? { permissions: data.permissions } : {}),
      lastChecked: new Date().toISOString().replace('T', ' ').slice(0, 16),
    },
  });
  return listAccounts(binding?.brand.name);
}

export function checkBrandCompleteness(profile: BrandProfileDto): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!profile.name) missing.push('品牌名称');
  if (!profile.industry) missing.push('行业');
  if (!profile.description) missing.push('主营业务');
  return { complete: missing.length === 0, missing };
}

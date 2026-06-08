import { prisma } from '../db/client.js';
import {
  customRecordToAuthConfig,
  parseCustomPublishPlatforms,
  serializeCustomPublishPlatforms,
  validateCustomPlatformInput,
  type CustomPublishPlatformRecord,
} from '../../lib/custom-publish-platform.js';
import { appendAuditLog } from './audit.service.js';
import { findBrandRow, listAccounts, type AccountDto } from './brand.service.js';
import { loadPlatformAuthConfig } from '../lib/account-platform-config.js';

function builtinPlatformNames(): string[] {
  return loadPlatformAuthConfig().map((entry) => entry.platform);
}

export async function getCustomPublishPlatforms(brandName: string): Promise<CustomPublishPlatformRecord[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];
  return parseCustomPublishPlatforms(brand.customPublishPlatforms);
}

export async function getCustomPublishPlatform(
  brandName: string,
  platform: string
): Promise<CustomPublishPlatformRecord | undefined> {
  const items = await getCustomPublishPlatforms(brandName);
  return items.find((item) => item.platform === platform);
}

export async function listCustomPlatformAuthConfig(brandName: string) {
  const items = await getCustomPublishPlatforms(brandName);
  return items.map(customRecordToAuthConfig);
}

export interface AdminCustomPublishPlatformRow {
  brandId: string;
  brandName: string;
  platform: string;
  logoUrl?: string;
  abbr?: string;
  gradient?: string;
  loginUrl?: string;
  loginHint?: string;
  permissionsLabel?: string;
  createdAt: string;
}

export async function listAdminCustomPublishPlatforms(filters?: {
  brandName?: string;
  platform?: string;
}): Promise<AdminCustomPublishPlatformRow[]> {
  const brands = await prisma.brand.findMany({
    select: { id: true, name: true, customPublishPlatforms: true },
    orderBy: { name: 'asc' },
  });

  const brandQuery = filters?.brandName?.trim().toLowerCase();
  const platformQuery = filters?.platform?.trim().toLowerCase();
  const rows: AdminCustomPublishPlatformRow[] = [];

  for (const brand of brands) {
    if (brandQuery && !brand.name.toLowerCase().includes(brandQuery)) continue;
    for (const item of parseCustomPublishPlatforms(brand.customPublishPlatforms)) {
      if (platformQuery && !item.platform.toLowerCase().includes(platformQuery)) continue;
      rows.push({
        brandId: brand.id,
        brandName: brand.name,
        platform: item.platform,
        logoUrl: item.logoUrl,
        abbr: item.abbr,
        gradient: item.gradient,
        loginUrl: item.loginUrl,
        loginHint: item.loginHint,
        permissionsLabel: item.permissionsLabel,
        createdAt: item.createdAt,
      });
    }
  }

  return rows.sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || a.brandName.localeCompare(b.brandName, 'zh-CN')
  );
}

export async function createCustomPublishPlatform(
  brandName: string,
  input: {
    platform: string;
    logoUrl?: string;
    abbr?: string;
    gradient?: string;
    loginUrl?: string;
    loginHint?: string;
  }
): Promise<{ accounts: AccountDto[]; platform: ReturnType<typeof customRecordToAuthConfig> }> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');

  const existingCustom = parseCustomPublishPlatforms(brand.customPublishPlatforms);
  const bindings = await prisma.accountBinding.findMany({
    where: { brandId: brand.id },
    select: { platform: true },
  });
  const validation = validateCustomPlatformInput(
    input,
    builtinPlatformNames(),
    existingCustom,
    bindings.map((b) => b.platform)
  );
  if (validation.ok === false) throw new Error(validation.error);
  const normalized = validation.normalized;

  const nextCustom = [...existingCustom, normalized];
  await prisma.brand.update({
    where: { id: brand.id },
    data: { customPublishPlatforms: serializeCustomPublishPlatforms(nextCustom) },
  });

  const permissions = normalized.permissionsLabel ?? '内容发布 / 数据回传';
  const existingBinding = bindings.find((b) => b.platform === normalized.platform);
  if (!existingBinding) {
    await prisma.accountBinding.create({
      data: {
        brandId: brand.id,
        platform: normalized.platform,
        accountName: '未绑定',
        status: '待授权',
        permissions,
        lastChecked: '—',
      },
    });
  }

  await appendAuditLog({
    action: 'custom_publish_platform_create',
    entity: 'Brand',
    entityId: brand.id,
    detail: normalized.platform,
  });

  return {
    accounts: await listAccounts(brandName),
    platform: customRecordToAuthConfig(normalized),
  };
}

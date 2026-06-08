import { randomUUID } from 'crypto';
import { prisma } from '../db/client.js';
import { appendAuditLog } from './audit.service.js';
import { findBrandRow, listAccounts, type AccountDto } from './brand.service.js';
import {
  effectiveAuthMode,
  getPlatformAuthEntry,
  loadPlatformAuthConfig,
  resolveLoginUrl,
  type PlatformAuthEntry,
} from '../lib/account-platform-config.js';
import { getCustomPublishPlatform, listCustomPlatformAuthConfig } from './custom-publish-platform.service.js';

async function appendBindingLog(accountBindingId: string, action: string, detail?: string) {
  await prisma.accountBindingLog.create({
    data: { accountBindingId, action, detail: detail ?? null },
  });
}

export async function listPlatformAuthConfig(brandName?: string) {
  const builtIn = loadPlatformAuthConfig().map((entry) => ({
    platform: entry.platform,
    authMode: effectiveAuthMode(entry),
    oauthEnabled: entry.oauthEnabled,
    loginUrl: resolveLoginUrl(entry),
    creatorCenterUrl: entry.creatorCenterUrl,
    permissionsLabel: entry.permissionsLabel,
    loginHint: entry.loginHint,
    oauthNote: entry.oauthNote,
  }));
  if (!brandName?.trim()) return builtIn;
  const custom = await listCustomPlatformAuthConfig(brandName.trim());
  const builtInNames = new Set(builtIn.map((p) => p.platform));
  return [...builtIn, ...custom.filter((c) => !builtInNames.has(c.platform))];
}

async function resolvePlatformAuthEntry(
  brandName: string,
  platform: string
): Promise<PlatformAuthEntry | undefined> {
  const builtIn = getPlatformAuthEntry(platform);
  if (builtIn) return builtIn;
  const custom = await getCustomPublishPlatform(brandName, platform);
  if (!custom) return undefined;
  return {
    platform: custom.platform,
    authMode: 'browser',
    oauthEnabled: false,
    loginUrl: custom.loginUrl ?? '',
    creatorCenterUrl: custom.loginUrl ?? '',
    permissionsLabel: custom.permissionsLabel ?? '内容发布 / 数据回传',
    loginHint: custom.loginHint,
  };
}

async function findBindingForBrand(brandName: string, platform: string) {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  const binding = await prisma.accountBinding.findFirst({
    where: { brandId: brand.id, platform },
  });
  if (!binding) throw new Error(`未找到 ${platform} 绑定记录`);
  return { brand, binding };
}

export async function startAccountBind(
  platform: string,
  brandName?: string
): Promise<{
  accountId: string;
  platform: string;
  mode: 'browser' | 'oauth';
  loginUrl: string;
  bindSessionId: string;
  authMode: string;
  oauthNote?: string;
  accounts: AccountDto[];
}> {
  const name = brandName?.trim();
  if (!name) throw new Error('请选择品牌');

  const entry = await resolvePlatformAuthEntry(name, platform);
  if (!entry) throw new Error(`不支持的平台：${platform}`);

  const { binding } = await findBindingForBrand(name, platform);
  const bindSessionId = randomUUID();
  const mode = effectiveAuthMode(entry);
  const loginUrl = resolveLoginUrl(entry);

  await prisma.accountBinding.update({
    where: { id: binding.id },
    data: {
      status: '授权中',
      bindSessionId,
      authMethod: mode,
      permissions: entry.permissionsLabel,
    },
  });

  await appendBindingLog(binding.id, 'bind_start', `${platform}:${bindSessionId}`);
  await appendAuditLog({
    action: 'account_bind_start',
    entity: 'AccountBinding',
    entityId: binding.id,
    detail: platform,
  });

  const accounts = await listAccounts(name);
  return {
    accountId: binding.id,
    platform,
    mode,
    loginUrl,
    bindSessionId,
    authMode: mode,
    oauthNote: mode === 'oauth' ? entry.oauthNote : undefined,
    accounts,
  };
}

export async function confirmAccountBind(
  accountId: string,
  bindSessionId: string,
  brandName?: string
) {
  const binding = await prisma.accountBinding.findUnique({
    where: { id: accountId },
    include: { brand: true },
  });
  if (!binding) throw new Error('发布账号记录不存在');

  const name = brandName ?? binding.brand.name;
  if (bindSessionId !== binding.bindSessionId) {
    throw new Error('登录确认会话已过期，请重新点击「打开平台登录页」');
  }
  if (binding.status !== '授权中') {
    throw new Error('当前状态无法确认登录，请重新打开平台登录页并确认');
  }

  const checkedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const displayName =
    binding.accountName && binding.accountName !== '未绑定'
      ? binding.accountName
      : binding.platform;

  await prisma.accountBinding.update({
    where: { id: accountId },
    data: {
      status: '已授权',
      accountName: displayName,
      lastChecked: checkedAt,
      bindSessionId: null,
    },
  });

  await appendBindingLog(accountId, 'manual_confirm', bindSessionId);
  await appendAuditLog({
    action: 'account_manual_confirm',
    entity: 'AccountBinding',
    entityId: accountId,
    detail: binding.platform,
  });

  return { accounts: await listAccounts(name) };
}

/** 兼容旧 bind-wx：走统一浏览器授权流程 */
export async function legacyBindWx(brandName?: string) {
  return startAccountBind('微信公众号', brandName);
}

/** 按 platform-auth.json 为品牌补齐待授权占位，已有记录不覆盖 */
export async function ensurePlatformAccountBindings(brandId?: string): Promise<void> {
  const platforms = loadPlatformAuthConfig();
  const brands = brandId
    ? await prisma.brand.findMany({ where: { id: brandId } })
    : await prisma.brand.findMany({ where: { status: { not: 'archived' } } });

  for (const brand of brands) {
    const existing = await prisma.accountBinding.findMany({
      where: { brandId: brand.id },
      select: { platform: true },
    });
    const have = new Set(existing.map((e) => e.platform));
    for (const entry of platforms) {
      if (have.has(entry.platform)) continue;
      await prisma.accountBinding.create({
        data: {
          brandId: brand.id,
          platform: entry.platform,
          accountName: '未绑定',
          status: '待授权',
          permissions: entry.permissionsLabel,
          lastChecked: '—',
        },
      });
    }
  }
}

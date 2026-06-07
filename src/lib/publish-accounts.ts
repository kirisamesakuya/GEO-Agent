import type { AccountBinding } from '../types';

export interface AvailablePublishAccount {
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

export function toAccountBindingShape(a: AvailablePublishAccount): AccountBinding {
  return {
    id: a.id,
    platform: a.platform as AccountBinding['platform'],
    accountName: a.accountName,
    status: a.status as AccountBinding['status'],
    permissions: a.permissions,
    lastChecked: a.lastChecked,
    authMethod: a.authMethod,
    expiresAt: a.expiresAt,
  };
}

/** 品牌可用于 Hermes 发布的本机账号（已登录且已分配） */
export async function fetchAvailablePublishAccounts(
  brandName: string
): Promise<AvailablePublishAccount[]> {
  if (!brandName || brandName === '__all__') return [];
  const res = await fetch(
    `/api/brands/by-name/${encodeURIComponent(brandName)}/available-publish-accounts`
  );
  if (!res.ok) {
    const fallback = await fetch(`/api/accounts?brandName=${encodeURIComponent(brandName)}`);
    if (!fallback.ok) return [];
    const legacy = (await fallback.json()) as AccountBinding[];
    return legacy.map((b) => ({
      id: b.id,
      adAccountId: b.id,
      platform: b.platform,
      accountName: b.accountName,
      status: b.status,
      permissions: b.permissions,
      lastChecked: b.lastChecked,
      authMethod: b.authMethod,
      expiresAt: b.expiresAt,
      ownerType: 'brand',
      ownerName: brandName,
      isDefault: false,
    }));
  }
  return res.json();
}

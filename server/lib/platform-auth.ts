import type { Request, Response } from 'express';

export type PlatformRole = 'admin' | 'ops' | 'reviewer' | 'support';

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  admin: '管理员',
  ops: '运营',
  reviewer: '审核',
  support: '客服',
};

export const ROLE_PERMISSIONS: Record<PlatformRole, string[]> = {
  admin: ['*'],
  ops: [
    'dashboard',
    'agents',
    'hermes',
    'providers',
    'org_certs',
    'merchants',
    'applications',
    'orders',
    'website',
    'funds',
    'configs',
    'audit',
    'content_governance',
    'risk_center',
    'resource_review',
    'roles',
    'ranking_ops',
    'fulfillment_rating',
    'notifications',
    'settlement',
    'reports',
    'funds.adjust',
    'funds.deposit',
    'merchant.disable',
    'config.write',
    'orders.assign',
    'orders.reassign',
    'settlement.write',
    'agent.review',
  ],
  reviewer: [
    'dashboard',
    'providers',
    'org_certs',
    'merchants',
    'applications',
    'orders',
    'website',
    'audit',
    'content_governance',
    'risk_center',
    'resource_review',
    'ranking_ops',
    'fulfillment_rating',
    'notifications',
    'settlement',
    'reports',
    'orders.assign',
    'orders.reassign',
    'settlement.write',
    'agent.review',
  ],
  support: [
    'dashboard',
    'merchants',
    'orders',
    'website',
    'audit',
    'agents',
    'agent.review',
    'risk_center',
    'content_governance',
    'notifications',
  ],
};

export function canPlatformAccess(role: PlatformRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

export function platformNavForRole(role: PlatformRole): string[] {
  const keys = [
    'dashboard',
    'agents',
    'hermes',
    'providers',
    'org_certs',
    'merchants',
    'applications',
    'orders',
    'website',
    'funds',
    'configs',
    'audit',
    'content_governance',
    'risk_center',
    'resource_review',
    'roles',
    'ranking_ops',
    'fulfillment_rating',
    'notifications',
    'settlement',
    'reports',
  ];
  return keys.filter((k) => canPlatformAccess(role, k));
}

export function isValidPlatformRole(role: string): role is PlatformRole {
  return role in ROLE_PERMISSIONS;
}

/**
 * DEMO_ONLY:
 * 当前平台端角色由前端模拟切换（localStorage / X-Platform-Role），仅用于展示不同运营角色视角。
 *
 * PRODUCTION_TODO:
 * 真实产品中角色必须来自登录用户的后端权限系统。
 * 后端不得信任 localStorage、query、body 或 X-Platform-Role。
 */
export function getPlatformRoleFromRequest(req: Request): PlatformRole | null {
  const fromCtx = req.ctx?.platformRole;
  if (fromCtx && isValidPlatformRole(fromCtx)) return fromCtx;

  const header = req.headers['x-platform-role'];
  const fromHeader = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : '';
  const fromBody = (req.body as { role?: string } | undefined)?.role;
  const fromQuery = typeof req.query.role === 'string' ? req.query.role : '';
  const role = (fromHeader || fromBody || fromQuery || '').trim();
  return isValidPlatformRole(role) ? role : null;
}

/** @deprecated 请使用 server/middleware/require-platform.js 中的 requirePlatformPermission */
export function requirePlatformPermission(
  req: Request,
  res: Response,
  permission: string
): PlatformRole | null {
  const role = getPlatformRoleFromRequest(req);
  if (!role) {
    res.status(403).json({ error: '缺少平台角色（请求头 X-Platform-Role）' });
    return null;
  }
  if (!canPlatformAccess(role, permission)) {
    res.status(403).json({ error: '当前角色无权执行此操作' });
    return null;
  }
  return role;
}

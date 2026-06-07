import type { Request, Response } from 'express';
import {
  canPlatformAccess,
  isValidPlatformRole,
  type PlatformRole,
} from '../lib/platform-auth.js';
import { getAuthMode } from './request-context.js';

function readClientPlatformRole(req: Request): PlatformRole | null {
  const header = req.headers['x-platform-role'];
  const fromHeader = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : '';
  const fromBody = (req.body as { role?: string } | undefined)?.role;
  const fromQuery = typeof req.query.role === 'string' ? req.query.role : '';
  const role = (fromHeader || fromBody || fromQuery || '').trim();
  return isValidPlatformRole(role) ? role : null;
}

/**
 * DEMO_ONLY:
 * Demo 模式仍接受 X-Platform-Role / query / body 传角色。
 *
 * PRODUCTION_TODO:
 * session 模式平台角色必须来自 PlatformUserRole 表，不得信任前端 header。
 */
export function requirePlatformRole(req: Request, res: Response): PlatformRole | null {
  const fromCtx = req.ctx?.platformRole;
  const fromClient = readClientPlatformRole(req);

  if (getAuthMode() === 'session') {
    if (!fromCtx || !isValidPlatformRole(fromCtx)) {
      res.status(401).json({ error: '未登录或无平台角色' });
      return null;
    }
    if (fromClient && fromClient !== fromCtx) {
      res.status(403).json({ error: '平台角色与登录态不一致' });
      return null;
    }
    return fromCtx;
  }

  const role = fromCtx || fromClient;
  if (!role) {
    res.status(403).json({ error: '缺少平台角色（请求头 X-Platform-Role）' });
    return null;
  }
  return role;
}

export function requirePlatformPermission(
  req: Request,
  res: Response,
  permission: string
): PlatformRole | null {
  const role = requirePlatformRole(req, res);
  if (!role) return null;
  if (!canPlatformAccess(role, permission)) {
    res.status(403).json({ error: '当前角色无权执行此操作' });
    return null;
  }
  return role;
}

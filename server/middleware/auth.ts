import type { NextFunction, Request, Response } from 'express';
import { resolveRequestContext } from '../services/auth.service.js';
import { getAuthMode } from './request-context.js';

/**
 * DEMO_ONLY:
 * Demo 模式下允许无 Session 访问 API，并从请求参数推断身份。
 *
 * PRODUCTION_TODO:
 * AUTH_MODE=session 时未登录请求应返回 401（公开路由除外）。
 */
export async function attachRequestContext(req: Request, _res: Response, next: NextFunction) {
  try {
    req.ctx = (await resolveRequestContext(req)) ?? undefined;
  } catch (err) {
    console.warn('[auth] resolve context failed:', err instanceof Error ? err.message : err);
  }
  next();
}

export function requireAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.ctx?.userId) return next();
  if (getAuthMode() === 'demo') return next();
  res.status(401).json({ error: '未登录' });
}

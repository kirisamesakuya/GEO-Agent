import type { Request, Response } from 'express';
import { getProvider } from '../services/provider.service.js';
import { getAuthMode } from './request-context.js';

function readClientProviderId(req: Request): string {
  const fromQuery = typeof req.query.providerId === 'string' ? req.query.providerId : '';
  const fromBody = (req.body as { providerId?: string } | undefined)?.providerId ?? '';
  return (fromQuery || fromBody).trim();
}

/**
 * 解析当前请求可访问的 providerId。
 * session 模式：仅信任登录态，拒绝越权访问其他 provider。
 * demo 模式：兼容前端 query/body 传参，逐步迁移至 /api/provider/me。
 */
export function requireProviderId(req: Request, res: Response): string | null {
  const fromCtx = req.ctx?.providerId;
  const clientId = readClientProviderId(req);

  if (getAuthMode() === 'session') {
    if (!fromCtx) {
      res.status(401).json({ error: '未登录或未绑定接单方' });
      return null;
    }
    if (clientId && clientId !== fromCtx) {
      res.status(403).json({ error: '无权访问其他接单方数据' });
      return null;
    }
    return fromCtx;
  }

  const id = fromCtx || clientId;
  if (!id) {
    res.status(400).json({ error: '缺少 providerId' });
    return null;
  }
  if (fromCtx && clientId && clientId !== fromCtx) {
    res.status(403).json({ error: '无权访问其他接单方数据' });
    return null;
  }
  return id;
}

/** 解析接单方身份，并从 DB 读取 providerName，避免前端伪造名称 */
export async function requireProviderIdentity(
  req: Request,
  res: Response
): Promise<{ providerId: string; providerName: string } | null> {
  const providerId = requireProviderId(req, res);
  if (!providerId) return null;
  const provider = await getProvider(providerId);
  if (!provider) {
    res.status(404).json({ error: '接单方不存在' });
    return null;
  }
  return { providerId, providerName: provider.name };
}

/** providerId 可选场景（如任务大厅浏览），仍校验越权 */
export function resolveOptionalProviderId(req: Request, res: Response): string | undefined | null {
  const fromQuery = typeof req.query.providerId === 'string' ? req.query.providerId.trim() : '';
  const fromCtx = req.ctx?.providerId;

  if (getAuthMode() === 'session') {
    return fromCtx;
  }

  const id = fromCtx || fromQuery;
  if (fromCtx && fromQuery && fromQuery !== fromCtx) {
    res.status(403).json({ error: '无权访问其他接单方数据' });
    return null;
  }
  return id || undefined;
}

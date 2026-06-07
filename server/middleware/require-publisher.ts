import type { Request, Response } from 'express';
import { prisma } from '../db/client.js';
import { getAuthMode } from './request-context.js';

function readClientBrandName(req: Request): string {
  const fromQuery = typeof req.query.brandName === 'string' ? req.query.brandName : '';
  const fromBody = (req.body as { brandName?: string } | undefined)?.brandName ?? '';
  return (fromQuery || fromBody).trim();
}

function assertBrandScope(req: Request, res: Response, brandName: string): boolean {
  const ctxBrand = req.ctx?.brandName?.trim();
  if (ctxBrand && brandName !== ctxBrand) {
    res.status(403).json({ error: '无权访问该品牌数据' });
    return false;
  }
  return true;
}

/**
 * 解析当前请求可访问的 brandName。
 * session 模式：校验 brand 属于当前用户 organization/brand 权限。
 * demo 模式：兼容前端 localStorage 选品牌。
 */
export async function requireBrandName(req: Request, res: Response): Promise<string | null> {
  const clientBrand = readClientBrandName(req);
  const ctxBrand = req.ctx?.brandName?.trim();

  if (getAuthMode() === 'session') {
    const brandName = clientBrand || ctxBrand;
    if (!brandName) {
      res.status(400).json({ error: '缺少 brandName' });
      return null;
    }
    const brand = await prisma.brand.findFirst({
      where: { name: brandName },
      select: { id: true, organizationId: true },
    });
    if (!brand) {
      res.status(404).json({ error: '品牌不存在' });
      return null;
    }
    if (req.ctx?.organizationId && brand.organizationId !== req.ctx.organizationId) {
      res.status(403).json({ error: '无权访问该品牌数据' });
      return null;
    }
    if (req.ctx?.brandIds?.length && !req.ctx.brandIds.includes(brand.id)) {
      res.status(403).json({ error: '无权访问该品牌数据' });
      return null;
    }
    return brandName;
  }

  const brandName = clientBrand || ctxBrand;
  if (!brandName) {
    res.status(400).json({ error: '缺少 brandName' });
    return null;
  }
  if (!assertBrandScope(req, res, brandName)) return null;
  return brandName;
}

/** 用于 URL 路径参数 `:brandName` 的场景 */
export async function requireBrandNameParam(
  req: Request,
  res: Response,
  brandName: string
): Promise<string | null> {
  const decoded = decodeURIComponent(brandName).trim();
  if (!decoded || decoded === '__all__') {
    res.status(400).json({ error: '请选择具体品牌' });
    return null;
  }

  if (getAuthMode() === 'session') {
    const brand = await prisma.brand.findFirst({
      where: { name: decoded },
      select: { id: true, organizationId: true },
    });
    if (!brand) {
      res.status(404).json({ error: '品牌不存在' });
      return null;
    }
    if (req.ctx?.organizationId && brand.organizationId !== req.ctx.organizationId) {
      res.status(403).json({ error: '无权访问该品牌数据' });
      return null;
    }
    if (req.ctx?.brandIds?.length && !req.ctx.brandIds.includes(brand.id)) {
      res.status(403).json({ error: '无权访问该品牌数据' });
      return null;
    }
    return decoded;
  }

  if (!assertBrandScope(req, res, decoded)) return null;
  return decoded;
}

/** 校验已有资源上的 brandName 是否在当前 scope 内 */
export async function requireBrandAccess(
  req: Request,
  res: Response,
  brandName: string | null | undefined
): Promise<string | null> {
  if (!brandName?.trim()) return brandName ?? null;
  return requireBrandNameParam(req, res, brandName);
}

/** session 模式下要求商家端用户；demo 模式放行 */
export function requirePublisherUser(req: Request, res: Response): boolean {
  if (getAuthMode() === 'demo') return true;
  if (req.ctx?.userType === 'publisher' && req.ctx.userId) return true;
  res.status(403).json({ error: '仅商家端用户可访问' });
  return false;
}

/**
 * GEO 分析 workspace 品牌解析。
 * 正常模式：必须命中当前 scope。
 * prospect 售前模式：workspace 仍须来自当前商家上下文，分析目标可为第三方品牌。
 */
export async function resolveGeoAnalysisWorkspace(
  req: Request,
  res: Response,
  input: { prospectMode?: boolean; workspaceBrandName?: string; brandName?: string; brand?: string }
): Promise<string | null> {
  const fromBody = String(
    input.workspaceBrandName ?? input.brandName ?? input.brand ?? ''
  ).trim();
  const fromCtx = req.ctx?.brandName?.trim();
  const workspace = fromBody || fromCtx;

  if (Boolean(input.prospectMode)) {
    if (getAuthMode() === 'session') {
      const scoped = await requireBrandName(req, res);
      return scoped;
    }
    if (!workspace) {
      res.status(400).json({ error: '缺少 workspace 品牌上下文' });
      return null;
    }
    if (fromCtx && workspace !== fromCtx) {
      res.status(403).json({ error: '无权以其他品牌发起售前分析' });
      return null;
    }
    return workspace;
  }

  return requireBrandName(req, res);
}

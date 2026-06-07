import { createHash, randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { findBrandRow, updateBrandProfile } from './brand.service.js';
import {
  classifyBrandSourceMaterial,
  parseBrandSourceMaterials,
  type BrandSourceMaterial,
} from '../../lib/brand-source-material.js';

const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

export function detectBrandClueInputType(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return 'description';
  if (/^https?:\/\//i.test(trimmed)) {
    if (/xiaohongshu|douyin|weixin|dianping|meituan|taobao|tmall|jd\.com/i.test(trimmed)) {
      return 'social_link';
    }
    return 'website_url';
  }
  if (trimmed.length <= 30 && !/[，。！？,.!?]/.test(trimmed)) {
    return 'brand_name';
  }
  return 'description';
}

export async function addBrandSourceMaterial(input: {
  brandName: string;
  name: string;
  url: string;
  mimeType?: string;
  kind?: BrandSourceMaterial['kind'];
}): Promise<BrandSourceMaterial> {
  const brand = await findBrandRow(input.brandName);
  if (!brand) throw new Error('品牌不存在');

  const material: BrandSourceMaterial = {
    id: randomUUID(),
    kind: classifyBrandSourceMaterial(input.name, input.mimeType, input.kind),
    name: input.name,
    url: input.url,
    mimeType: input.mimeType,
  };

  const existing = parseBrandSourceMaterials(brand.sourceMaterials);
  await updateBrandProfile(
    { sourceMaterials: [...existing, material] },
    input.brandName
  );
  return material;
}

type SignedUrlPayload = {
  materialId: string;
  brandName: string;
  taskId?: string;
  deviceIdHash?: string;
  expiresAt: number;
};

function signPayload(payload: SignedUrlPayload): string {
  const secret = process.env.SIGNED_URL_SECRET ?? 'geo-dev-secret';
  const body = JSON.stringify(payload);
  const sig = createHash('sha256').update(`${body}:${secret}`).digest('hex').slice(0, 16);
  return Buffer.from(JSON.stringify({ ...payload, sig })).toString('base64url');
}

export function verifySignedUrlToken(token: string): SignedUrlPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64url').toString()) as SignedUrlPayload & {
      sig: string;
    };
    const { sig, ...payload } = parsed;
    const expected = signPayload(payload as SignedUrlPayload);
    const secret = process.env.SIGNED_URL_SECRET ?? 'geo-dev-secret';
    const body = JSON.stringify(payload);
    const expectedSig = createHash('sha256')
      .update(`${body}:${secret}`)
      .digest('hex')
      .slice(0, 16);
    if (sig !== expectedSig) return null;
    if (Date.now() > payload.expiresAt) return null;
    return payload as SignedUrlPayload;
  } catch {
    return null;
  }
}

export async function createBrandSourceMaterialSignedUrl(input: {
  brandName: string;
  materialId: string;
  taskId?: string;
  deviceIdHash?: string;
}): Promise<{ url: string; expiresAt: string }> {
  const brand = await findBrandRow(input.brandName);
  if (!brand) throw new Error('品牌不存在');

  const materials = parseBrandSourceMaterials(brand.sourceMaterials);
  const material = materials.find((m) => m.id === input.materialId);
  if (!material) throw new Error('资料不存在');

  const expiresAt = Date.now() + SIGNED_URL_TTL_MS;
  const token = signPayload({
    materialId: input.materialId,
    brandName: input.brandName,
    taskId: input.taskId,
    deviceIdHash: input.deviceIdHash,
    expiresAt,
  });

  const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const fileUrl = material.url.startsWith('http')
    ? material.url
    : `${baseUrl}${material.url.startsWith('/') ? '' : '/'}${material.url}`;

  return {
    url: `${fileUrl}?signed=${token}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export function resolveSignedMaterialPath(materialUrl: string, uploadsDir: string): string | null {
  const clean = materialUrl.replace(/^\//, '').split('?')[0];
  if (!clean.startsWith('uploads/')) return null;
  const filePath = path.join(uploadsDir, path.basename(clean));
  return fs.existsSync(filePath) ? filePath : null;
}

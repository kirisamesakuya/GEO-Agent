import { prisma } from '../db/client.js';
import { findBrandRow } from './brand.service.js';

export interface MediaAssetDto {
  id: string;
  brandId: string;
  url: string;
  name: string;
  group: string;
  tags: string[];
  platforms: string[];
  useCount: number;
  createdAt: string;
}

function mapRow(row: {
  id: string;
  brandId: string;
  url: string;
  name: string;
  group: string;
  tags: string;
  platforms: string;
  useCount: number;
  createdAt: Date;
}): MediaAssetDto {
  return {
    id: row.id,
    brandId: row.brandId,
    url: row.url,
    name: row.name,
    group: row.group,
    tags: JSON.parse(row.tags || '[]') as string[],
    platforms: JSON.parse(row.platforms || '[]') as string[],
    useCount: row.useCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listMediaAssets(brandName: string, group?: string): Promise<MediaAssetDto[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];
  const rows = await prisma.mediaAsset.findMany({
    where: { brandId: brand.id, ...(group ? { group } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapRow);
}

export async function createMediaAsset(
  brandName: string,
  data: {
    url: string;
    name: string;
    group?: string;
    tags?: string[];
    platforms?: string[];
  }
): Promise<MediaAssetDto> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  const row = await prisma.mediaAsset.create({
    data: {
      brandId: brand.id,
      url: data.url,
      name: data.name,
      group: data.group ?? 'general',
      tags: JSON.stringify(data.tags ?? []),
      platforms: JSON.stringify(data.platforms ?? []),
    },
  });
  return mapRow(row);
}

export async function incrementMediaUse(id: string): Promise<void> {
  await prisma.mediaAsset.update({
    where: { id },
    data: { useCount: { increment: 1 } },
  });
}

export async function deleteMediaAsset(id: string, brandName: string): Promise<void> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  await prisma.mediaAsset.deleteMany({ where: { id, brandId: brand.id } });
}

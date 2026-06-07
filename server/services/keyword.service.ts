import { prisma } from '../db/client.js';
import { findBrandRow } from './brand.service.js';

export type KeywordGroup = 'brand' | 'industry' | 'longtail' | 'geo' | 'competitor';

export interface KeywordDto {
  id: string;
  brandId: string;
  term: string;
  group: KeywordGroup;
  source: string;
  createdAt: string;
}

function mapRow(row: {
  id: string;
  brandId: string;
  term: string;
  group: string;
  source: string;
  createdAt: Date;
}): KeywordDto {
  return {
    id: row.id,
    brandId: row.brandId,
    term: row.term,
    group: row.group as KeywordGroup,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function syncKeywordsFromBrand(brandName: string): Promise<number> {
  const brand = await findBrandRow(brandName);
  if (!brand) return 0;
  const terms = JSON.parse(brand.keywords || '[]') as string[];
  let added = 0;
  for (const term of terms) {
    const t = term.trim();
    if (!t) continue;
    const existing = await prisma.keywordEntry.findFirst({ where: { brandId: brand.id, term: t } });
    if (existing) continue;
    await prisma.keywordEntry.create({
      data: { brandId: brand.id, term: t, group: 'brand', source: 'manual' },
    });
    added++;
  }
  return added;
}

export async function listKeywords(
  brandName: string,
  opts?: { group?: string; q?: string }
): Promise<KeywordDto[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];
  await syncKeywordsFromBrand(brandName);
  const rows = await prisma.keywordEntry.findMany({
    where: {
      brandId: brand.id,
      ...(opts?.group ? { group: opts.group } : {}),
      ...(opts?.q ? { term: { contains: opts.q } } : {}),
    },
    orderBy: [{ group: 'asc' }, { term: 'asc' }],
  });
  return rows.map(mapRow);
}

export async function createKeyword(
  brandName: string,
  term: string,
  group: KeywordGroup = 'brand'
): Promise<KeywordDto> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  const row = await prisma.keywordEntry.create({
    data: { brandId: brand.id, term: term.trim(), group, source: 'manual' },
  });
  await syncBrandKeywordsJson(brand.id);
  return mapRow(row);
}

export async function bulkCreateKeywords(
  brandName: string,
  items: Array<{ term: string; group?: KeywordGroup; source?: string }>
): Promise<KeywordDto[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  const created: KeywordDto[] = [];
  for (const item of items) {
    const t = item.term.trim();
    if (!t) continue;
    try {
      const row = await prisma.keywordEntry.create({
        data: {
          brandId: brand.id,
          term: t,
          group: item.group ?? 'brand',
          source: item.source ?? 'ai_mining',
        },
      });
      created.push(mapRow(row));
    } catch {
      // skip duplicate
    }
  }
  await syncBrandKeywordsJson(brand.id);
  return created;
}

export async function deleteKeyword(id: string, brandName: string): Promise<void> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  const row = await prisma.keywordEntry.findFirst({ where: { id, brandId: brand.id } });
  if (!row) throw new Error('关键词不存在');
  await prisma.keywordEntry.delete({ where: { id } });
  await syncBrandKeywordsJson(brand.id);
}

async function syncBrandKeywordsJson(brandId: string) {
  const entries = await prisma.keywordEntry.findMany({
    where: { brandId, group: 'brand' },
    orderBy: { term: 'asc' },
  });
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return;
  await prisma.brand.update({
    where: { id: brandId },
    data: { keywords: JSON.stringify(entries.map((e) => e.term)) },
  });
}

export async function getKeywordTerms(brandName: string, limit = 20): Promise<string[]> {
  const rows = await listKeywords(brandName);
  return rows.slice(0, limit).map((r) => r.term);
}

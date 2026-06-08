import { prisma } from '../db/client.js';
import { findBrandRow } from './brand.service.js';
import {
  KNOWLEDGE_MAX_ENTRIES_PER_CATEGORY,
  normalizeKnowledgeBody,
  normalizeKnowledgeTitle,
  validateKnowledgeText,
} from '../../lib/knowledge-limits.js';

export type KnowledgeCategory =
  | 'intro'
  | 'product'
  | 'case'
  | 'credential'
  | 'faq'
  | 'contact';

export interface KnowledgeDto {
  id: string;
  brandId: string;
  category: KnowledgeCategory;
  title: string;
  body: string;
  sortOrder: number;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  intro: '企业介绍',
  product: '产品服务',
  case: '客户案例',
  credential: '资质背书',
  faq: 'FAQ',
  contact: '联系方式',
};

export function knowledgeCategoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat as KnowledgeCategory] ?? cat;
}

function mapRow(row: {
  id: string;
  brandId: string;
  category: string;
  title: string;
  body: string;
  sortOrder: number;
  updatedAt: Date;
}): KnowledgeDto {
  return {
    id: row.id,
    brandId: row.brandId,
    category: row.category as KnowledgeCategory,
    title: row.title,
    body: row.body,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listKnowledge(
  brandName: string,
  category?: string
): Promise<KnowledgeDto[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) return [];
  const rows = await prisma.knowledgeEntry.findMany({
    where: {
      brandId: brand.id,
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
  return rows.map(mapRow);
}

export async function upsertKnowledge(
  brandName: string,
  data: {
    id?: string;
    category: KnowledgeCategory;
    title: string;
    body: string;
    sortOrder?: number;
  }
): Promise<KnowledgeDto> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');

  const title = normalizeKnowledgeTitle(data.title, knowledgeCategoryLabel(data.category));
  const body = normalizeKnowledgeBody(data.body);
  const validationError = validateKnowledgeText(title, body);
  if (validationError) throw new Error(validationError);

  if (data.id) {
    const existing = await prisma.knowledgeEntry.findFirst({
      where: { id: data.id, brandId: brand.id },
    });
    if (!existing) throw new Error('条目不存在');
    const row = await prisma.knowledgeEntry.update({
      where: { id: data.id },
      data: {
        category: data.category,
        title,
        body,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    return mapRow(row);
  }

  const count = await prisma.knowledgeEntry.count({
    where: { brandId: brand.id, category: data.category },
  });
  if (count >= KNOWLEDGE_MAX_ENTRIES_PER_CATEGORY) {
    throw new Error(`每个分类最多 ${KNOWLEDGE_MAX_ENTRIES_PER_CATEGORY} 条，请先删除后再新增`);
  }

  const row = await prisma.knowledgeEntry.create({
    data: {
      brandId: brand.id,
      category: data.category,
      title,
      body,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  return mapRow(row);
}

export async function deleteKnowledge(id: string, brandName: string): Promise<void> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  const row = await prisma.knowledgeEntry.findFirst({ where: { id, brandId: brand.id } });
  if (!row) throw new Error('条目不存在');
  await prisma.knowledgeEntry.delete({ where: { id } });
}

export async function bulkCreateKnowledge(
  brandName: string,
  items: Array<{ category: KnowledgeCategory; title: string; body: string }>
): Promise<KnowledgeDto[]> {
  const brand = await findBrandRow(brandName);
  if (!brand) throw new Error('品牌不存在');
  const created: KnowledgeDto[] = [];
  for (const item of items) {
    const title = normalizeKnowledgeTitle(item.title);
    const body = normalizeKnowledgeBody(item.body);
    if (!title || !body) continue;
    if (validateKnowledgeText(title, body)) continue;

    const categoryCount = await prisma.knowledgeEntry.count({
      where: { brandId: brand.id, category: item.category },
    });
    if (categoryCount >= KNOWLEDGE_MAX_ENTRIES_PER_CATEGORY) continue;

    const existing = await prisma.knowledgeEntry.findFirst({
      where: { brandId: brand.id, category: item.category, title },
    });
    if (existing) continue;
    const row = await prisma.knowledgeEntry.create({
      data: {
        brandId: brand.id,
        category: item.category,
        title,
        body,
        sortOrder: 0,
      },
    });
    created.push(mapRow(row));
  }
  return created;
}

export async function retrieveKnowledgeContext(
  brandName: string,
  categories?: KnowledgeCategory[],
  maxChars = 4000
): Promise<string> {
  const brand = await findBrandRow(brandName);
  if (!brand) return '';
  const cats = categories?.length
    ? categories
    : (['intro', 'product', 'faq'] as KnowledgeCategory[]);
  const rows = await prisma.knowledgeEntry.findMany({
    where: { brandId: brand.id, category: { in: cats } },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
  if (rows.length === 0) {
    const profile = brand.description?.trim();
    return profile ? `【企业介绍】${profile.slice(0, maxChars)}` : '';
  }
  let buf = '';
  for (const r of rows) {
    const block = `【${knowledgeCategoryLabel(r.category)}·${r.title}】\n${r.body}\n\n`;
    if (buf.length + block.length > maxChars) break;
    buf += block;
  }
  return buf.trim();
}

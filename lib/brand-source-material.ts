export type BrandSourceMaterialKind = 'image' | 'document' | 'link' | 'other';

export interface BrandSourceMaterial {
  id: string;
  kind: BrandSourceMaterialKind;
  name: string;
  url: string;
  mimeType?: string;
}

const IMAGE_MIME_PREFIX = 'image/';
const DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
]);
const DOCUMENT_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|md|csv)$/i;

export function classifyBrandSourceMaterial(
  name: string,
  mimeType?: string,
  forceKind?: BrandSourceMaterialKind
): BrandSourceMaterialKind {
  if (forceKind) return forceKind;
  const mime = (mimeType ?? '').toLowerCase();
  if (mime.startsWith(IMAGE_MIME_PREFIX)) return 'image';
  if (DOCUMENT_MIMES.has(mime) || DOCUMENT_EXT.test(name)) return 'document';
  return 'other';
}

export function brandSourceMaterialLabel(kind: BrandSourceMaterialKind): string {
  switch (kind) {
    case 'image':
      return '图片';
    case 'document':
      return '文档';
    case 'link':
      return '链接';
    default:
      return '其他';
  }
}

export function parseBrandSourceMaterials(raw: string | null | undefined): BrandSourceMaterial[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const items: BrandSourceMaterial[] = [];
    for (const item of parsed) {
      const row = item as Partial<BrandSourceMaterial>;
      if (!row.url || !row.name) continue;
      const kind =
        (row.kind as BrandSourceMaterialKind) ??
        classifyBrandSourceMaterial(row.name, row.mimeType);
      items.push({
        id: row.id ?? crypto.randomUUID(),
        kind,
        name: row.name,
        url: row.url,
        mimeType: row.mimeType,
      });
    }
    return items;
  } catch {
    return [];
  }
}

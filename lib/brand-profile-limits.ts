/** 品牌基础资料文本字段限制 */
export const BRAND_NAME_MAX = 20;
export const BRAND_DESCRIPTION_MAX = 300;

export function normalizeBrandName(name: string) {
  return name.trim().slice(0, BRAND_NAME_MAX);
}

export function normalizeBrandDescription(description: string) {
  return description.trim().slice(0, BRAND_DESCRIPTION_MAX);
}

export function validateBrandProfileText(input: {
  name?: string;
  description?: string;
}): string | null {
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return '品牌名称不能为空';
    if (name.length > BRAND_NAME_MAX) return `品牌名称不能超过 ${BRAND_NAME_MAX} 字`;
  }
  if (input.description !== undefined && input.description.trim().length > BRAND_DESCRIPTION_MAX) {
    return `业务描述不能超过 ${BRAND_DESCRIPTION_MAX} 字`;
  }
  return null;
}

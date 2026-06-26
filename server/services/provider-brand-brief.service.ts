import {
  buildProviderBrandBriefView,
  type ProviderBrandBriefView,
} from '../../lib/provider-brand-brief.js';
import { parseTaskBrief } from '../../lib/paid-source-brief.js';
import { getBrandProfile } from './brand.service.js';

export async function resolveProviderBrandBrief(
  brandName: string,
  taskBriefJson?: string | null
): Promise<ProviderBrandBriefView> {
  const profile = brandName ? await getBrandProfile(brandName) : null;
  const brief = parseTaskBrief(taskBriefJson);
  return buildProviderBrandBriefView(brandName, profile, brief);
}

export async function attachProviderBrandBriefs<
  T extends { brandName: string; taskBriefJson?: string | null },
>(orders: T[]): Promise<Array<T & { brandBrief: ProviderBrandBriefView }>> {
  const names = [...new Set(orders.map((o) => o.brandName).filter(Boolean))];
  const profileMap = new Map<string, Awaited<ReturnType<typeof getBrandProfile>>>();
  await Promise.all(
    names.map(async (name) => {
      profileMap.set(name, await getBrandProfile(name));
    })
  );

  return orders.map((order) => {
    const profile = profileMap.get(order.brandName) ?? null;
    const brief = parseTaskBrief(order.taskBriefJson);
    return {
      ...order,
      brandBrief: buildProviderBrandBriefView(order.brandName, profile, brief),
    };
  });
}

import { pcaTextArr, type DataItem } from 'element-china-area-data';

export const CHINA_REGION_TREE: DataItem[] = pcaTextArr;

const REGION_SEP = '/';

/** 存储格式：省/市/区，如 江苏省/南京市/鼓楼区 */
export function formatRegionValue(parts: [string, string, string]): string {
  return parts.filter(Boolean).join(REGION_SEP);
}

export function parseRegionValue(value: string): [string, string, string] {
  if (!value?.trim()) return ['', '', ''];
  const parts = value.split(REGION_SEP).map((s) => s.trim());
  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? ''];
}

function normalizeName(name: string): string {
  return name.trim().replace(/(省|市|自治区|特别行政区|区|县)$/, '');
}

function labelsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return normalizeName(a) === normalizeName(b);
}

/** 将旧版手填城市（如「南京」）解析为省市区路径 */
export function resolveRegionPartsFromLegacy(value: string): [string, string, string] {
  const parsed = parseRegionValue(value);
  if (parsed[0] && parsed[1]) return parsed;

  const raw = value.trim();
  if (!raw) return ['', '', ''];

  let best: [string, string, string] | null = null;

  const walk = (nodes: DataItem[], path: string[]) => {
    for (const node of nodes) {
      const next = [...path, node.label];
      const joined = next.join(REGION_SEP);
      if (labelsMatch(node.label, raw) || labelsMatch(joined, raw)) {
        if (next.length >= (best?.filter(Boolean).length ?? 0)) {
          best = [next[0] ?? '', next[1] ?? '', next[2] ?? ''];
        }
      }
      if (node.children?.length) walk(node.children, next);
    }
  };

  walk(CHINA_REGION_TREE, []);

  if (best) return best;

  for (const prov of CHINA_REGION_TREE) {
    for (const city of prov.children ?? []) {
      if (labelsMatch(city.label, raw)) {
        return [prov.label, city.label, ''];
      }
    }
  }

  return parsed;
}

export function findProvince(provinceLabel: string): DataItem | undefined {
  return CHINA_REGION_TREE.find((p) => p.label === provinceLabel);
}

export function listCities(provinceLabel: string): DataItem[] {
  return findProvince(provinceLabel)?.children ?? [];
}

export function findCity(provinceLabel: string, cityLabel: string): DataItem | undefined {
  return listCities(provinceLabel).find((c) => c.label === cityLabel);
}

export function listDistricts(provinceLabel: string, cityLabel: string): DataItem[] {
  return findCity(provinceLabel, cityLabel)?.children ?? [];
}

/** 直辖市等仅有一层「市辖区」时自动选中 */
export function resolveCityAfterProvince(provinceLabel: string, preferredCity = ''): string {
  const cities = listCities(provinceLabel);
  if (!cities.length) return '';
  if (preferredCity && cities.some((c) => c.label === preferredCity)) return preferredCity;
  if (cities.length === 1) return cities[0].label;
  return preferredCity;
}

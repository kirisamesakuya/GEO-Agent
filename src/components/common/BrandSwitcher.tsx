import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, ChevronDown } from 'lucide-react';
import { BRANDS_UPDATED_EVENT } from '../../lib/brand-events';
import {
  PROSPECT_BRAND_HINT,
  PROSPECT_BRAND_LABEL,
  PROSPECT_BRAND_SCOPE,
  resolveBrandSwitcherLabel,
} from '../../lib/brand-scope';

interface BrandItem {
  id: string;
  name: string;
  industry: string;
}

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  allowAll?: boolean;
  /** 下拉中展示「自定义」 */
  showProspectOption?: boolean;
  /** workspace：侧边栏；scope：功能页数据范围；title：标题旁仅图标切换 */
  variant?: 'header' | 'workspace' | 'scope' | 'title';
  /** variant=title 时品牌名样式 */
  titleClassName?: string;
}

export default function BrandSwitcher({
  brandName,
  onBrandChange,
  allowAll,
  showProspectOption,
  variant = 'scope',
  titleClassName,
}: Props) {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [open, setOpen] = useState(false);

  const loadBrands = useCallback(() => {
    fetch('/api/brands')
      .then((r) => r.json())
      .then((d) => setBrands(d.brands ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadBrands();
    const onUpdated = () => loadBrands();
    window.addEventListener(BRANDS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(BRANDS_UPDATED_EVENT, onUpdated);
  }, [loadBrands]);

  const value = resolveBrandSwitcherLabel(brandName);
  const isWorkspace = variant === 'workspace';
  const isScope = variant === 'scope';
  const isTitle = variant === 'title';

  const dropdown = open ? (
    <>
      <button type="button" className="fixed inset-0 z-40" aria-label="关闭" onClick={() => setOpen(false)} />
      <div
        className={`absolute z-50 min-w-[200px] geo-card py-1 ${
          isWorkspace ? 'left-0 right-0 top-full mt-1' : isTitle ? 'left-0 top-full mt-1' : 'left-0 top-full mt-1'
        }`}
        style={{ borderColor: 'var(--neutral-divider-02)' }}
      >
        {allowAll && (
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-xs geo-nav-item"
            onClick={() => {
              onBrandChange('__all__');
              setOpen(false);
            }}
          >
            全部品牌
          </button>
        )}
        {brands.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`w-full text-left px-3 py-2 text-xs ${b.name === brandName ? 'geo-nav-active' : 'geo-nav-item'}`}
            onClick={() => {
              onBrandChange(b.name);
              setOpen(false);
            }}
          >
            <span className="font-medium block">{b.name}</span>
            <span style={{ color: 'var(--neutral-text-03)' }}>{b.industry}</span>
          </button>
        ))}
        {showProspectOption && (
          <>
            <div
              className="mx-3 my-1"
              style={{ borderTop: '1px solid var(--neutral-divider-03)' }}
              role="separator"
            />
            <button
              type="button"
              className={`w-full text-left px-3 py-2 text-xs ${
                brandName === PROSPECT_BRAND_SCOPE ? 'geo-nav-active' : 'geo-nav-item'
              }`}
              onClick={() => {
                onBrandChange(PROSPECT_BRAND_SCOPE);
                setOpen(false);
              }}
            >
              <span className="font-medium block">{PROSPECT_BRAND_LABEL}</span>
              <span style={{ color: 'var(--neutral-text-03)' }}>{PROSPECT_BRAND_HINT}</span>
            </button>
          </>
        )}
      </div>
    </>
  ) : null;

  const openDropdown = () => {
    if (!open) loadBrands();
    setOpen((o) => !o);
  };

  if (isTitle) {
    return (
      <div className="relative flex items-center gap-2 min-w-0">
        <h3
          className={
            titleClassName ??
            'text-xl font-bold text-[var(--color-title)] truncate leading-tight'
          }
        >
          {value}
        </h3>
        <button
          type="button"
          onClick={openDropdown}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md border shrink-0 text-[var(--neutral-text-03)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors"
          style={{ borderColor: 'var(--neutral-divider-02)' }}
          aria-label="切换品牌"
          aria-expanded={open}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
        {dropdown}
      </div>
    );
  }

  return (
    <div className={`relative ${isWorkspace ? 'w-full' : isScope ? 'min-w-[140px]' : ''}`}>
      {isWorkspace && (
        <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--neutral-text-03)' }}>
          工作品牌
        </p>
      )}
      <button
        type="button"
        onClick={openDropdown}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border geo-nav-item ${
          isWorkspace ? 'w-full justify-between' : ''
        }`}
        style={{ borderColor: 'var(--neutral-divider-02)' }}
      >
        <span className="font-medium truncate">{value}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>
      {dropdown}
    </div>
  );
}

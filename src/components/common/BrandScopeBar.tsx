import BrandSwitcher from './BrandSwitcher';

interface BrandScopeBarProps {
  /** 业务语义说明，如「当前查看品牌」 */
  label: string;
  brandName: string;
  onBrandChange: (name: string) => void;
  allowAll?: boolean;
  showProspectOption?: boolean;
  className?: string;
}

/** 功能页顶部的数据范围选择，非全局身份入口 */
export default function BrandScopeBar({
  label,
  brandName,
  onBrandChange,
  allowAll,
  showProspectOption,
  className = '',
}: BrandScopeBarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 sm:gap-3 ${className}`}
      style={{
        padding: '10px 12px',
        borderRadius: '10px',
        border: '1px solid var(--neutral-divider-02)',
        background: 'var(--neutral-bg-03)',
      }}
    >
      <span className="text-xs font-medium shrink-0" style={{ color: 'var(--neutral-text-03)' }}>
        {label}
      </span>
      <BrandSwitcher
        variant="scope"
        brandName={brandName}
        onBrandChange={onBrandChange}
        allowAll={allowAll}
        showProspectOption={showProspectOption}
      />
    </div>
  );
}

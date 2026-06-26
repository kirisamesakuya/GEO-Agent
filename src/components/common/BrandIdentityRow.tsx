import BrandSwitcher from './BrandSwitcher';
import { resolveBrandSwitcherLabel } from '../../lib/brand-scope';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  allowAll?: boolean;
  showProspectOption?: boolean;
  className?: string;
}

/** 与工作台一致：圆形首字头像 + 大号品牌名 + 切换按钮 */
export default function BrandIdentityRow({
  brandName,
  onBrandChange,
  allowAll,
  showProspectOption,
  className = '',
}: Props) {
  const label = resolveBrandSwitcherLabel(brandName);
  const initial = label.trim().charAt(0) || '品';

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0"
        style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }}
        aria-hidden
      >
        {initial}
      </div>
      <BrandSwitcher
        variant="title"
        brandName={brandName}
        onBrandChange={onBrandChange}
        allowAll={allowAll}
        showProspectOption={showProspectOption}
      />
    </div>
  );
}

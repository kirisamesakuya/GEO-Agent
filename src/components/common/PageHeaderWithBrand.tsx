import type { ReactNode } from 'react';
import BrandIdentityRow from './BrandIdentityRow';

interface Props {
  title: string;
  description?: ReactNode;
  brandName: string;
  onBrandChange: (name: string) => void;
  allowAll?: boolean;
  showProspectOption?: boolean;
  actions?: ReactNode;
  /** @deprecated 页顶 Header 已展示标题；保留 prop 仅作无障碍朗读 */
  titleClassName?: string;
  className?: string;
}

/** 功能页品牌区：与工作台统一的圆形头像 + 品牌切换 */
export default function PageHeaderWithBrand({
  title,
  description,
  brandName,
  onBrandChange,
  allowAll,
  showProspectOption,
  actions,
  className = '',
}: Props) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0 flex-1">
        <h2 className="sr-only">{title}</h2>
        <BrandIdentityRow
          brandName={brandName}
          onBrandChange={onBrandChange}
          allowAll={allowAll}
          showProspectOption={showProspectOption}
        />
        {description &&
          (typeof description === 'string' ? (
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">{description}</p>
          ) : (
            description
          ))}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

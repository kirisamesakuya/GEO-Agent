import type { ReactNode } from 'react';
import BrandSwitcher from './BrandSwitcher';

interface Props {
  title: string;
  description?: ReactNode;
  brandName: string;
  onBrandChange: (name: string) => void;
  allowAll?: boolean;
  showProspectOption?: boolean;
  actions?: ReactNode;
  titleClassName?: string;
  className?: string;
}

/** 功能页主标题 + 品牌切换器（与标题同一行，不再单独占一行） */
export default function PageHeaderWithBrand({
  title,
  description,
  brandName,
  onBrandChange,
  allowAll,
  showProspectOption,
  actions,
  titleClassName = 'text-lg font-bold text-[var(--color-title)]',
  className = '',
}: Props) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className={titleClassName}>{title}</h2>
          <BrandSwitcher
            variant="scope"
            brandName={brandName}
            onBrandChange={onBrandChange}
            allowAll={allowAll}
            showProspectOption={showProspectOption}
          />
        </div>
        {description &&
          (typeof description === 'string' ? (
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{description}</p>
          ) : (
            description
          ))}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

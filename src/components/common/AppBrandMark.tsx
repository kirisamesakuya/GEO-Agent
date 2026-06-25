import type { ReactNode } from 'react';

interface Props {
  logo: ReactNode;
  prefix: string;
  productName: string;
  fullName: string;
  subtitle?: string | null;
  onClick?: () => void;
  className?: string;
}

export default function AppBrandMark({
  logo,
  prefix,
  productName,
  fullName,
  subtitle,
  onClick,
  className = '',
}: Props) {
  const body = (
    <>
      <div className="app-brand-mark__logo" aria-hidden>
        {logo}
      </div>
      <div className="app-brand-mark__copy min-w-0 flex-1">
        <p className="app-brand-mark__prefix">{prefix}</p>
        <p className="app-brand-mark__name" title={fullName}>
          {productName}
        </p>
        {subtitle ? <p className="app-brand-mark__subtitle">{subtitle}</p> : null}
      </div>
    </>
  );

  const shellClass = ['app-brand-mark', className].filter(Boolean).join(' ');

  if (onClick) {
    return (
      <button type="button" className={shellClass} onClick={onClick} aria-label={fullName}>
        {body}
      </button>
    );
  }

  return <div className={shellClass}>{body}</div>;
}

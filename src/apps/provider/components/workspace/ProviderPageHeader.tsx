interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function ProviderPageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold text-provider-title tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-provider-secondary mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

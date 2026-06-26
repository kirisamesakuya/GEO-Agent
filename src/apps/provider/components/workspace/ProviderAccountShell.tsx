interface NavItem {
  id: string;
  label: string;
}

interface Props {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  activeId: string;
  onNavChange: (id: string) => void;
  children: React.ReactNode;
}

/** 账户 / 财务类页面的二级导航布局（巨量星图账户管理型） */
export default function ProviderAccountShell({
  title,
  subtitle,
  nav,
  activeId,
  onNavChange,
  children,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-provider-title">{title}</h1>
        {subtitle && <p className="text-xs text-provider-muted mt-1">{subtitle}</p>}
      </div>
      <div className="flex flex-col lg:flex-row gap-5">
        <nav className="provider-section-card lg:w-56 shrink-0 p-2 h-fit">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavChange(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.id === activeId
                  ? 'bg-workbench-light text-workbench font-semibold'
                  : 'text-provider-secondary hover:bg-provider-subtle'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 min-w-0 space-y-4">{children}</div>
      </div>
    </div>
  );
}

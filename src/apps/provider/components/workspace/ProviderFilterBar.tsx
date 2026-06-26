import { Search } from 'lucide-react';

interface Props {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

export default function ProviderFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = '搜索任务、品牌…',
  children,
}: Props) {
  return (
    <div className="provider-section-card mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-provider-muted" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="provider-input-field pl-9 text-sm"
          />
        </div>
        {children}
      </div>
    </div>
  );
}

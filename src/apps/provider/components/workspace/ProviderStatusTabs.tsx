interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export default function ProviderStatusTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-provider-subtle mb-4">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
              selected
                ? 'border-workbench text-workbench'
                : 'border-transparent text-provider-secondary hover:text-provider-title'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  selected ? 'bg-workbench-light text-workbench' : 'bg-provider-subtle text-provider-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface StatItem {
  label: string;
  value: string | number;
}

interface Props {
  items: StatItem[];
}

export default function PlatformStatSummary({ items }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="platform-card px-4 py-3">
          <p className="text-xs text-[var(--platform-text-tertiary)]">{item.label}</p>
          <p className="mt-1 text-xl font-bold text-[var(--platform-text-title)]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

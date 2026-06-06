import { useEffect, useState } from 'react';

export default function HermesStatusBadge() {
  const [health, setHealth] = useState<{
    ok?: boolean;
    url?: string;
    detail?: string;
    executorDefault?: string;
    executorForPublish?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/hermes/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));
  }, []);

  if (!health) return null;

  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-md border inline-flex items-center gap-1"
      style={{
        borderColor: 'var(--neutral-divider-02)',
        color: health.ok ? 'var(--color-accent)' : 'var(--neutral-text-03)',
        background: health.ok ? 'var(--color-accent-light)' : 'var(--color-bg)',
      }}
      title={health.detail ?? health.url}
    >
      Hermes {health.ok ? '在线' : '离线'}
      {health.executorForPublish && ` · 发布:${health.executorForPublish}`}
    </span>
  );
}

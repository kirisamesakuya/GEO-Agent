import type { GeoAuditArtifact } from '../../lib/geo-audit-client';

interface Props {
  artifact: GeoAuditArtifact;
  className?: string;
}

function isMarkdown(type: string, name: string, mime?: string) {
  return (
    type === 'markdown' ||
    mime?.includes('markdown') ||
    name.endsWith('.md') ||
    name.toLowerCase().includes('markdown')
  );
}

function isJson(type: string, name: string, mime?: string) {
  return type === 'json' || mime?.includes('json') || name.endsWith('.json');
}

function isImage(type: string, mime?: string) {
  return type === 'screenshot' || type === 'image' || Boolean(mime?.startsWith('image/'));
}

export default function GeoArtifactPreview({ artifact, className = '' }: Props) {
  const { type, name, preview, url, mimeType } = artifact;

  if (isImage(type, mimeType) && (url || preview)) {
    const src = url ?? (preview?.startsWith('data:') ? preview : undefined);
    if (src) {
      return (
        <div className={className}>
          <img src={src} alt={name} className="max-w-full rounded-lg border" style={{ borderColor: 'var(--neutral-divider-02)' }} />
        </div>
      );
    }
  }

  if (isMarkdown(type, name, mimeType) && preview) {
    return (
      <pre className={`text-[11px] whitespace-pre-wrap overflow-auto max-h-64 bg-[var(--neutral-bg-03)] p-3 rounded-lg ${className}`}>
        {preview}
      </pre>
    );
  }

  if (isJson(type, name, mimeType) && preview) {
    let formatted = preview;
    try {
      formatted = JSON.stringify(JSON.parse(preview), null, 2);
    } catch {
      // keep raw
    }
    return (
      <pre className={`text-[10px] font-mono whitespace-pre-wrap overflow-auto max-h-64 bg-[var(--neutral-bg-03)] p-3 rounded-lg ${className}`}>
        {formatted}
      </pre>
    );
  }

  if (preview) {
    return (
      <pre className={`text-[11px] whitespace-pre-wrap overflow-auto max-h-48 bg-[var(--neutral-bg-03)] p-3 rounded-lg ${className}`}>
        {preview}
      </pre>
    );
  }

  if (url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={`geo-link text-xs ${className}`}>
        打开 {name}
      </a>
    );
  }

  return <p className={`text-xs text-[var(--neutral-text-03)] ${className}`}>暂无可预览内容</p>;
}

export function GeoArtifactList({
  artifacts,
  onSelect,
  selectedId,
}: {
  artifacts: GeoAuditArtifact[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  if (!artifacts.length) return null;

  return (
    <ul className="space-y-2 text-[11px]">
      {artifacts.map((a) => (
        <li
          key={a.id}
          className={`border rounded p-2 cursor-pointer transition-colors ${
            selectedId === a.id ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]/30' : ''
          }`}
          style={{ borderColor: selectedId === a.id ? undefined : 'var(--neutral-divider-02)' }}
          onClick={() => onSelect?.(a.id)}
          onKeyDown={(e) => e.key === 'Enter' && onSelect?.(a.id)}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
        >
          <p className="font-medium">{a.name}</p>
          <p className="text-[var(--neutral-text-03)]">{a.type}</p>
        </li>
      ))}
    </ul>
  );
}

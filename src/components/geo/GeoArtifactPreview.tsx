import type { GeoAuditArtifact } from '../../lib/geo-audit-client';
import { DEPLOY_BRIEF_BY_ARTIFACT_TYPE } from './geo-artifact-delivery-brief';

interface Props {
  artifact: GeoAuditArtifact;
  className?: string;
  onRegenerateAsset?: (assetType: string) => void;
}

function isMarkdown(type: string, name: string, mime?: string) {
  const safeName = name.toLowerCase();
  return (
    type === 'markdown' ||
    mime?.includes('markdown') ||
    safeName.endsWith('.md') ||
    safeName.includes('markdown')
  );
}

function isJson(type: string, name: string, mime?: string) {
  const safeName = name.toLowerCase();
  return type === 'json' || mime?.includes('json') || safeName.endsWith('.json');
}

function isImage(type: string, mime?: string) {
  return type === 'screenshot' || type === 'image' || Boolean(mime?.startsWith('image/'));
}

export default function GeoArtifactPreview({ artifact, className = '', onRegenerateAsset }: Props) {
  const type = artifact.type ?? '';
  const name = artifact.name ?? '未命名产物';
  const { preview, url, mimeType } = artifact;
  const deployBrief = DEPLOY_BRIEF_BY_ARTIFACT_TYPE[type] ?? DEPLOY_BRIEF_BY_ARTIFACT_TYPE.text;
  const assetTypeMap: Record<string, string> = {
    schema_jsonld: 'geo_schema',
    json: 'geo_schema',
    llms_txt: 'geo_llmstxt',
    robots_patch: 'geo_crawlers',
  };
  const regenType = assetTypeMap[type] ?? (name.includes('llms') ? 'geo_llmstxt' : undefined);

  const actionBar = (onRegenerateAsset || deployBrief) && (
    <div className="flex flex-wrap gap-2 mt-2">
      {deployBrief && (
        <button
          type="button"
          className="geo-btn-secondary geo-btn-xs"
          onClick={() => void navigator.clipboard.writeText(deployBrief)}
        >
          复制部署说明
        </button>
      )}
      {onRegenerateAsset && regenType && (
        <button
          type="button"
          className="geo-link text-[10px]"
          onClick={() => onRegenerateAsset(regenType)}
        >
          单独重新生成
        </button>
      )}
    </div>
  );

  if (isImage(type, mimeType) && (url || preview)) {
    const src = url ?? (preview?.startsWith('data:') ? preview : undefined);
    if (src) {
      return (
        <div className={className}>
          <img src={src} alt={name} className="max-w-full rounded-lg border" style={{ borderColor: 'var(--neutral-divider-02)' }} />
          {actionBar}
        </div>
      );
    }
  }

  if (isMarkdown(type, name, mimeType) && preview) {
    return (
      <div className={className}>
        <pre className="text-[11px] whitespace-pre-wrap overflow-auto max-h-64 bg-[var(--neutral-bg-03)] p-3 rounded-lg">
          {preview}
        </pre>
        {actionBar}
      </div>
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
      <div className={className}>
        <pre className="text-[10px] font-mono whitespace-pre-wrap overflow-auto max-h-64 bg-[var(--neutral-bg-03)] p-3 rounded-lg">
          {formatted}
        </pre>
        {actionBar}
      </div>
    );
  }

  if (preview) {
    return (
      <div className={className}>
        <pre className="text-[11px] whitespace-pre-wrap overflow-auto max-h-48 bg-[var(--neutral-bg-03)] p-3 rounded-lg">
          {preview}
        </pre>
        {actionBar}
      </div>
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
      {artifacts.map((a, index) => (
        <li
          key={a.id ?? `${a.type ?? 'artifact'}-${a.name ?? index}`}
          className={`border rounded p-2 cursor-pointer transition-colors ${
            selectedId === a.id ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]/30' : ''
          }`}
          style={{ borderColor: selectedId === a.id ? undefined : 'var(--neutral-divider-02)' }}
          onClick={() => onSelect?.(a.id)}
          onKeyDown={(e) => e.key === 'Enter' && onSelect?.(a.id)}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
        >
          <p className="font-medium">{a.name ?? '未命名产物'}</p>
          <p className="text-[var(--neutral-text-03)]">{a.type ?? 'unknown'}</p>
        </li>
      ))}
    </ul>
  );
}

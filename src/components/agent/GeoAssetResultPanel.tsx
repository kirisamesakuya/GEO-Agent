import type { AgentTask } from '../../types';
import GeoArtifactPreview from '../geo/GeoArtifactPreview';
import type { GeoAuditArtifact } from '../../lib/geo-audit-client';
import { extractAssetPreview } from '../../lib/geo-asset';

interface Props {
  task: AgentTask;
  onNavigate?: (view: import('../../types').ViewType, hint?: string) => void;
}

const ASSET_LABELS: Record<string, string> = {
  geo_schema: 'Schema JSON-LD',
  geo_llmstxt: 'llms.txt',
  geo_citability: '内容可引用性',
};

export default function GeoAssetResultPanel({ task, onNavigate }: Props) {
  if (!ASSET_LABELS[task.type]) return null;
  const output = task.output ?? {};
  const preview = extractAssetPreview(output);
  const artifacts = (output.artifacts as GeoAuditArtifact[] | undefined) ?? [];
  const asset = output.asset as { riskLevel?: string } | undefined;
  const reportId = output.geoReportId ? String(output.geoReportId) : undefined;

  return (
    <div className="geo-card p-6 space-y-4 border border-[var(--color-border)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-title)]">
            {ASSET_LABELS[task.type]} 草稿
          </h2>
          <p className="text-xs text-[var(--neutral-text-03)] mt-0.5">
            中风险资产 · 发布前需人工确认字段与表述
          </p>
        </div>
        {asset?.riskLevel && (
          <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-900 font-medium">
            {asset.riskLevel === 'medium' ? '中风险' : asset.riskLevel}
          </span>
        )}
      </div>

      {preview ? (
        artifacts.length > 0 ? (
          <GeoArtifactPreview artifact={artifacts[0]} />
        ) : (
          <pre className="text-[11px] whitespace-pre-wrap overflow-auto max-h-[40vh] bg-[var(--neutral-bg-03)] p-3 rounded-lg">
            {preview}
          </pre>
        )
      ) : (
        <p className="text-xs text-[var(--neutral-text-03)]">暂无预览内容</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {preview && (
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => {
              void navigator.clipboard.writeText(preview);
            }}
          >
            复制草稿
          </button>
        )}
        {onNavigate && reportId && (
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => onNavigate('geo_analysis', `report:${reportId}`)}
          >
            查看关联报告
          </button>
        )}
        {onNavigate && reportId && (
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => onNavigate('create_order', `geo:${reportId}`)}
          >
            生成整改任务包
          </button>
        )}
      </div>
    </div>
  );
}

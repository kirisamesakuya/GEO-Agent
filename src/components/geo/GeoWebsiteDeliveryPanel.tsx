import { useEffect, useMemo, useState } from 'react';
import type { ViewType } from '../../types';
import { isDisplayableGeoArtifact, type GeoAuditArtifact } from '../../lib/geo-audit-client';
import type { PreCrawlSnapshotView } from './GeoPreCrawlPanel';
import {
  deriveWebsiteRequirementStatus,
  type WebsiteRequirementRow,
} from '../../lib/website-requirement-nav';

export type AssetDraftItem = {
  id: string;
  label: string;
  done: boolean;
};

export function buildAssetDraftItems(input: {
  artifacts?: GeoAuditArtifact[];
  preCrawl?: PreCrawlSnapshotView | null;
}): AssetDraftItem[] {
  const arts = (input.artifacts ?? []).filter(isDisplayableGeoArtifact);
  const hasSchema =
    arts.some((a) => a.type === 'schema_jsonld' || a.type === 'json' || /schema/i.test(a.name ?? '')) ||
    (input.preCrawl?.htmlMeta?.jsonLdCount ?? 0) > 0;
  const hasLlms = arts.some((a) => a.type === 'llms_txt' || /llms/i.test(a.name ?? ''));
  const hasRobots =
    arts.some((a) => a.type === 'robots_patch' || /robots/i.test(a.name ?? '')) ||
    Boolean(input.preCrawl?.robotsTxt && (input.preCrawl.robotsTxt.blockedBots?.length ?? 0) === 0);

  return [
    { id: 'schema', label: 'Schema JSON-LD 草稿', done: hasSchema },
    { id: 'llms', label: 'llms.txt 草稿', done: hasLlms },
    { id: 'robots', label: 'robots 补丁草稿', done: hasRobots },
  ];
}

interface Props {
  brandName: string;
  artifacts?: GeoAuditArtifact[];
  preCrawl?: PreCrawlSnapshotView | null;
  compact?: boolean;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function GeoWebsiteDeliveryPanel({
  brandName,
  artifacts,
  preCrawl,
  compact = false,
  onNavigate,
}: Props) {
  const draftItems = useMemo(
    () => buildAssetDraftItems({ artifacts, preCrawl }),
    [artifacts, preCrawl]
  );
  const draftDone = draftItems.filter((i) => i.done).length;

  const [websitePending, setWebsitePending] = useState(0);
  const [websiteDelivered, setWebsiteDelivered] = useState(0);

  useEffect(() => {
    if (!brandName) return;
    void fetch(`/api/website-requests?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((d) => {
        const rows = (d.requests ?? []) as WebsiteRequirementRow[];
        let pending = 0;
        let delivered = 0;
        for (const row of rows) {
          if (deriveWebsiteRequirementStatus(row) === 'delivered') delivered += 1;
          else pending += 1;
        }
        setWebsitePending(pending);
        setWebsiteDelivered(delivered);
      })
      .catch(() => {
        setWebsitePending(0);
        setWebsiteDelivered(0);
      });
  }, [brandName]);

  return (
    <section className={`geo-card ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div>
        <h3 className="text-xs font-semibold text-[var(--color-title)]">网站 GEO 交付</h3>
        {!compact && (
          <p className="text-[10px] text-[var(--neutral-text-03)] mt-0.5">
            资产草稿在此生成，实际上线由网页需求线下交付跟踪。
          </p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-medium text-[var(--neutral-text-02)] mb-1.5">
          资产草稿（{draftDone}/{draftItems.length}）
        </p>
        <ul className="space-y-1.5">
          {draftItems.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-[10px]">
              <span className={item.done ? 'text-emerald-600' : 'text-[var(--neutral-text-04)]'}>
                {item.done ? '✓' : '○'}
              </span>
              <span className={item.done ? 'text-[var(--color-title)]' : 'text-[var(--neutral-text-02)]'}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="rounded-lg px-2.5 py-2 text-[10px] flex items-center justify-between gap-2"
        style={{ background: 'var(--neutral-bg-02)' }}
      >
        <span className="text-[var(--neutral-text-03)]">网页需求</span>
        <span className="text-[var(--color-title)] font-medium">
          待交付 {websitePending} · 已交付 {websiteDelivered}
        </span>
      </div>

      {onNavigate && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => onNavigate('create_website')}
          >
            提交网页需求
          </button>
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => onNavigate('content_delivery', 'website')}
          >
            查看交付进度
          </button>
        </div>
      )}
    </section>
  );
}

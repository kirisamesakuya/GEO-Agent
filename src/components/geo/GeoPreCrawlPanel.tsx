import type { GeoAuditFinding } from '../../lib/geo-audit-client';

export type PreCrawlSnapshotView = {
  brandUrl: string;
  fetchAt: string;
  partial?: boolean;
  homepage?: {
    status: number | null;
    responseTimeMs: number;
    error?: string | null;
  };
  htmlMeta?: {
    title: string | null;
    metaDescription: string | null;
    jsonLdCount: number;
    hasHttps: boolean;
  } | null;
  robotsTxt?: {
    blockedBots: string[];
    error?: string | null;
  };
};

export type RuleScorePreviewView = {
  totalScore: number;
  scores: Record<string, number>;
  scoringSource?: string;
};

function ruleFindings(findings: GeoAuditFinding[] | undefined): GeoAuditFinding[] {
  return (findings ?? []).filter((f) => (f as GeoAuditFinding & { source?: string }).source === 'rule' || !!(f as GeoAuditFinding & { evidence?: string }).evidence);
}

interface Props {
  snapshot?: PreCrawlSnapshotView | null;
  rulePreview?: RuleScorePreviewView | null;
  findings?: GeoAuditFinding[];
  scoringSource?: string | null;
  compact?: boolean;
}

export function extractPreCrawlFromAuditRaw(raw: Record<string, unknown> | null | undefined): {
  snapshot: PreCrawlSnapshotView | null;
  rulePreview: RuleScorePreviewView | null;
  scoringSource: string | null;
} {
  if (!raw) return { snapshot: null, rulePreview: null, scoringSource: null };
  const snapshot = (raw.preCrawlSnapshot as PreCrawlSnapshotView | undefined) ?? null;
  const rulePreview = (raw.ruleScorePreview as RuleScorePreviewView | undefined) ?? null;
  const metrics = raw.metrics as { scoringSource?: string } | undefined;
  return {
    snapshot,
    rulePreview,
    scoringSource: metrics?.scoringSource ?? rulePreview?.scoringSource ?? null,
  };
}

export default function GeoPreCrawlPanel({
  snapshot,
  rulePreview,
  findings,
  scoringSource,
  compact = false,
}: Props) {
  if (!snapshot && !rulePreview) return null;

  const ruleItems = ruleFindings(findings);
  const displayFindings = ruleItems.length > 0 ? ruleItems : findings?.slice(0, 5) ?? [];

  return (
    <section className={`geo-card ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-title)]">技术预检（Pre-Crawl）</h3>
          {!compact && (
            <p className="text-[10px] text-[var(--neutral-text-03)] mt-0.5">
              服务端确定性抓取与规则打分，同一 URL 技术项可复现
            </p>
          )}
        </div>
        {scoringSource && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--neutral-bg-02)] text-[var(--neutral-text-03)] shrink-0">
            {scoringSource}
          </span>
        )}
      </div>

      {snapshot && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          <div>
            <dt className="text-[var(--neutral-text-03)]">抓取时间</dt>
            <dd className="text-[var(--color-title)]">{new Date(snapshot.fetchAt).toLocaleString('zh-CN')}</dd>
          </div>
          <div>
            <dt className="text-[var(--neutral-text-03)]">HTTP</dt>
            <dd className="text-[var(--color-title)]">
              {snapshot.homepage?.status ?? '—'}
              {snapshot.homepage?.responseTimeMs != null && ` · ${snapshot.homepage.responseTimeMs}ms`}
            </dd>
          </div>
          {snapshot.htmlMeta && (
            <>
              <div className="col-span-2">
                <dt className="text-[var(--neutral-text-03)]">Title</dt>
                <dd className="text-[var(--color-title)] truncate">{snapshot.htmlMeta.title ?? '缺失'}</dd>
              </div>
              <div>
                <dt className="text-[var(--neutral-text-03)]">JSON-LD</dt>
                <dd className="text-[var(--color-title)]">{snapshot.htmlMeta.jsonLdCount} 块</dd>
              </div>
              <div>
                <dt className="text-[var(--neutral-text-03)]">HTTPS</dt>
                <dd className="text-[var(--color-title)]">{snapshot.htmlMeta.hasHttps ? '是' : '否'}</dd>
              </div>
            </>
          )}
          {snapshot.robotsTxt && snapshot.robotsTxt.blockedBots.length > 0 && (
            <div className="col-span-2">
              <dt className="text-[var(--neutral-text-03)]">robots 拦截</dt>
              <dd className="text-amber-700">{snapshot.robotsTxt.blockedBots.join('、')}</dd>
            </div>
          )}
          {snapshot.partial && (
            <div className="col-span-2 text-amber-700">部分抓取失败，技术分数可能不完整</div>
          )}
        </dl>
      )}

      {rulePreview && (
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] px-2 py-1 rounded-md bg-[var(--neutral-bg-02)]">
            规则总分 <strong>{rulePreview.totalScore}</strong>
          </span>
          {Object.entries(rulePreview.scores).slice(0, 4).map(([k, v]) => (
            <span key={k} className="text-[10px] px-2 py-1 rounded-md bg-[var(--neutral-bg-02)]">
              {k} <strong>{v}</strong>
            </span>
          ))}
        </div>
      )}

      {displayFindings.length > 0 && (
        <ul className="space-y-2">
          {displayFindings.slice(0, compact ? 3 : 8).map((f) => (
            <li
              key={f.id}
              className="text-[10px] border rounded-md p-2"
              style={{ borderColor: 'var(--neutral-divider-02)' }}
            >
              <div className="font-medium text-[var(--color-title)]">{f.title}</div>
              {(f as GeoAuditFinding & { evidence?: string }).evidence && (
                <div className="text-[var(--neutral-text-03)] mt-1 font-mono break-all">
                  {(f as GeoAuditFinding & { evidence?: string }).evidence}
                </div>
              )}
              {f.suggestion && (
                <div className="text-[var(--neutral-text-02)] mt-1">{f.suggestion}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

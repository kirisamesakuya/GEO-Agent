import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowUpRight, BarChart3, PieChart as PieChartIcon, Radar } from 'lucide-react';
import type { ViewType } from '../../types';
import { COCKPIT_CHART_COLORS } from './WorkbenchDashboard';

export interface WorkbenchGeoMonitorData {
  metrics: {
    indexedKeywords: number;
    platformHitRate: number;
    brandMentionRate: number;
    freeSourcePublished: number;
    paidSourcePublished: number;
  };
  platformShare: Array<{ platform: string; count: number }>;
  indexByKeyword: Array<{ keyword: string; hits: number }>;
  geoInsight?: {
    latestReportId: string | null;
    analyzedAt: string | null;
    mentionRate: number;
  };
}

interface Props {
  data: WorkbenchGeoMonitorData;
  onNavigate: (view: ViewType, hint?: string) => void;
}

function formatAnalyzedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function GeoMetricCard({
  label,
  value,
  suffix,
  sub,
  tone,
  onClick,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  sub?: string;
  tone?: 'success' | 'accent' | 'neutral';
  onClick?: () => void;
}) {
  const valueClass =
    tone === 'success'
      ? 'text-emerald-600'
      : tone === 'accent'
        ? 'text-[var(--color-accent)]'
        : 'text-[var(--color-title)]';

  const inner = (
    <>
      <span className="geo-workbench-kpi-label">{label}</span>
      <span className={`geo-workbench-kpi-value ${valueClass}`}>
        {value}
        {suffix && <span className="text-sm font-semibold ml-0.5">{suffix}</span>}
      </span>
      {sub && <p className="geo-workbench-kpi-sub">{sub}</p>}
      {onClick && <ArrowUpRight className="w-3.5 h-3.5 geo-cockpit-kpi-arrow" />}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="geo-cockpit-kpi-cell text-left" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className="geo-cockpit-kpi-cell">{inner}</div>;
}

function MiniRing({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16 shrink-0">
        <svg className="w-16 h-16" viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--neutral-bg-02)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-[var(--color-title)]">{value}%</span>
        </div>
      </div>
      <p className="text-[11px] text-[var(--neutral-text-03)] leading-snug">{label}</p>
    </div>
  );
}

export default function WorkbenchGeoMonitorSection({ data, onNavigate }: Props) {
  const platformTotal = data.platformShare.reduce((s, p) => s + p.count, 0);
  const kwMax = Math.max(1, ...data.indexByKeyword.map((k) => k.hits));
  const geoAnalyzedAt = data.geoInsight?.analyzedAt;

  return (
    <section className="geo-card p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[var(--color-title)]">GEO 监控</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => onNavigate('indexing_rank')}
          >
            收录排名
          </button>
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs"
            onClick={() => onNavigate('geo_analysis')}
          >
            GEO 分析
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-center">
        <div className="geo-cockpit-kpi-grid !grid-cols-2 sm:!grid-cols-3 xl:!grid-cols-5">
          <GeoMetricCard
            label="命中关键词"
            value={data.metrics.indexedKeywords}
            sub="AI 回答中已出现"
            onClick={() => onNavigate('indexing_rank')}
          />
          <GeoMetricCard
            label="平台命中率"
            value={data.metrics.platformHitRate}
            suffix="%"
            tone={data.metrics.platformHitRate >= 50 ? 'success' : 'accent'}
            sub="采样命中占比"
            onClick={() => onNavigate('indexing_rank')}
          />
          <GeoMetricCard
            label="品牌提及率"
            value={data.metrics.brandMentionRate}
            suffix="%"
            tone={data.metrics.brandMentionRate >= 30 ? 'success' : 'neutral'}
            sub={geoAnalyzedAt ? `上次分析 ${formatAnalyzedAt(geoAnalyzedAt)}` : '待 GEO 分析'}
            onClick={() => onNavigate('geo_analysis')}
          />
          <GeoMetricCard
            label="免费信源"
            value={data.metrics.freeSourcePublished}
            sub="Hermes 已发布"
            tone="accent"
            onClick={() => onNavigate('content_delivery', 'article')}
          />
          <GeoMetricCard
            label="付费信源"
            value={data.metrics.paidSourcePublished}
            sub="接单方已交付"
            tone="success"
            onClick={() => onNavigate('content_delivery', 'order_manage')}
          />
        </div>

        <div className="hidden lg:flex gap-6 px-2">
          <MiniRing
            value={data.metrics.platformHitRate}
            label="平台命中率"
            color="var(--color-accent)"
          />
          <MiniRing
            value={data.metrics.brandMentionRate}
            label="品牌提及率"
            color="var(--color-primary)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--neutral-divider-03)' }}>
          <p className="geo-cockpit-panel-title mb-3">
            <PieChartIcon className="w-3.5 h-3.5 inline mr-1" style={{ verticalAlign: -2 }} />
            AI 平台收录分布
          </p>
          {platformTotal === 0 ? (
            <div className="geo-cockpit-empty py-6">
              <Radar className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--neutral-text-04)' }} />
              <p className="geo-cockpit-empty-title">暂无收录分布</p>
              <p className="geo-cockpit-empty-desc">创建收录查询计划后，将按平台展示命中占比</p>
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm mt-3"
                onClick={() => onNavigate('indexing_rank')}
              >
                去收录排名
              </button>
            </div>
          ) : (
            <div className="geo-cockpit-donut-wrap !grid-cols-[120px_1fr]">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={data.platformShare}
                    dataKey="count"
                    nameKey="platform"
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={52}
                    paddingAngle={2}
                  >
                    {data.platformShare.map((_, i) => (
                      <Cell key={i} fill={COCKPIT_CHART_COLORS[i % COCKPIT_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0]?.payload as { platform: string; count: number };
                      return (
                        <div className="geo-cockpit-tooltip">
                          <p className="geo-cockpit-tooltip-row">
                            {p.platform}：<strong>{p.count}</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="geo-cockpit-platform-legend">
                {data.platformShare.map((p, i) => (
                  <li key={p.platform}>
                    <span
                      className="geo-cockpit-platform-dot"
                      style={{ background: COCKPIT_CHART_COLORS[i % COCKPIT_CHART_COLORS.length] }}
                    />
                    <span className="geo-cockpit-platform-name">{p.platform}</span>
                    <span className="geo-cockpit-platform-pct">
                      {Math.round((p.count / platformTotal) * 100)}%
                    </span>
                    <span className="geo-cockpit-platform-count">{p.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--neutral-divider-03)' }}>
          <p className="geo-cockpit-panel-title mb-3">
            <BarChart3 className="w-3.5 h-3.5 inline mr-1" style={{ verticalAlign: -2 }} />
            核心关键词命中
          </p>
          {data.indexByKeyword.length === 0 ? (
            <div className="geo-cockpit-empty py-6">
              <BarChart3 className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--neutral-text-04)' }} />
              <p className="geo-cockpit-empty-title">暂无关键词命中</p>
              <p className="geo-cockpit-empty-desc">命中数据将按关键词聚合展示 Top 排行</p>
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm mt-3"
                onClick={() => onNavigate('indexing_rank')}
              >
                创建收录计划
              </button>
            </div>
          ) : (
            <div className="geo-cockpit-kw-list">
              {data.indexByKeyword.slice(0, 6).map((k, i) => (
                <div key={k.keyword} className="geo-cockpit-kw-row">
                  <span className="geo-cockpit-kw-rank">{i + 1}</span>
                  <div className="geo-cockpit-kw-body">
                    <div className="geo-cockpit-kw-meta">
                      <span className="geo-cockpit-kw-term">{k.keyword}</span>
                      <span className="geo-cockpit-kw-hits">{k.hits}</span>
                    </div>
                    <div className="geo-cockpit-kw-track">
                      <div
                        className="geo-cockpit-kw-fill"
                        style={{ width: `${(k.hits / kwMax) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, BarChart3, PieChart as PieChartIcon, Radar, TrendingUp } from 'lucide-react';
import type { ViewType } from '../../types';
import { formatDayDelta, formatWeekDelta, weekOverWeek } from './kpi-helpers';

export const COCKPIT_CHART_COLORS = [
  '#1d4ed8',
  '#0d9488',
  '#2563eb',
  '#059669',
  '#d97706',
  '#64748b',
];

export interface CockpitData {
  metrics: {
    totalPublished: number;
    todayPublished: number;
    articlesGenerated: number;
    indexedKeywords: number;
    platformHitRate: number;
    brandMentionRate: number;
  };
  platformShare: Array<{ platform: string; count: number }>;
  indexByKeyword: Array<{ keyword: string; hits: number }>;
  publishTrend: Array<{ date: string; count: number }>;
  indexTrend: Array<{ date: string; count: number }>;
  recentIndexResults: Array<{
    id: string;
    keyword: string;
    platform: string;
    hit: boolean;
    citedMerchant: boolean;
    sampledAt: string;
    planId?: string;
  }>;
  samplingNote: string;
  geoInsight?: {
    latestReportId: string | null;
    analyzedAt: string | null;
    mentionRate: number;
  };
}

interface Props {
  data: CockpitData;
  onNavigate: (view: ViewType, hint?: string) => void;
}

function formatAnalyzedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function KpiDelta({ text, tone }: { text: string; tone: 'up' | 'down' | 'muted' }) {
  return <span className={`geo-cockpit-kpi-delta geo-cockpit-kpi-delta--${tone}`}>{text}</span>;
}

function RateRing({ value, label, color, onClick }: { value: number; label: string; color: string; onClick?: () => void }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circ - (pct / 100) * circ;
  const inner = (
    <>
      <svg className="geo-cockpit-ring-svg" viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--neutral-bg-02)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div className="geo-cockpit-ring-center">
        <span className="geo-cockpit-ring-value">{value}%</span>
        <span className="geo-cockpit-ring-label">{label}</span>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="geo-cockpit-ring-btn" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className="geo-cockpit-ring">{inner}</div>;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="geo-cockpit-tooltip">
      <p className="geo-cockpit-tooltip-date">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="geo-cockpit-tooltip-row">
          <span className="geo-cockpit-tooltip-dot" style={{ background: p.color }} />
          {p.name}：<strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  desc,
  actionLabel,
  onAction,
}: {
  icon: typeof Radar;
  title: string;
  desc: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="geo-cockpit-empty">
      <Icon className="w-8 h-8" style={{ color: 'var(--neutral-text-04)' }} />
      <p className="geo-cockpit-empty-title">{title}</p>
      <p className="geo-cockpit-empty-desc">{desc}</p>
      <button type="button" className="geo-btn-primary geo-btn-sm" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

export default function WorkbenchDashboard({ data, onNavigate }: Props) {
  const trendData = data.publishTrend.map((p, i) => ({
    date: p.date.slice(5),
    publish: p.count,
    index: data.indexTrend[i]?.count ?? 0,
  }));

  const trendMax = Math.max(1, ...trendData.flatMap((d) => [d.publish, d.index]));
  const kwMax = Math.max(1, ...data.indexByKeyword.map((k) => k.hits));
  const platformTotal = data.platformShare.reduce((s, p) => s + p.count, 0);

  const hitCount = data.recentIndexResults.filter((r) => r.hit).length;
  const sampleCount = data.recentIndexResults.length;

  const publishWow = weekOverWeek(data.publishTrend);
  const indexWow = weekOverWeek(data.indexTrend);
  const yesterdayPublish =
    data.publishTrend.length >= 2 ? data.publishTrend[data.publishTrend.length - 2]?.count ?? 0 : 0;
  const todayDelta = formatDayDelta(data.metrics.todayPublished, yesterdayPublish);
  const publishWowLabel = formatWeekDelta(publishWow);
  const indexWowLabel = formatWeekDelta(indexWow);

  const volumeMetrics = [
    {
      label: '累计发布',
      value: data.metrics.totalPublished,
      view: 'content_delivery' as ViewType,
      delta: publishWowLabel ? <KpiDelta text={publishWowLabel} tone={publishWow!.delta >= 0 ? 'up' : 'down'} /> : null,
    },
    {
      label: '今日发布',
      value: data.metrics.todayPublished,
      view: 'content_delivery' as ViewType,
      delta: todayDelta ? (
        <KpiDelta
          text={todayDelta}
          tone={
            data.metrics.todayPublished >= yesterdayPublish ? (data.metrics.todayPublished > 0 ? 'up' : 'muted') : 'down'
          }
        />
      ) : null,
    },
    {
      label: '生成文章',
      value: data.metrics.articlesGenerated,
      view: 'content_delivery' as ViewType,
      delta: publishWow ? (
        <KpiDelta text={`近7天产出 ${publishWow.current}`} tone="muted" />
      ) : null,
    },
    {
      label: '命中关键词',
      value: data.metrics.indexedKeywords,
      view: 'indexing_rank' as ViewType,
      delta: indexWowLabel ? <KpiDelta text={indexWowLabel} tone={indexWow!.delta >= 0 ? 'up' : 'down'} /> : null,
    },
  ];

  const geoAnalyzedAt = data.geoInsight?.analyzedAt;

  return (
    <div className="geo-cockpit">
      <div className="geo-cockpit-head">
        <div className="geo-cockpit-head-title">
          <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-accent)' }} aria-hidden />
          <span className="text-sm font-semibold text-[var(--neutral-text-02)]">指标与趋势</span>
        </div>
        <span className="geo-cockpit-note">{data.samplingNote}</span>
      </div>

      {/* KPI 条 + 环形指标 */}
      <div className="geo-cockpit-kpi-panel geo-card">
        <div className="geo-cockpit-kpi-grid">
          {volumeMetrics.map((m) => (
            <button
              key={m.label}
              type="button"
              className="geo-cockpit-kpi-cell"
              onClick={() => onNavigate(m.view)}
            >
              <span className="geo-cockpit-kpi-label">{m.label}</span>
              <span className="geo-cockpit-kpi-value">{m.value}</span>
              {m.delta}
              <ArrowUpRight className="w-3.5 h-3.5 geo-cockpit-kpi-arrow" />
            </button>
          ))}
        </div>
        <div className="geo-cockpit-kpi-rings">
          <div className="geo-cockpit-ring-block">
            <RateRing
              value={data.metrics.platformHitRate}
              label="平台命中率"
              color="var(--color-accent)"
              onClick={() => onNavigate('indexing_rank')}
            />
            <button type="button" className="geo-cockpit-ring-link" onClick={() => onNavigate('indexing_rank')}>
              收录排名
            </button>
          </div>
          <div className="geo-cockpit-ring-block">
            <RateRing
              value={data.metrics.brandMentionRate}
              label="品牌提及率"
              color="var(--color-primary)"
              onClick={() => onNavigate('geo_analysis')}
            />
            <button type="button" className="geo-cockpit-ring-link" onClick={() => onNavigate('geo_analysis')}>
              {geoAnalyzedAt ? `上次分析 ${formatAnalyzedAt(geoAnalyzedAt)}` : '去 GEO 分析'}
            </button>
          </div>
        </div>
      </div>

      {/* 主可视化区：趋势 + 分布 */}
      <div className="geo-cockpit-main">
        <div className="geo-cockpit-panel geo-card geo-cockpit-panel--trend">
          <div className="geo-cockpit-panel-head">
            <div>
              <p className="geo-cockpit-panel-title">发布与收录趋势</p>
              <p className="geo-cockpit-panel-sub">近 30 天 · 内容产出 vs 收录命中</p>
            </div>
            <div className="geo-cockpit-legend">
              <span>
                <i style={{ background: COCKPIT_CHART_COLORS[0] }} /> 发布
              </span>
              <span>
                <i style={{ background: COCKPIT_CHART_COLORS[1] }} /> 收录命中
              </span>
            </div>
          </div>
          <div className="geo-cockpit-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cockpitPublish" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COCKPIT_CHART_COLORS[0]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COCKPIT_CHART_COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cockpitIndex" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COCKPIT_CHART_COLORS[1]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COCKPIT_CHART_COLORS[1]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--neutral-divider-03)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--neutral-text-03)' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, trendMax]}
                  tick={{ fontSize: 10, fill: 'var(--neutral-text-03)' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="publish"
                  name="发布"
                  stroke={COCKPIT_CHART_COLORS[0]}
                  fill="url(#cockpitPublish)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="index"
                  name="收录命中"
                  stroke={COCKPIT_CHART_COLORS[1]}
                  fill="url(#cockpitIndex)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="geo-cockpit-side">
          <div className="geo-cockpit-panel geo-card">
            <div className="geo-cockpit-panel-head">
              <p className="geo-cockpit-panel-title">
                <PieChartIcon className="w-3.5 h-3.5 inline mr-1" style={{ verticalAlign: -2 }} />
                AI 平台收录分布
              </p>
            </div>
            {platformTotal === 0 ? (
              <EmptyPanel
                icon={Radar}
                title="暂无收录分布"
                desc="创建收录查询计划后，将按平台展示命中占比"
                actionLabel="去收录排名"
                onAction={() => onNavigate('indexing_rank')}
              />
            ) : (
              <div className="geo-cockpit-donut-wrap">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={data.platformShare}
                      dataKey="count"
                      nameKey="platform"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={2}
                    >
                      {data.platformShare.map((_, i) => (
                        <Cell key={i} fill={COCKPIT_CHART_COLORS[i % COCKPIT_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
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

          <div className="geo-cockpit-panel geo-card">
            <div className="geo-cockpit-panel-head">
              <p className="geo-cockpit-panel-title">
                <BarChart3 className="w-3.5 h-3.5 inline mr-1" style={{ verticalAlign: -2 }} />
                关键词命中排行
              </p>
            </div>
            {data.indexByKeyword.length === 0 ? (
              <EmptyPanel
                icon={BarChart3}
                title="暂无关键词命中"
                desc="命中数据将按关键词聚合展示 Top 排行"
                actionLabel="创建收录计划"
                onAction={() => onNavigate('indexing_rank')}
              />
            ) : (
              <div className="geo-cockpit-kw-list">
                {data.indexByKeyword.slice(0, 8).map((k, i) => (
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
      </div>

      {/* 采样概览 + 命中明细 */}
      <div className="geo-cockpit-bottom geo-card">
        <div className="geo-cockpit-panel-head geo-cockpit-bottom-head">
          <div>
            <p className="geo-cockpit-panel-title">收录采样命中</p>
            <p className="geo-cockpit-panel-sub">
              最近 {sampleCount} 条采样 · 命中 {hitCount} 条
              {sampleCount > 0 ? `（${Math.round((hitCount / sampleCount) * 100)}%）` : ''}
            </p>
          </div>
          <button type="button" className="geo-btn-secondary geo-btn-sm" onClick={() => onNavigate('indexing_rank')}>
            查看全部计划
          </button>
        </div>

        {data.recentIndexResults.length === 0 ? (
          <EmptyPanel
            icon={Radar}
            title="暂无采样结果"
            desc="在排名监控中创建查询计划并执行采样"
                actionLabel="去收录排名"
            onAction={() => onNavigate('indexing_rank')}
          />
        ) : (
          <div className="geo-cockpit-hit-grid">
            {data.recentIndexResults.slice(0, 12).map((r) => (
              <button
                key={r.id}
                type="button"
                className={`geo-cockpit-hit-card ${r.hit ? 'is-hit' : 'is-miss'}`}
                onClick={() => onNavigate('indexing_rank', r.planId)}
              >
                <div className="geo-cockpit-hit-top">
                  <span className="geo-cockpit-hit-kw">{r.keyword}</span>
                  <span className={`geo-tag text-[10px] ${r.hit ? 'geo-tag-success' : 'geo-tag-muted'}`}>
                    {r.hit ? '命中' : '未命中'}
                  </span>
                </div>
                <p className="geo-cockpit-hit-platform">{r.platform}</p>
                <div className="geo-cockpit-hit-foot">
                  <span>{r.citedMerchant ? '已引用商家' : '未引用商家'}</span>
                  <span>{r.sampledAt.slice(0, 10)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

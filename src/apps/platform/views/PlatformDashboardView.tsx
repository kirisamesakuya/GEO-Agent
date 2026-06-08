import { Bot, CalendarDays, Check, FileText, ShieldAlert, Store, UserRound, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PlatformCard from '../components/PlatformCard';
import PlatformMetricCard from '../components/PlatformMetricCard';
import type { PlatformView } from '../types';

function formatCompactNumber(value: number): string {
  return value.toLocaleString('zh-CN');
}

function formatDelta(delta: number | null | undefined): string | undefined {
  if (delta == null) return undefined;
  const sign = delta >= 0 ? '▲' : '▼';
  return `${sign} ${Math.abs(delta)}%`;
}

interface TodoItem {
  id: string;
  label: string;
  priority: string;
  type: string;
  count: number;
}

interface CockpitKpi {
  value: number;
  delta: number | null;
}

interface CockpitPipelineNode {
  id: string;
  title: string;
  value: number;
  note: string;
  status: string;
  statusKind: 'normal' | 'warn';
}

interface CockpitData {
  kpis: {
    gmv: CockpitKpi;
    completionRate: CockpitKpi;
    agentSuccessRate: CockpitKpi;
    publishFailed: CockpitKpi;
    riskEvents: CockpitKpi;
  };
  pipeline: CockpitPipelineNode[];
  funnel: Array<{ label: string; value: number; pct: number }>;
  agentHealth: {
    total: number;
    segments: Array<{ label: string; value: number; pct: number; color: string }>;
  };
  riskHeatmap: Array<{ label: string; cells: number[] }>;
  highlights: Array<{ title: string; value: number; view: string; kind: string }>;
  providerRanking: Array<{ name: string; value: number }>;
}

interface Props {
  dashboard: Record<string, unknown> | null;
  onNavigate: (view: PlatformView) => void;
}

const TODO_VIEW_MAP: Record<string, PlatformView> = {
  provider_applications: 'providers',
  agent_tasks: 'agents',
  orders: 'orders',
  deposits: 'publisher_deposits',
  funds: 'provider_withdrawals',
  publisher_accounts: 'publisher_accounts',
  publisher_deposits: 'publisher_deposits',
  provider_accounts: 'provider_accounts',
  provider_settlement: 'provider_settlement',
  provider_withdrawals: 'provider_withdrawals',
  org_certs: 'org_certs',
};

const PIPELINE_ICONS: Record<string, LucideIcon> = {
  merchant: Store,
  agent: Bot,
  fulfillment: UserRound,
  settlement: Wallet,
};

const PIPELINE_COLORS: Record<string, string> = {
  merchant: '#1f6fff',
  agent: '#2f7df6',
  fulfillment: '#4e83f6',
  settlement: '#1f6fff',
};

const HEATMAP_PALETTES = [
  ['#fff1f2', '#fee2e2', '#fecaca', '#fb7185', '#ff4757'],
  ['#fff7ed', '#fed7aa', '#fdba74', '#fb923c', '#fb7185'],
  ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24'],
];

const HIGHLIGHT_COLORS: Record<string, string> = {
  danger: 'var(--platform-danger)',
  warning: 'var(--platform-warning)',
  primary: 'var(--platform-primary)',
};

export default function PlatformDashboardView({ dashboard, onNavigate }: Props) {
  const todos = (dashboard?.todos ?? []) as TodoItem[];
  const cockpit = dashboard?.cockpit as CockpitData | undefined;

  if (!cockpit) {
    const err = typeof dashboard?.error === 'string' ? dashboard.error : null;
    return (
      <div className="platform-dashboard-grid space-y-2">
        <p className="text-sm text-[var(--platform-text-tertiary)]">
          {err ? `驾驶舱加载失败：${err}` : '驾驶舱数据加载中…'}
        </p>
        {err && (
          <p className="text-xs text-[var(--platform-text-tertiary)]">
            请确认已选择平台角色（侧栏底部），或刷新页面后重试。
          </p>
        )}
      </div>
    );
  }

  const { kpis, pipeline, funnel, agentHealth, riskHeatmap, highlights, providerRanking } = cockpit;
  const agentSegments = agentHealth.segments;
  const donutDash = agentSegments.map((s, i) => {
    const offset = agentSegments.slice(0, i).reduce((sum, x) => sum + x.pct, 0);
    return { ...s, offset };
  });

  return (
    <div className="platform-dashboard-grid space-y-3 lg:space-y-4">
      <div className="platform-dashboard-kpis">
        <PlatformMetricCard label="GMV" value={formatCompactNumber(kpis.gmv.value)} delta={formatDelta(kpis.gmv.delta)} icon={Wallet} color="#2563eb" />
        <PlatformMetricCard label="完成率" value={`${kpis.completionRate.value}%`} delta={formatDelta(kpis.completionRate.delta)} icon={Check} color="#34cfa3" />
        <PlatformMetricCard label="Agent 成功率" value={`${kpis.agentSuccessRate.value}%`} delta={formatDelta(kpis.agentSuccessRate.delta)} icon={Bot} color="#2f7df6" />
        <PlatformMetricCard label="发布失败" value={formatCompactNumber(kpis.publishFailed.value)} delta={formatDelta(kpis.publishFailed.delta)} icon={FileText} color="#f79009" danger />
        <PlatformMetricCard label="风险事件" value={formatCompactNumber(kpis.riskEvents.value)} delta={formatDelta(kpis.riskEvents.delta)} icon={ShieldAlert} color="#ff4d5f" danger />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:gap-4 2xl:grid-cols-[1.4fr_1fr]">
        <PlatformCard title="业务运行态势">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {pipeline.map((node) => {
              const Icon = PIPELINE_ICONS[node.id] ?? Store;
              const isWarn = node.statusKind === 'warn';
              return (
                <div
                  key={node.id}
                  className="flex flex-col items-center rounded-lg border border-[var(--platform-border-subtle)] bg-[var(--platform-surface-subtle)] px-2 py-3 text-center sm:px-3 sm:py-4"
                >
                  <div
                    className="grid h-9 w-9 place-items-center rounded-full text-white sm:h-10 sm:w-10"
                    style={{ background: PIPELINE_COLORS[node.id] ?? '#1f6fff' }}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[var(--platform-text-primary)] sm:text-sm">{node.title}</p>
                  <p className="mt-1 text-lg font-bold text-[var(--platform-text-title)] sm:text-xl">{formatCompactNumber(node.value)}</p>
                  <p className="text-[10px] text-[var(--platform-text-tertiary)] sm:text-xs">{node.note}</p>
                  <span className={`mt-2 rounded px-2 py-0.5 text-[10px] font-medium sm:text-xs ${isWarn ? 'bg-[var(--platform-warning-bg)] text-[var(--platform-warning)]' : 'bg-[var(--platform-success-bg)] text-[var(--platform-success)]'}`}>
                    {node.status}
                  </span>
                </div>
              );
            })}
          </div>
        </PlatformCard>

        <PlatformCard title="今日待处理">
          <div className="space-y-2">
            {todos.length === 0 ? (
              <p className="text-sm text-[var(--platform-text-tertiary)]">暂无待处理事项</p>
            ) : (
              todos.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(TODO_VIEW_MAP[item.type] ?? 'dashboard')}
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--platform-border)] px-3 py-2.5 text-left transition-colors hover:border-[var(--platform-border-hover)] hover:bg-[var(--platform-info-bg)] sm:px-4 sm:py-3"
                >
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold sm:px-2 ${item.priority === 'P0' ? 'bg-[var(--platform-danger-bg)] text-[var(--platform-danger)]' : 'bg-[var(--platform-warning-bg)] text-[var(--platform-warning)]'}`}>
                      {item.priority}
                    </span>
                    <span className="truncate text-xs text-[var(--platform-text-primary)] sm:text-sm">{item.label}</span>
                  </div>
                  <span className="ml-2 shrink-0 text-base font-bold text-[var(--platform-primary)] sm:text-lg">{item.count}</span>
                </button>
              ))
            )}
          </div>
        </PlatformCard>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        <PlatformCard
          title="订单流转漏斗"
          action={<span className="rounded-md border border-[var(--platform-border)] px-2 py-1 text-xs text-[var(--platform-text-secondary)]">近 7 天</span>}
        >
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(120px,190px)_1fr] md:gap-4">
            <svg viewBox="0 0 220 180" className="mx-auto h-32 w-full max-w-[190px] md:h-36" aria-hidden>
              {[
                ['30,10 190,10 166,52 54,52', '#2f80ed'],
                ['52,58 168,58 148,96 72,96', '#48a7f5'],
                ['74,102 146,102 130,136 90,136', '#4cc6dd'],
                ['92,142 128,142 118,174 102,174', '#44d3be'],
              ].map(([points, fill]) => <polygon key={points} points={points} fill={fill} opacity="0.95" />)}
            </svg>
            <div className="space-y-2 sm:space-y-3">
              {funnel.map((row) => (
                <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs sm:gap-3 sm:text-sm">
                  <span className="text-[var(--platform-text-secondary)]">{row.label}</span>
                  <span className="font-medium">{formatCompactNumber(row.value)}</span>
                  <span className="w-10 text-right text-[10px] text-[var(--platform-text-tertiary)] sm:text-xs">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </PlatformCard>

        <PlatformCard
          title="Agent 健康度"
          action={<span className="rounded-md border border-[var(--platform-border)] px-2 py-1 text-xs text-[var(--platform-text-secondary)]">近 7 天</span>}
        >
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[auto_1fr] sm:gap-4">
            <div className="relative mx-auto grid h-32 w-32 place-items-center sm:h-36 sm:w-36">
              <svg viewBox="0 0 160 160" className="h-32 w-32 -rotate-90 sm:h-36 sm:w-36" aria-hidden>
                <circle cx="80" cy="80" r="58" fill="none" stroke="#eef2f7" strokeWidth="22" />
                {donutDash.map((s) => (
                  <circle
                    key={s.label}
                    cx="80"
                    cy="80"
                    r="58"
                    fill="none"
                    stroke={s.color}
                    strokeWidth="22"
                    strokeDasharray={`${(s.pct / 100) * 365} 365`}
                    strokeDashoffset={`${-(s.offset / 100) * 365}`}
                    strokeLinecap="round"
                  />
                ))}
              </svg>
              <div className="absolute text-center">
                <p className="text-xl font-bold sm:text-2xl">{formatCompactNumber(agentHealth.total)}</p>
                <p className="text-[10px] text-[var(--platform-text-tertiary)] sm:text-xs">总数</p>
              </div>
            </div>
            <div className="space-y-3">
              {agentSegments.map((seg) => (
                <div key={seg.label} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 text-xs sm:gap-3 sm:text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
                  <span className="text-[var(--platform-text-secondary)]">{seg.label}</span>
                  <span className="font-medium">{formatCompactNumber(seg.value)}</span>
                  <span className="w-12 text-right text-[10px] text-[var(--platform-text-tertiary)] sm:text-xs">{seg.pct}%</span>
                </div>
              ))}
              <button type="button" onClick={() => onNavigate('agents')} className="text-xs font-medium text-[var(--platform-primary)]">查看详情 〉</button>
            </div>
          </div>
        </PlatformCard>

        <PlatformCard
          title="风险热力图"
          action={<span className="rounded-md border border-[var(--platform-border)] px-2 py-1 text-xs text-[var(--platform-text-secondary)]">近 7 天</span>}
          className="xl:col-span-2 2xl:col-span-1"
        >
          <div className="space-y-2 sm:space-y-3">
            {riskHeatmap.map((row, rowIndex) => (
              <div key={row.label} className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] gap-1 text-[10px] text-[var(--platform-text-tertiary)] sm:grid-cols-[44px_repeat(7,1fr)] sm:gap-1.5 sm:text-xs">
                <span className="pt-1.5 sm:pt-2">{row.label}</span>
                {row.cells.map((intensity, i) => (
                  <span
                    key={`${row.label}-${i}`}
                    className="h-6 rounded-sm sm:h-8"
                    style={{ background: HEATMAP_PALETTES[rowIndex]?.[intensity] ?? HEATMAP_PALETTES[rowIndex]?.[0] }}
                  />
                ))}
              </div>
            ))}
          </div>
        </PlatformCard>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:gap-4 2xl:grid-cols-[1.05fr_1fr]">
        <PlatformCard title="今日重点">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.kind === 'danger' ? ShieldAlert : item.kind === 'warning' ? FileText : CalendarDays;
              const color = HIGHLIGHT_COLORS[item.kind] ?? HIGHLIGHT_COLORS.primary;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => onNavigate(item.view as PlatformView)}
                  className="flex min-h-[88px] items-center justify-between rounded-lg border border-[var(--platform-border)] bg-white px-3 py-3 text-left transition-colors hover:border-[var(--platform-border-hover)] hover:bg-[var(--platform-info-bg)] sm:min-h-[96px] sm:px-4 lg:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--platform-surface-subtle)] sm:h-11 sm:w-11" style={{ color }}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-[var(--platform-text-primary)] sm:text-sm">{item.title}</p>
                      <p className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl" style={{ color }}>{item.value}</p>
                    </div>
                  </div>
                  <span className="ml-2 shrink-0 text-lg text-[var(--platform-text-tertiary)]">›</span>
                </button>
              );
            })}
          </div>
        </PlatformCard>

        <PlatformCard
          title="接单方履约排行"
          action={<span className="rounded-md border border-[var(--platform-border)] px-2 py-1 text-xs text-[var(--platform-text-secondary)]">近 7 天</span>}
        >
          <div className="space-y-2 sm:space-y-3">
            {providerRanking.length === 0 ? (
              <p className="text-sm text-[var(--platform-text-tertiary)]">暂无接单方履约数据</p>
            ) : (
              providerRanking.map((item, index) => {
                const max = providerRanking[0]?.value || 1;
                return (
                  <div key={item.name} className="grid grid-cols-[20px_minmax(0,1fr)_1fr_auto] items-center gap-2 text-xs sm:grid-cols-[24px_82px_1fr_52px] sm:text-sm">
                    <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold sm:text-xs ${index < 3 ? 'bg-[#f59e0b] text-white' : 'bg-transparent text-[var(--platform-text-secondary)]'}`}>{index + 1}</span>
                    <span className="truncate">{item.name}</span>
                    <span className="h-2.5 overflow-hidden rounded-sm bg-[var(--platform-border-subtle)] sm:h-3">
                      <span className="block h-full rounded-sm bg-[var(--platform-info)]" style={{ width: `${Math.max(12, (item.value / max) * 100)}%` }} />
                    </span>
                    <span className="text-right">{formatCompactNumber(item.value)}</span>
                  </div>
                );
              })
            )}
          </div>
        </PlatformCard>
      </div>
    </div>
  );
}

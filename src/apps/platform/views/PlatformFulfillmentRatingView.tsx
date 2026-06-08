import { platformApiFetch } from '../../../lib/platform-api';
/** 履约评级中心（本期前端隐藏，见 platform-feature-flags.ts） */
import { useEffect, useState } from 'react';
import PlatformCard from '../components/PlatformCard';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';

interface RatingRow {
  id: string;
  name: string;
  type: string;
  totalOrders: number;
  completedOrders: number;
  completionRate: number;
  revisions: number;
  overdue: number;
  score: number;
}

function scoreKind(score: number) {
  if (score >= 90) return 'success' as const;
  if (score >= 80) return 'pending' as const;
  if (score >= 70) return 'warning' as const;
  return 'danger' as const;
}

export default function PlatformFulfillmentRatingView() {
  const [stats, setStats] = useState({ avgScore: 0, lowScore: 0, overdueTotal: 0, revisionTotal: 0 });
  const [distribution, setDistribution] = useState<Array<{ range: string; count: number }>>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [selected, setSelected] = useState<RatingRow | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [providerName, setProviderName] = useState('');

  useEffect(() => {
    const q = new URLSearchParams();
    if (providerName) q.set('providerName', providerName);
    platformApiFetch(`/api/platform/fulfillment-ratings?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? { avgScore: 0, lowScore: 0, overdueTotal: 0, revisionTotal: 0 });
        setDistribution(d.distribution ?? []);
        setRatings(d.ratings ?? []);
      });
  }, [providerName]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    platformApiFetch(`/api/platform/fulfillment-ratings/${selected.id}`)
      .then((r) => r.json())
      .then(setDetail);
  }, [selected]);

  const orders = (detail?.orders ?? []) as Array<Record<string, unknown>>;
  const maxDist = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformStatSummary
          items={[
            { label: '平均评分', value: stats.avgScore },
            { label: '低评分接单方', value: stats.lowScore },
            { label: '逾期订单', value: stats.overdueTotal },
            { label: '返修次数', value: stats.revisionTotal },
          ]}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PlatformCard title="履约评分分布">
            <div className="space-y-3">
              {distribution.map((d) => (
                <div key={d.range} className="grid grid-cols-[56px_1fr_32px] items-center gap-2 text-sm">
                  <span className="text-[var(--platform-text-secondary)]">{d.range}</span>
                  <span className="h-3 overflow-hidden rounded-sm bg-[var(--platform-border-subtle)]">
                    <span className="block h-full rounded-sm bg-[var(--platform-primary)]" style={{ width: `${(d.count / maxDist) * 100}%` }} />
                  </span>
                  <span className="text-right">{d.count}</span>
                </div>
              ))}
            </div>
          </PlatformCard>
          <PlatformCard title="逾期/返修趋势">
            <div className="flex h-28 items-end gap-2">
              {[stats.revisionTotal, stats.overdueTotal, Math.max(stats.lowScore, 1), stats.avgScore % 10].map((v, i) => (
                <span key={i} className="flex-1 rounded-t bg-[var(--platform-warning)] opacity-70" style={{ height: `${Math.min(100, v * 8 + 20)}%` }} />
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--platform-text-tertiary)]">近周期返修与逾期概览</p>
          </PlatformCard>
        </div>
        <PlatformFilterBar onReset={() => setProviderName('')}>
          <PlatformFilterField label="接单方">
            <input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="接单方名称" className="platform-filter-input" />
          </PlatformFilterField>
        </PlatformFilterBar>
        <PlatformDataTable<RatingRow>
          rows={ratings}
          rowKey={(r) => r.id}
          onRowClick={setSelected}
          columns={[
            { key: 'name', header: '名称', render: (r) => r.name },
            { key: 'rate', header: '完成率', render: (r) => `${r.completionRate}%` },
            { key: 'overdue', header: '逾期', render: (r) => r.overdue },
            { key: 'revision', header: '返修', render: (r) => r.revisions },
            { key: 'score', header: '评分', render: (r) => <PlatformStatusTag label={String(r.score)} kind={scoreKind(r.score)} /> },
          ]}
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
              <PlatformTableAction label="限流" variant="danger" onClick={() => setSelected(r)} />
              <PlatformTableAction label="优先派单" variant="primary" onClick={() => setSelected(r)} />
            </PlatformTableActions>
          )}
        />
      </div>
      {selected && (
        <PlatformDetailDrawer
          title={selected.name}
          statusLabel={`评分 ${selected.score}`}
          statusKind={scoreKind(selected.score)}
          onClose={() => setSelected(null)}
          footer={
            <div className="flex gap-2">
              <button type="button" className="geo-btn-secondary text-sm flex-1">限流</button>
              <button type="button" className="geo-btn-primary text-sm flex-1">优先派单</button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-[var(--platform-text-tertiary)]">{selected.type} · 完成率 {selected.completionRate}%</p>
            <div>
              <h4 className="mb-2 text-xs font-semibold">近期订单</h4>
              {orders.map((o) => (
                <p key={String(o.id)} className="border-b border-[var(--platform-border-subtle)] py-2 text-xs">
                  {String(o.title)} · {String(o.brandName)} · {String(o.status)}
                  {Number(o.revisions) > 0 ? ` · 返修${o.revisions}` : ''}
                </p>
              ))}
            </div>
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import PlatformCard from '../components/PlatformCard';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import type { PlatformStatusKind } from '../types';

interface PlanRow {
  id: string;
  brandName: string;
  name: string;
  keywords: string[];
  platforms: string[];
  status: string;
  resultCount: number;
  hitCount: number;
  anomalyLevel: string;
  rankChange: number;
  queryAt: string;
}

interface AnomalyItem {
  label: string;
  level: string;
  change: number;
}

function anomalyKind(level: string): PlatformStatusKind {
  if (level === '未收录') return 'danger';
  if (level === '品牌词下降' || level === '竞品上升') return 'warning';
  return 'success';
}

export default function PlatformRankingOpsView() {
  const [stats, setStats] = useState({ totalPlans: 0, anomaly: 0, monitoring: 0, brands: 0 });
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [anomalyTop, setAnomalyTop] = useState<AnomalyItem[]>([]);
  const [selected, setSelected] = useState<PlanRow | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [brandName, setBrandName] = useState('');
  const [platform, setPlatform] = useState('');
  const [anomaly, setAnomaly] = useState('');

  useEffect(() => {
    const q = new URLSearchParams();
    if (brandName) q.set('brandName', brandName);
    if (platform) q.set('platform', platform);
    if (anomaly) q.set('anomaly', anomaly);
    fetch(`/api/platform/ranking-ops?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? { totalPlans: 0, anomaly: 0, monitoring: 0, brands: 0 });
        setPlans(d.plans ?? []);
        setAnomalyTop(d.anomalyTop ?? []);
      });
  }, [brandName, platform, anomaly]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    fetch(`/api/platform/ranking-ops/${selected.id}`)
      .then((r) => r.json())
      .then(setDetail);
  }, [selected]);

  const results = (detail?.results ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformStatSummary
          items={[
            { label: '监控计划', value: stats.totalPlans },
            { label: '异常计划', value: stats.anomaly },
            { label: '运行中', value: stats.monitoring },
            { label: '覆盖品牌', value: stats.brands },
          ]}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PlatformCard title="跨品牌可见度概览">
            <p className="text-sm text-[var(--platform-text-secondary)]">
              共 {stats.brands} 个品牌、{stats.totalPlans} 个监控计划，其中 {stats.anomaly} 个存在排名异常。
            </p>
            <div className="mt-4 h-24 rounded-lg bg-[var(--platform-surface-subtle)] px-4 py-3">
              <div className="flex h-full items-end gap-2">
                {[72, 68, 75, 70, 78, 74, 71].map((v, i) => (
                  <span key={i} className="flex-1 rounded-t bg-[var(--platform-info)] opacity-80" style={{ height: `${v}%` }} />
                ))}
              </div>
            </div>
          </PlatformCard>
          <PlatformCard title="异常关键词 Top">
            <div className="space-y-2">
              {anomalyTop.length === 0 ? (
                <p className="text-sm text-[var(--platform-text-tertiary)]">暂无异常</p>
              ) : anomalyTop.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-[var(--platform-border-subtle)] px-3 py-2 text-sm">
                  <span className="truncate">{item.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <PlatformStatusTag label={item.level} kind={anomalyKind(item.level)} />
                    <span className="text-xs text-[var(--platform-danger)]">{item.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </PlatformCard>
        </div>
        <PlatformFilterBar onReset={() => { setBrandName(''); setPlatform(''); setAnomaly(''); }}>
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="品牌" className="platform-filter-input" />
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="platform-filter-input">
            <option value="">全部平台</option>
            <option value="豆包">豆包</option>
            <option value="通义">通义</option>
            <option value="文心">文心</option>
            <option value="Kimi">Kimi</option>
          </select>
          <select value={anomaly} onChange={(e) => setAnomaly(e.target.value)} className="platform-filter-input">
            <option value="">全部异常</option>
            <option value="未收录">未收录</option>
            <option value="品牌词下降">品牌词下降</option>
            <option value="竞品上升">竞品上升</option>
            <option value="正常">正常</option>
          </select>
        </PlatformFilterBar>
        <PlatformDataTable<PlanRow>
          rows={plans}
          rowKey={(r) => r.id}
          onRowClick={setSelected}
          columns={[
            { key: 'brand', header: '品牌', render: (r) => r.brandName },
            { key: 'kw', header: '关键词', render: (r) => r.keywords.join('、') || r.name },
            { key: 'platform', header: '平台', render: (r) => r.platforms.join('、') },
            { key: 'change', header: '排名变化', render: (r) => (r.rankChange < 0 ? r.rankChange : '—') },
            { key: 'anomaly', header: '状态', render: (r) => <PlatformStatusTag label={r.anomalyLevel} kind={anomalyKind(r.anomalyLevel)} /> },
          ]}
        />
      </div>
      {selected && (
        <PlatformDetailDrawer
          title={selected.name}
          statusLabel={selected.anomalyLevel}
          statusKind={anomalyKind(selected.anomalyLevel)}
          onClose={() => setSelected(null)}
          footer={
            <div className="flex gap-2">
              <button type="button" className="geo-btn-secondary text-sm flex-1">加入观察</button>
              <button type="button" className="geo-btn-primary text-sm flex-1">发起订单</button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <p>{selected.brandName} · {selected.platforms.join('、')}</p>
            <p className="text-[var(--platform-text-tertiary)]">关键词：{selected.keywords.join('、') || '—'}</p>
            <div>
              <h4 className="mb-2 text-xs font-semibold">最近采样</h4>
              {results.length === 0 ? (
                <p className="text-xs text-[var(--platform-text-tertiary)]">暂无采样记录</p>
              ) : results.map((r) => (
                <div key={String(r.id)} className="mb-2 rounded-lg border border-[var(--platform-border-subtle)] p-3 text-xs">
                  <p className="font-medium">{String(r.keyword)} · {String(r.platform)}</p>
                  <p className="mt-1 text-[var(--platform-text-secondary)]">
                    {r.hit ? (r.citedMerchant ? '命中品牌' : '命中但未引用品牌') : '未收录'}
                  </p>
                  {r.citationSnippet && (
                    <p className="mt-1 text-[var(--platform-text-tertiary)] line-clamp-3">{String(r.citationSnippet)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

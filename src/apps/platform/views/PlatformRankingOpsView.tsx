import { platformApiFetch } from '../../../lib/platform-api';
import { useEffect, useState } from 'react';
import PlatformCard from '../components/PlatformCard';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import type { PlatformStatusKind } from '../types';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';

interface PlanRow {
  id: string;
  brandName: string;
  name: string;
  keywords: string[];
  platforms: string[];
  status: string;
  resultCount: number;
  sampleCount: number;
  hitCount: number;
  citedHitCount: number;
  hitRate: number | null;
  anomalyLevel: string;
  queryAt: string;
}

interface AnomalyItem {
  label: string;
  level: string;
  hitSummary: string;
}

function anomalyKind(level: string): PlatformStatusKind {
  if (level === '未收录' || level === '无采样') return 'danger';
  if (level === '部分未收录' || level === '未提及品牌') return 'warning';
  return 'success';
}

export default function PlatformRankingOpsView() {
  const [stats, setStats] = useState({
    totalPlans: 0,
    anomaly: 0,
    monitoring: 0,
    brands: 0,
    avgHitRate: null as number | null,
  });
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
    platformApiFetch(`/api/platform/ranking-ops?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(
          d.stats ?? { totalPlans: 0, anomaly: 0, monitoring: 0, brands: 0, avgHitRate: null }
        );
        setPlans(d.plans ?? []);
        setAnomalyTop(d.anomalyTop ?? []);
      });
  }, [brandName, platform, anomaly]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    platformApiFetch(`/api/platform/ranking-ops/${selected.id}`)
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
            { label: '需关注', value: stats.anomaly },
            { label: '运行中', value: stats.monitoring },
            { label: '覆盖品牌', value: stats.brands },
          ]}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PlatformCard title="跨品牌收录概览">
            <p className="text-sm text-[var(--platform-text-secondary)]">
              共 {stats.brands} 个品牌、{stats.totalPlans} 个监控计划。
              {stats.avgHitRate != null
                ? ` 近期采样平均命中率 ${stats.avgHitRate}%。`
                : ' 暂无近期采样数据。'}
            </p>
            <p className="mt-2 text-xs text-[var(--platform-text-tertiary)]">
              说明：当前仅基于 AI 采样判断「是否收录」「是否提及品牌」，不含排名升降趋势。
            </p>
          </PlatformCard>
          <PlatformCard title="需关注关键词">
            <div className="space-y-2">
              {anomalyTop.length === 0 ? (
                <p className="text-sm text-[var(--platform-text-tertiary)]">暂无异常</p>
              ) : (
                anomalyTop.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--platform-border-subtle)] px-3 py-2 text-sm"
                  >
                    <span className="truncate min-w-0">{item.label}</span>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <PlatformStatusTag label={item.level} kind={anomalyKind(item.level)} />
                      <span className="text-[11px] text-[var(--platform-text-tertiary)]">
                        {item.hitSummary}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PlatformCard>
        </div>
        <PlatformFilterBar
          onReset={() => {
            setBrandName('');
            setPlatform('');
            setAnomaly('');
          }}
        >
          <PlatformFilterField label="品牌">
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="品牌名称"
              className="platform-filter-input"
            />
          </PlatformFilterField>
          <PlatformFilterField label="AI 平台">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="platform-filter-input"
            >
              <option value="">全部</option>
              <option value="豆包">豆包</option>
              <option value="DeepSeek">DeepSeek</option>
              <option value="Kimi">Kimi</option>
              <option value="腾讯元宝">腾讯元宝</option>
            </select>
          </PlatformFilterField>
          <PlatformFilterField label="收录状态">
            <select
              value={anomaly}
              onChange={(e) => setAnomaly(e.target.value)}
              className="platform-filter-input"
            >
              <option value="">全部</option>
              <option value="无采样">无采样</option>
              <option value="未收录">未收录</option>
              <option value="部分未收录">部分未收录</option>
              <option value="未提及品牌">未提及品牌</option>
              <option value="收录正常">收录正常</option>
            </select>
          </PlatformFilterField>
        </PlatformFilterBar>
        <PlatformDataTable<PlanRow>
          rows={plans}
          rowKey={(r) => r.id}
          selectedKey={selected?.id}
          onRowClick={setSelected}
          columns={[
            { key: 'brand', header: '品牌', render: (r) => r.brandName },
            { key: 'kw', header: '关键词', render: (r) => r.keywords.join('、') || r.name },
            { key: 'platform', header: '平台', render: (r) => r.platforms.join('、') },
            {
              key: 'hits',
              header: '近期命中',
              render: (r) =>
                r.sampleCount > 0 ? (
                  <span className="text-xs">
                    {r.hitCount}/{r.sampleCount}
                    {r.hitCount > 0 && r.citedHitCount < r.hitCount && (
                      <span className="text-[var(--platform-text-tertiary)]">
                        {' '}
                        · 提及 {r.citedHitCount}/{r.hitCount}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--platform-text-tertiary)]">—</span>
                ),
            },
            {
              key: 'anomaly',
              header: '收录状态',
              render: (r) => (
                <PlatformStatusTag label={r.anomalyLevel} kind={anomalyKind(r.anomalyLevel)} />
              ),
            },
          ]}
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
            </PlatformTableActions>
          )}
        />
      </div>
      {selected && (
        <PlatformDetailDrawer
          title={selected.name}
          statusLabel={selected.anomalyLevel}
          statusKind={anomalyKind(selected.anomalyLevel)}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-3 text-sm">
            <p>
              {selected.brandName} · {selected.platforms.join('、')}
            </p>
            <p className="text-[var(--platform-text-tertiary)]">
              关键词：{selected.keywords.join('、') || '—'}
            </p>
            {selected.sampleCount > 0 && (
              <p className="text-xs text-[var(--platform-text-secondary)]">
                近期采样：命中 {selected.hitCount}/{selected.sampleCount}
                {selected.hitCount > 0 && (
                  <> · 提及品牌 {selected.citedHitCount}/{selected.hitCount}</>
                )}
              </p>
            )}
            <div>
              <h4 className="mb-2 text-xs font-semibold">最近采样</h4>
              {results.length === 0 ? (
                <p className="text-xs text-[var(--platform-text-tertiary)]">暂无采样记录</p>
              ) : (
                results.map((r) => (
                  <div
                    key={String(r.id)}
                    className="mb-2 rounded-lg border border-[var(--platform-border-subtle)] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">
                        {String(r.keyword)} · {String(r.platform)}
                      </p>
                      <PlatformStatusTag
                        label={r.hit ? (r.citedMerchant ? '收录且提及' : '收录未提及') : '未收录'}
                        kind={
                          r.hit ? (r.citedMerchant ? 'success' : 'warning') : 'danger'
                        }
                      />
                    </div>
                    {r.citationSnippet && (
                      <p className="mt-1 text-[var(--platform-text-tertiary)] line-clamp-3">
                        {String(r.citationSnippet)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

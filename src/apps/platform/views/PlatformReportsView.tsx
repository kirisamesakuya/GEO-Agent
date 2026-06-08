import { platformApiFetch } from '../../../lib/platform-api';
import { useEffect, useState } from 'react';
import PlatformCard from '../components/PlatformCard';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import { useToast } from '../../../context/ToastContext';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';

interface ReportRow {
  id: string;
  name: string;
  period: string;
  businessLine: string;
  generatedAt: string;
  status: string;
}

function MiniBarChart({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values, 1);
  return (
    <PlatformCard title={label}>
      <div className="flex h-28 items-end gap-1">
        {values.map((v, i) => (
          <div
            key={`${label}-${i}`}
            className="flex-1 rounded-t bg-[var(--platform-primary)] opacity-80"
            style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
            title={`${v}`}
          />
        ))}
      </div>
    </PlatformCard>
  );
}

export default function PlatformReportsView() {
  const { toast } = useToast();
  const [summary, setSummary] = useState({ brands: 0, orders: 0, completionRate: 0, agentSuccessRate: 0, highRiskMerchants: 0 });
  const [charts, setCharts] = useState({ merchantGrowth: [] as number[], orderFulfillment: [] as number[], agentMetrics: [] as number[] });
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [period, setPeriod] = useState('近30天');
  const [businessLine, setBusinessLine] = useState('全部');
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<ReportRow | null>(null);

  const load = () => {
    const q = new URLSearchParams();
    if (period) q.set('period', period);
    if (businessLine) q.set('businessLine', businessLine);
    platformApiFetch(`/api/platform/reports?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary ?? { brands: 0, orders: 0, completionRate: 0, agentSuccessRate: 0, highRiskMerchants: 0 });
        setCharts(d.charts ?? { merchantGrowth: [], orderFulfillment: [], agentMetrics: [] });
        setReports(d.reports ?? []);
      });
  };

  useEffect(() => {
    load();
  }, [period, businessLine]);

  const generateReport = () => {
    setGenerating(true);
    setTimeout(() => {
      const row: ReportRow = {
        id: `rpt-${Date.now()}`,
        name: `${businessLine === '全部' ? '综合' : businessLine}运营报表`,
        period,
        businessLine: businessLine === '全部' ? '综合' : businessLine,
        generatedAt: new Date().toISOString(),
        status: 'ready',
      };
      setReports((prev) => [row, ...prev]);
      setGenerating(false);
      toast('报表已生成', 'success');
    }, 600);
  };

  return (
    <div className="flex min-h-0 flex-1">
    <div className="flex-1 space-y-4">
      <PlatformFilterBar onReset={() => { setPeriod('近30天'); setBusinessLine('全部'); }}>
        <PlatformFilterField label="统计周期">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="platform-filter-input">
            <option value="近7天">近7天</option>
            <option value="近30天">近30天</option>
            <option value="本月">本月</option>
            <option value="上月">上月</option>
          </select>
        </PlatformFilterField>
        <PlatformFilterField label="业务线">
          <select value={businessLine} onChange={(e) => setBusinessLine(e.target.value)} className="platform-filter-input">
            <option value="全部">全部</option>
            <option value="商家运营">商家运营</option>
            <option value="订单履约">订单履约</option>
            <option value="Agent">Agent</option>
          </select>
        </PlatformFilterField>
        <PlatformFilterField label="操作">
          <button type="button" className="geo-btn-primary text-sm h-8 px-4" onClick={generateReport} disabled={generating}>
            {generating ? '生成中…' : '生成报表'}
          </button>
        </PlatformFilterField>
      </PlatformFilterBar>

      <PlatformStatSummary
        items={[
          { label: '商家数', value: summary.brands },
          { label: '订单数', value: summary.orders },
          { label: '履约完成率', value: `${summary.completionRate}%` },
          { label: 'Agent 成功率', value: `${summary.agentSuccessRate}%` },
          { label: '高风险商家', value: summary.highRiskMerchants },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MiniBarChart values={charts.merchantGrowth} label="商家增长" />
        <MiniBarChart values={charts.orderFulfillment} label="订单履约" />
        <MiniBarChart values={charts.agentMetrics} label="Agent 成本与成功率" />
      </div>

      <PlatformDataTable<ReportRow>
        rows={reports}
        rowKey={(r) => r.id}
        selectedKey={selected?.id}
        onRowClick={setSelected}
        columns={[
          { key: 'name', header: '报表名称', render: (r) => r.name },
          { key: 'period', header: '周期', render: (r) => r.period },
          { key: 'line', header: '业务线', render: (r) => r.businessLine },
          {
            key: 'time',
            header: '生成时间',
            render: (r) => new Date(r.generatedAt).toLocaleString('zh-CN'),
          },
          {
            key: 'status',
            header: '状态',
            render: (r) => (
              <PlatformStatusTag
                label={r.status === 'ready' ? '可下载' : '生成中'}
                kind={r.status === 'ready' ? 'success' : 'pending'}
              />
            ),
          },
        ]}
        renderActions={(r) => (
          <PlatformTableActions>
            <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
            {r.status === 'ready' && (
              <>
                <PlatformTableAction label="下载" variant="primary" onClick={() => toast(`已下载：${r.name}`, 'success')} />
                <PlatformTableAction label="发送" onClick={() => toast(`已发送：${r.name}`, 'info')} />
              </>
            )}
          </PlatformTableActions>
        )}
      />
    </div>

    {selected && (
      <PlatformDetailDrawer
        title={selected.name}
        statusLabel={selected.status === 'ready' ? '可下载' : '生成中'}
        statusKind={selected.status === 'ready' ? 'success' : 'pending'}
        onClose={() => setSelected(null)}
        footer={selected.status === 'ready' ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="geo-btn-primary text-sm flex-1"
              onClick={() => toast(`已下载：${selected.name}`, 'success')}
            >
              下载报表
            </button>
            <button
              type="button"
              className="geo-btn-secondary text-sm flex-1"
              onClick={() => toast(`已发送：${selected.name}`, 'info')}
            >
              发送邮件
            </button>
          </div>
        ) : undefined}
      >
        <div className="space-y-3 text-sm">
          <p><span className="text-[var(--platform-text-tertiary)]">统计周期：</span>{selected.period}</p>
          <p><span className="text-[var(--platform-text-tertiary)]">业务线：</span>{selected.businessLine}</p>
          <p><span className="text-[var(--platform-text-tertiary)]">生成时间：</span>{new Date(selected.generatedAt).toLocaleString('zh-CN')}</p>
          <div className="rounded-lg border border-[var(--platform-border-subtle)] bg-[var(--platform-surface-subtle)] p-3 text-xs text-[var(--platform-text-secondary)]">
            报表包含当前筛选条件下的商家增长、订单履约与 Agent 指标摘要，可用于评审演示。
          </div>
        </div>
      </PlatformDetailDrawer>
    )}
    </div>
  );
}

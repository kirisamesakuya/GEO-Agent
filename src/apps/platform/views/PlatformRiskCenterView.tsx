import { platformApiFetch } from '../../../lib/platform-api';
import { useEffect, useState } from 'react';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField, { PlatformFilterDateRange } from '../components/PlatformFilterField';
import { matchesDateRange } from '../lib/platform-filter-utils';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import type { PlatformStatusKind, PlatformView } from '../types';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';

interface TicketRow {
  id: string;
  source: string;
  objectLabel: string;
  level: string;
  status: string;
  sla: string;
  detail?: string;
  updatedAt: string;
  refType: string;
  refId: string;
}

function levelKind(level: string): PlatformStatusKind {
  if (level === 'P0') return 'danger';
  if (level === 'P1') return 'warning';
  return 'muted';
}

interface Props {
  onNavigate?: (view: PlatformView) => void;
}

export default function PlatformRiskCenterView({ onNavigate }: Props) {
  const [stats, setStats] = useState({ highRisk: 0, overdue: 0, disputed: 0, manual: 0 });
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [dateSince, setDateSince] = useState('');
  const [dateUntil, setDateUntil] = useState('');

  useEffect(() => {
    const q = new URLSearchParams();
    if (level) q.set('level', level);
    if (status) q.set('status', status);
    if (type) q.set('type', type);
    platformApiFetch(`/api/platform/risk-tickets?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? { highRisk: 0, overdue: 0, disputed: 0, manual: 0 });
        setTickets(d.tickets ?? []);
      });
  }, [level, status, type]);

  const visibleTickets = tickets.filter((t) => matchesDateRange(t.updatedAt, dateSince, dateUntil));

  const openRef = (ticket: TicketRow) => {
    if (!onNavigate) return;
    if (ticket.refType === 'order') onNavigate('orders');
    else if (ticket.refType === 'agent') onNavigate('agents');
    else if (ticket.refType === 'deposit') onNavigate('publisher_deposits');
    else if (ticket.refType === 'funds') onNavigate('provider_withdrawals');
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformStatSummary
          items={[
            { label: '高风险', value: stats.highRisk },
            { label: '超时', value: stats.overdue },
            { label: '争议中', value: stats.disputed },
            { label: '待人工', value: stats.manual },
          ]}
        />
        <PlatformFilterBar onReset={() => { setLevel(''); setStatus(''); setType(''); setDateSince(''); setDateUntil(''); }}>
          <PlatformFilterField label="来源类型">
            <select value={type} onChange={(e) => setType(e.target.value)} className="platform-filter-input">
              <option value="">全部</option>
              <option value="订单">订单</option>
              <option value="Agent">Agent</option>
              <option value="资金">资金</option>
              <option value="充值">充值</option>
            </select>
          </PlatformFilterField>
          <PlatformFilterField label="风险等级">
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="platform-filter-input">
              <option value="">全部</option>
              <option value="P0">P0</option>
              <option value="P1">P1</option>
            </select>
          </PlatformFilterField>
          <PlatformFilterField label="处理状态">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="platform-filter-input">
              <option value="">全部</option>
              <option value="争议中">争议中</option>
              <option value="待处理">待处理</option>
              <option value="失败">失败</option>
              <option value="待审">待审</option>
            </select>
          </PlatformFilterField>
          <PlatformFilterDateRange since={dateSince} until={dateUntil} onSinceChange={setDateSince} onUntilChange={setDateUntil} />
        </PlatformFilterBar>
        <PlatformDataTable<TicketRow>
          rows={visibleTickets}
          rowKey={(r) => r.id}
          selectedKey={selected?.id}
          onRowClick={setSelected}
          columns={[
            { key: 'source', header: '来源', render: (r) => r.source },
            { key: 'object', header: '对象', render: (r) => <span className="max-w-[180px] truncate block">{r.objectLabel}</span> },
            { key: 'level', header: '等级', render: (r) => <PlatformStatusTag label={r.level} kind={levelKind(r.level)} /> },
            { key: 'status', header: '状态', render: (r) => <PlatformStatusTag label={r.status} kind={r.status === '争议中' ? 'danger' : 'pending'} /> },
            { key: 'sla', header: 'SLA', render: (r) => r.sla },
          ]}
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
              <PlatformTableAction label="打开关联" onClick={() => { setSelected(r); openRef(r); }} />
              <PlatformTableAction label="分派" variant="primary" onClick={() => setSelected(r)} />
            </PlatformTableActions>
          )}
        />
      </div>
      {selected && (
        <PlatformDetailDrawer
          title={selected.objectLabel}
          statusLabel={selected.status}
          statusKind={selected.level === 'P0' ? 'danger' : 'warning'}
          onClose={() => setSelected(null)}
          footer={
            <div className="flex gap-2">
              <button type="button" className="geo-btn-secondary text-sm flex-1" onClick={() => openRef(selected)}>打开关联对象</button>
              <button type="button" className="geo-btn-primary text-sm flex-1">分派处理人</button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <p><span className="text-[var(--platform-text-tertiary)]">来源：</span>{selected.source}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">详情：</span>{selected.detail ?? '—'}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">更新时间：</span>{new Date(selected.updatedAt).toLocaleString('zh-CN')}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">SLA：</span>{selected.sla}</p>
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

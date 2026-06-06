import { useEffect, useState } from 'react';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import type { PlatformStatusKind, PlatformView } from '../types';

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

  useEffect(() => {
    const q = new URLSearchParams();
    if (level) q.set('level', level);
    if (status) q.set('status', status);
    if (type) q.set('type', type);
    fetch(`/api/platform/risk-tickets?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? { highRisk: 0, overdue: 0, disputed: 0, manual: 0 });
        setTickets(d.tickets ?? []);
      });
  }, [level, status, type]);

  const openRef = (ticket: TicketRow) => {
    if (!onNavigate) return;
    if (ticket.refType === 'order') onNavigate('orders');
    else if (ticket.refType === 'agent') onNavigate('agents');
    else if (ticket.refType === 'funds' || ticket.refType === 'deposit') onNavigate('funds');
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
        <PlatformFilterBar onReset={() => { setLevel(''); setStatus(''); setType(''); }}>
          <select value={type} onChange={(e) => setType(e.target.value)} className="platform-filter-input">
            <option value="">全部来源</option>
            <option value="订单">订单</option>
            <option value="Agent">Agent</option>
            <option value="资金">资金</option>
            <option value="充值">充值</option>
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="platform-filter-input">
            <option value="">全部等级</option>
            <option value="P0">P0</option>
            <option value="P1">P1</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="platform-filter-input">
            <option value="">全部状态</option>
            <option value="争议中">争议中</option>
            <option value="待处理">待处理</option>
            <option value="失败">失败</option>
            <option value="待审">待审</option>
          </select>
        </PlatformFilterBar>
        <PlatformDataTable<TicketRow>
          rows={tickets}
          rowKey={(r) => r.id}
          onRowClick={setSelected}
          columns={[
            { key: 'source', header: '来源', render: (r) => r.source },
            { key: 'object', header: '对象', render: (r) => <span className="max-w-[180px] truncate block">{r.objectLabel}</span> },
            { key: 'level', header: '等级', render: (r) => <PlatformStatusTag label={r.level} kind={levelKind(r.level)} /> },
            { key: 'status', header: '状态', render: (r) => <PlatformStatusTag label={r.status} kind={r.status === '争议中' ? 'danger' : 'pending'} /> },
            { key: 'sla', header: 'SLA', render: (r) => r.sla },
          ]}
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

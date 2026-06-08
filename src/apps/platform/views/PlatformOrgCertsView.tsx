import { useCallback, useEffect, useState } from 'react';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField, { PlatformFilterDateRange } from '../components/PlatformFilterField';
import { includesDigits, includesText, matchesDateRange } from '../lib/platform-filter-utils';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformFetch, platformApiFetch } from '../../../lib/platform-api';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';
import type { PlatformStatusKind } from '../types';

interface OrgRow {
  id: string;
  name: string;
  legalName?: string | null;
  uscc?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  certStatus: string;
  certSubmittedAt?: string | null;
}

const TABS = [
  { id: 'pending', label: '待审' },
  { id: 'approved', label: '已通过' },
  { id: 'rejected', label: '已驳回' },
];

function statusKind(status: string): PlatformStatusKind {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'pending';
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  uncertified: '未提交',
};

export default function PlatformOrgCertsView() {
  const { toast } = useToast();
  const { role } = usePlatformRole();
  const [tab, setTab] = useState('pending');
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [selected, setSelected] = useState<OrgRow | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [orgName, setOrgName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [dateSince, setDateSince] = useState('');
  const [dateUntil, setDateUntil] = useState('');

  const load = useCallback(() => {
    platformApiFetch(`/api/platform/organization-certifications?status=${tab}`)
      .then((r) => r.json())
      .then((d) => setOrgs(d.organizations ?? []));
  }, [tab]);

  useEffect(() => {
    load();
    setSelected(null);
  }, [load]);

  const filtered = orgs.filter((o) => {
    if (!includesText(o.name, orgName)) return false;
    if (!includesText(o.legalName, legalName)) return false;
    if (!includesText(o.contactName, contactName)) return false;
    if (!includesDigits(o.contactPhone, contactPhone)) return false;
    return matchesDateRange(o.certSubmittedAt, dateSince, dateUntil);
  });

  const review = async (action: 'approve' | 'reject', row?: OrgRow) => {
    const target = row ?? selected;
    if (!target) return;
    if (action === 'reject' && !rejectNote.trim()) {
      toast('驳回请填写原因', 'error');
      setSelected(target);
      return;
    }
    const res = await platformFetch(role, `/api/platform/organization-certifications/${target.id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, note: rejectNote, role }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast(action === 'approve' ? '组织已认证' : '已驳回认证', 'success');
    setRejectNote('');
    setSelected(null);
    load();
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformStatSummary
          items={[
            { label: '待审核', value: tab === 'pending' ? filtered.length : '—' },
            { label: '当前列表', value: filtered.length },
            { label: '筛选状态', value: STATUS_LABELS[tab] ?? tab },
          ]}
        />
        <PlatformTabBar tabs={TABS} active={tab} onChange={setTab} />
        <PlatformFilterBar onReset={() => { setOrgName(''); setLegalName(''); setContactName(''); setContactPhone(''); setDateSince(''); setDateUntil(''); }}>
          <PlatformFilterField label="组织名称">
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="组织名称" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="主体名称">
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="营业执照主体" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="联系人">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="联系人姓名" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="联系人手机">
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11 位手机号" inputMode="tel" maxLength={11} className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterDateRange since={dateSince} until={dateUntil} onSinceChange={setDateSince} onUntilChange={setDateUntil} />
        </PlatformFilterBar>
        <PlatformDataTable<OrgRow>
          rows={filtered}
          rowKey={(r) => r.id}
          selectedKey={selected?.id}
          onRowClick={setSelected}
          emptyText="暂无组织认证记录"
          columns={[
            { key: 'name', header: '组织', render: (r) => <span className="font-medium">{r.legalName ?? r.name}</span> },
            { key: 'contactName', header: '联系人', render: (r) => r.contactName ?? '—' },
            { key: 'contactPhone', header: '联系电话', render: (r) => r.contactPhone ?? '—' },
            {
              key: 'time',
              header: '提交时间',
              render: (r) => (r.certSubmittedAt ? new Date(r.certSubmittedAt).toLocaleString('zh-CN') : '—'),
            },
            {
              key: 'status',
              header: '状态',
              render: (r) => (
                <PlatformStatusTag label={STATUS_LABELS[r.certStatus] ?? r.certStatus} kind={statusKind(r.certStatus)} />
              ),
            },
          ]}
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
              {tab === 'pending' && (
                <>
                  <PlatformTableAction label="通过" variant="primary" onClick={() => void review('approve', r)} />
                  <PlatformTableAction label="驳回" variant="danger" onClick={() => setSelected(r)} />
                </>
              )}
            </PlatformTableActions>
          )}
        />
      </div>

      {selected && (
        <PlatformDetailDrawer
          title={selected.legalName ?? selected.name}
          statusLabel={STATUS_LABELS[selected.certStatus] ?? selected.certStatus}
          statusKind={statusKind(selected.certStatus)}
          onClose={() => setSelected(null)}
          footer={tab === 'pending' ? (
            <div className="space-y-2">
              <input
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="驳回原因（驳回时必填）"
                className="platform-filter-input w-full"
              />
              <div className="flex gap-2">
                <button type="button" className="geo-btn-primary geo-btn-xs flex-1" onClick={() => void review('approve')}>
                  通过认证
                </button>
                <button type="button" className="geo-btn-secondary geo-btn-xs flex-1" onClick={() => void review('reject')}>
                  驳回
                </button>
              </div>
            </div>
          ) : undefined}
        >
          <div className="space-y-3 text-sm">
            <p><span className="text-[var(--platform-text-tertiary)]">组织简称：</span>{selected.name}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">联系人：</span>{selected.contactName ?? '—'}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">联系电话：</span>{selected.contactPhone ?? '—'}</p>
            <p><span className="text-[var(--platform-text-tertiary)]">提交时间：</span>
              {selected.certSubmittedAt ? new Date(selected.certSubmittedAt).toLocaleString('zh-CN') : '—'}
            </p>
            <div className="rounded-lg border border-[var(--platform-border-subtle)] bg-[var(--platform-surface-subtle)] p-3 text-xs text-[var(--platform-text-secondary)]">
              认证材料预览（演示环境）：营业执照、法人信息、联系人资料已随申请提交，可在正式环境对接文件存储后预览。
            </div>
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

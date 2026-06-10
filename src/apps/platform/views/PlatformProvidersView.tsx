import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformApiFetch, platformFetch } from '../../../lib/platform-api';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import { includesDigits, includesText } from '../lib/platform-filter-utils';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';
import type { PlatformStatusKind, PlatformView } from '../types';

interface ReviewLog {
  id: string;
  action: string;
  note?: string | null;
  createdAt: string;
}

interface ProviderRow {
  id: string;
  name: string;
  type: string;
  applicationStatus: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  platforms?: string | null;
  industryTags?: string | null;
  serviceTypes?: string | null;
  serviceAreas?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  caseLinks?: string | null;
  capabilities?: string | null;
  reviewNote?: string | null;
  identityRealName?: string | null;
  identityIdNumberMask?: string | null;
  identityVerifiedAt?: string | null;
  payoutAccountName?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewLogs?: ReviewLog[];
  applications?: Array<{ id: string; payload: string; status: string; createdAt: string }>;
  _count?: { orderApplications: number; assets: number };
}

const TABS = [
  { id: '', label: '全部' },
  { id: 'submitted', label: '待审核' },
  { id: 'approved', label: '已通过' },
  { id: 'rejected', label: '已驳回' },
  { id: 'draft', label: '草稿' },
];

const STATUS_LABELS: Record<string, string> = {
  draft: '资料草稿',
  submitted: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

function statusKind(status: string): PlatformStatusKind {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'submitted') return 'pending';
  return 'muted';
}

function parseApplicationPayload(raw?: string): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function PlatformProvidersView({ onNavigate }: { onNavigate?: (view: PlatformView) => void }) {
  const { toast } = useToast();
  const { role } = usePlatformRole();
  const [tab, setTab] = useState('submitted');
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [selected, setSelected] = useState<ProviderRow | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const load = useCallback(() => {
    const q = tab ? `?status=${encodeURIComponent(tab)}` : '';
    platformApiFetch(`/api/platform/providers${q}`)
      .then((r) => r.json())
      .then((d) => setProviders((d.providers ?? []) as ProviderRow[]));
  }, [tab]);

  useEffect(() => {
    load();
    setSelected(null);
    setRejectNote('');
  }, [load]);

  const filtered = useMemo(() => {
    return providers.filter(
      (p) =>
        includesText(p.name, name)
        && includesText(p.contactName, contactName)
        && includesDigits(p.phone, phone)
        && includesText(p.city, city)
    );
  }, [providers, name, contactName, phone, city]);

  const review = async (action: 'approve' | 'reject', row?: ProviderRow) => {
    const target = row ?? selected;
    if (!target) return;
    if (action === 'reject' && !rejectNote.trim()) {
      toast('驳回请填写原因', 'error');
      setSelected(target);
      return;
    }
    setReviewing(true);
    const res = await platformFetch(role, `/api/platform/provider-applications/${target.id}/review`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        note: action === 'reject' ? rejectNote.trim() : rejectNote.trim() || undefined,
      }),
    });
    const data = await res.json();
    setReviewing(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast(action === 'approve' ? '已通过入驻' : '已驳回入驻', 'success');
    setRejectNote('');
    setSelected(null);
    load();
  };

  const appPayload = selected?.applications?.[0]
    ? parseApplicationPayload(selected.applications[0].payload)
    : null;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformStatSummary
          items={[
            { label: '待审核', value: tab === 'submitted' ? filtered.length : '—' },
            { label: '当前列表', value: filtered.length },
            { label: '筛选状态', value: STATUS_LABELS[tab] ?? '全部' },
          ]}
        />
        <PlatformTabBar tabs={TABS} active={tab} onChange={setTab} />
        <PlatformFilterBar onReset={() => { setName(''); setContactName(''); setPhone(''); setCity(''); }}>
          <PlatformFilterField label="主体名称">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="接单方名称" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="联系人">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="联系人姓名" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="手机号">
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11 位手机号" inputMode="tel" maxLength={11} className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="城市">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="所在城市" className="platform-filter-input" />
          </PlatformFilterField>
        </PlatformFilterBar>
        <PlatformDataTable<ProviderRow>
          rows={filtered}
          rowKey={(r) => r.id}
          selectedKey={selected?.id}
          onRowClick={setSelected}
          emptyText="暂无接单方记录"
          columns={[
            { key: 'name', header: '名称', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'type', header: '类型', render: (r) => r.type },
            {
              key: 'contactName',
              header: '联系人',
              render: (r) => r.contactName ?? '—',
            },
            {
              key: 'phone',
              header: '手机号',
              render: (r) => r.phone ?? '—',
            },
            { key: 'city', header: '城市', render: (r) => r.city ?? '—' },
            {
              key: 'apps',
              header: '接单申请',
              render: (r) => String(r._count?.orderApplications ?? 0),
            },
            {
              key: 'status',
              header: '入驻状态',
              render: (r) => (
                <PlatformStatusTag
                  label={STATUS_LABELS[r.applicationStatus] ?? r.applicationStatus}
                  kind={statusKind(r.applicationStatus)}
                />
              ),
            },
            {
              key: 'updated',
              header: '更新时间',
              render: (r) =>
                new Date(r.updatedAt).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
            },
          ]}
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
              {r.applicationStatus === 'submitted' && (
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
          title={selected.name}
          statusLabel={STATUS_LABELS[selected.applicationStatus] ?? selected.applicationStatus}
          statusKind={statusKind(selected.applicationStatus)}
          onClose={() => {
            setSelected(null);
            setRejectNote('');
          }}
          footer={
            selected.applicationStatus === 'submitted' ? (
              <div className="space-y-2">
                <input
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="审核备注（驳回时必填）"
                  className="platform-filter-input w-full"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="geo-btn-primary geo-btn-xs flex-1"
                    disabled={reviewing}
                    onClick={() => void review('approve')}
                  >
                    {reviewing ? '处理中…' : '通过入驻'}
                  </button>
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-xs flex-1"
                    disabled={reviewing}
                    onClick={() => void review('reject')}
                  >
                    驳回
                  </button>
                </div>
              </div>
            ) : undefined
          }
        >
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-[var(--platform-text-tertiary)]">主体类型：</span>
              {selected.type}
            </p>
            <p>
              <span className="text-[var(--platform-text-tertiary)]">联系人：</span>
              {selected.contactName ?? '—'}
            </p>
            <p>
              <span className="text-[var(--platform-text-tertiary)]">手机号：</span>
              {selected.phone ?? '—'}
            </p>
            {selected.email && (
              <p>
                <span className="text-[var(--platform-text-tertiary)]">邮箱：</span>
                {selected.email}
              </p>
            )}
            <p>
              <span className="text-[var(--platform-text-tertiary)]">城市：</span>
              {selected.city ?? '—'}
            </p>
            <div className="rounded-lg border border-[var(--platform-border-subtle)] bg-[var(--platform-surface-subtle)] p-3 text-xs space-y-1">
              <p className="font-semibold text-[var(--platform-text-secondary)]">身份证实名</p>
              {selected.identityVerifiedAt ? (
                <>
                  <p>姓名：{selected.identityRealName ?? '—'}</p>
                  <p>证件号：{selected.identityIdNumberMask ?? '—'}</p>
                  <p>认证时间：{new Date(selected.identityVerifiedAt).toLocaleString('zh-CN')}</p>
                </>
              ) : (
                <p className="text-[var(--platform-text-tertiary)]">尚未完成实名认证</p>
              )}
              {onNavigate && selected.applicationStatus === 'approved' && (
                <button type="button" className="geo-btn-secondary geo-btn-xs mt-2" onClick={() => onNavigate('provider_identity')}>
                  实名认证列表
                </button>
              )}
            </div>
            <p>
              <span className="text-[var(--platform-text-tertiary)]">可接单平台：</span>
              {selected.platforms ?? '—'}
            </p>
            <p>
              <span className="text-[var(--platform-text-tertiary)]">行业标签：</span>
              {selected.industryTags ?? '—'}
            </p>
            <p>
              <span className="text-[var(--platform-text-tertiary)]">服务类型：</span>
              {selected.serviceTypes ?? selected.capabilities ?? '—'}
            </p>
            {(selected.budgetMin != null || selected.budgetMax != null) && (
              <p>
                <span className="text-[var(--platform-text-tertiary)]">预算区间：</span>
                ¥{selected.budgetMin ?? 0} – ¥{selected.budgetMax ?? '不限'}
              </p>
            )}
            {selected.caseLinks && (
              <p>
                <span className="text-[var(--platform-text-tertiary)]">案例链接：</span>
                <span className="break-all text-xs">{selected.caseLinks}</span>
              </p>
            )}
            <p>
              <span className="text-[var(--platform-text-tertiary)]">提交时间：</span>
              {new Date(selected.createdAt).toLocaleString('zh-CN')}
            </p>
            {selected.reviewNote && (
              <div className="rounded-lg border border-[var(--platform-border-subtle)] bg-[var(--platform-surface-subtle)] p-3 text-xs">
                <p className="mb-1 font-semibold text-[var(--platform-text-secondary)]">最近审核备注</p>
                <p>{selected.reviewNote}</p>
              </div>
            )}
            {appPayload && (
              <div className="rounded-lg border border-[var(--platform-border-subtle)] bg-[var(--platform-surface-subtle)] p-3 text-xs text-[var(--platform-text-secondary)]">
                <p className="mb-2 font-semibold">入驻申请材料</p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap">{JSON.stringify(appPayload, null, 2)}</pre>
              </div>
            )}
            {(selected.reviewLogs?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-[var(--platform-border-subtle)] p-3 text-xs">
                <p className="mb-2 font-semibold text-[var(--platform-text-secondary)]">审核记录</p>
                <ul className="space-y-1.5 text-[var(--platform-text-tertiary)]">
                  {selected.reviewLogs!.map((log) => (
                    <li key={log.id}>
                      {log.action === 'approve' ? '通过' : log.action === 'reject' ? '驳回' : log.action}
                      {' · '}
                      {new Date(log.createdAt).toLocaleString('zh-CN')}
                      {log.note ? ` · ${log.note}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

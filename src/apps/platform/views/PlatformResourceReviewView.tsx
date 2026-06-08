/** 可接单平台审核（本期前端隐藏，见 platform-feature-flags.ts） */
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformFetch, platformApiFetch } from '../../../lib/platform-api';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';
import type { PlatformStatusKind } from '../types';

interface ResourceRow {
  id: string;
  providerId: string;
  providerName: string;
  providerType: string;
  platform: string;
  serviceTypes: string;
  status: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  assetCount: number;
  reviewNote?: string;
  reviewedAt?: string;
  declaredAt?: string;
  updatedAt: string;
}

function statusKind(status: string): PlatformStatusKind {
  if (status === '已通过') return 'success';
  if (status === '待审核') return 'pending';
  if (status === '已驳回') return 'danger';
  return 'muted';
}

const TABS = [
  { id: '', label: '全部' },
  { id: '待审核', label: '待审核' },
  { id: '已通过', label: '已通过' },
  { id: '已驳回', label: '已驳回' },
];

export default function PlatformResourceReviewView() {
  const { toast } = useToast();
  const { role } = usePlatformRole();
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [selected, setSelected] = useState<ResourceRow | null>(null);
  const [tab, setTab] = useState('');
  const [platform, setPlatform] = useState('');
  const [providerName, setProviderName] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (tab) q.set('status', tab);
    if (platform) q.set('platform', platform);
    if (providerName) q.set('providerName', providerName);
    platformApiFetch(`/api/platform/provider-resources?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? { pending: 0, approved: 0, rejected: 0 });
        setResources(d.resources ?? []);
      });
  }, [tab, platform, providerName]);

  useEffect(() => {
    load();
  }, [load]);

  const submitReview = async (action: 'approve' | 'reject' | 'reset', row?: ResourceRow) => {
    const target = row ?? selected;
    if (!target) return;
    setSubmitting(true);
    try {
      const res = await platformFetch(role, '/api/platform/provider-resources/review', {
        method: 'POST',
        body: JSON.stringify({
          role,
          providerId: target.providerId,
          platform: target.platform,
          action,
          note: action === 'reset' ? undefined : reviewNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast(data.error, 'error');
        return;
      }
      const msg =
        action === 'approve' ? '已标记为通过' : action === 'reject' ? '已标记为驳回' : '已重置为待审核';
      toast(msg, 'success');
      setSelected(null);
      setReviewNote('');
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface)] px-4 py-3 text-sm text-[var(--platform-text-secondary)]">
          本期仅审核接单方<strong className="font-medium text-[var(--platform-text-primary)]">自行申报的可接单平台</strong>
          ，不核验真实账号、主页链接或粉丝数据。审核通过后可参与对应平台的任务领取。
        </div>

        <PlatformStatSummary
          items={[
            { label: '待审核', value: stats.pending },
            { label: '已通过', value: stats.approved },
            { label: '已驳回', value: stats.rejected },
          ]}
        />

        <PlatformFilterBar onReset={() => { setPlatform(''); setProviderName(''); setTab(''); }}>
          <PlatformFilterField label="接单方">
            <input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="接单方名称" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="可接单平台">
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="platform-filter-input">
              <option value="">全部</option>
              <option value="小红书">小红书</option>
              <option value="知乎">知乎</option>
              <option value="公众号">公众号</option>
              <option value="抖音">抖音</option>
              <option value="网站">网站</option>
            </select>
          </PlatformFilterField>
        </PlatformFilterBar>

        <PlatformTabBar tabs={TABS} active={tab} onChange={setTab} />

        <PlatformDataTable<ResourceRow>
          rows={resources}
          rowKey={(r) => r.id}
          selectedKey={selected?.id}
          onRowClick={(row) => {
            setSelected(row);
            setReviewNote(row.reviewNote ?? '');
          }}
          columns={[
            { key: 'provider', header: '接单方', render: (r) => r.providerName },
            { key: 'type', header: '类型', render: (r) => r.providerType },
            { key: 'platform', header: '可接单平台', render: (r) => r.platform },
            { key: 'service', header: '服务方向', render: (r) => <span className="max-w-[160px] truncate block">{r.serviceTypes}</span> },
            { key: 'status', header: '审核状态', render: (r) => <PlatformStatusTag label={r.status} kind={statusKind(r.status)} /> },
            {
              key: 'updated',
              header: '更新时间',
              render: (r) => (
                <span className="text-xs text-[var(--platform-text-tertiary)]">
                  {new Date(r.updatedAt).toLocaleString('zh-CN')}
                </span>
              ),
            },
          ]}
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => { setSelected(r); setReviewNote(r.reviewNote ?? ''); }} />
              {r.reviewStatus === 'pending' && (
                <>
                  <PlatformTableAction label="通过" variant="primary" onClick={() => void submitReview('approve', r)} />
                  <PlatformTableAction label="驳回" variant="danger" onClick={() => { setSelected(r); setReviewNote(r.reviewNote ?? ''); }} />
                </>
              )}
            </PlatformTableActions>
          )}
        />
      </div>

      {selected && (
        <PlatformDetailDrawer
          title={`${selected.providerName} · ${selected.platform}`}
          statusLabel={selected.status}
          statusKind={statusKind(selected.status)}
          onClose={() => setSelected(null)}
          footer={
            <div className="flex flex-col gap-2 w-full">
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="审核备注（可选，驳回时建议填写原因）"
                className="platform-filter-input w-full min-h-[72px] py-2 text-xs resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitting || selected.reviewStatus === 'approved'}
                  className="geo-btn-primary text-sm flex-1"
                  onClick={() => void submitReview('approve')}
                >
                  标记通过
                </button>
                <button
                  type="button"
                  disabled={submitting || selected.reviewStatus === 'rejected'}
                  className="geo-btn-secondary text-sm flex-1"
                  onClick={() => void submitReview('reject')}
                >
                  标记驳回
                </button>
              </div>
              {selected.reviewStatus !== 'pending' && (
                <button
                  type="button"
                  disabled={submitting}
                  className="geo-btn-secondary text-sm w-full"
                  onClick={() => void submitReview('reset')}
                >
                  重置为待审核
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-[var(--platform-text-tertiary)]">接单方类型：</span>
              {selected.providerType}
            </p>
            <p>
              <span className="text-[var(--platform-text-tertiary)]">申报平台：</span>
              {selected.platform}
            </p>
            <p>
              <span className="text-[var(--platform-text-tertiary)]">服务方向：</span>
              {selected.serviceTypes}
            </p>
            {selected.declaredAt && (
              <p>
                <span className="text-[var(--platform-text-tertiary)]">申报时间：</span>
                {new Date(selected.declaredAt).toLocaleString('zh-CN')}
              </p>
            )}
            {selected.reviewedAt && (
              <p>
                <span className="text-[var(--platform-text-tertiary)]">审核时间：</span>
                {new Date(selected.reviewedAt).toLocaleString('zh-CN')}
              </p>
            )}
            {selected.reviewNote && (
              <p>
                <span className="text-[var(--platform-text-tertiary)]">审核备注：</span>
                {selected.reviewNote}
              </p>
            )}
            <p className="text-xs text-[var(--platform-text-tertiary)] leading-relaxed pt-1 border-t border-[var(--platform-border-subtle)]">
              平台不保存也不审核接单方本机账号凭证。此处仅变更「是否允许接该平台任务」的审核状态。
            </p>
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

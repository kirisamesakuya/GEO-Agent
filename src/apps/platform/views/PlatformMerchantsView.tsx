import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import { includesText } from '../lib/platform-filter-utils';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformFetch, platformApiFetch } from '../../../lib/platform-api';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';
import type { PlatformView } from '../types';

interface MerchantRow {
  id: string;
  name: string;
  website: string;
  industry: string;
  city: string;
  ownerName: string;
  storeCount: number;
  status: string;
  profileComplete: boolean;
  missingFields: string[];
  organizationName: string | null;
  certStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MerchantDetail {
  profile: {
    website: string;
    name: string;
    industry: string;
    city: string;
    ownerName?: string;
    storeCount: number;
    description: string;
    keywords: string[];
    competitors: string[];
    forbiddenWords: string[];
    sourceMaterials?: Array<{ id: string; kind: string; name: string; url: string }>;
  };
  organization: {
    id: string;
    name: string;
    legalName: string | null;
    certStatus: string;
    contactName: string | null;
    contactPhone: string | null;
  } | null;
  profileCompleteness: { complete: boolean; missing: string[] };
  sourceMaterialCount: number;
  customPlatformCount: number;
  activitySummary: { taskCount: number; orderCount: number; websiteOrderCount: number };
  createdAt: string;
  updatedAt: string;
}

const CERT_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  uncertified: '未提交',
};

interface Props {
  onNavigate?: (view: PlatformView) => void;
}

export default function PlatformMerchantsView({ onNavigate }: Props) {
  const { toast } = useToast();
  const { role, can } = usePlatformRole();
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [selected, setSelected] = useState<MerchantRow | null>(null);
  const [detail, setDetail] = useState<MerchantDetail | null>(null);
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [status, setStatus] = useState('');
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = () => {
    platformApiFetch('/api/platform/merchants')
      .then((r) => r.json())
      .then((d) => setMerchants(d.merchants ?? []));
  };

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    platformApiFetch(`/api/platform/merchants/${encodeURIComponent(selected.name)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast(d.error, 'error');
          return;
        }
        setDetail(d as MerchantDetail);
      })
      .finally(() => setDetailLoading(false));
  }, [selected, toast]);

  const industries = useMemo(
    () => [...new Set(merchants.map((m) => m.industry).filter(Boolean))].sort(),
    [merchants]
  );

  const filtered = useMemo(() => {
    return merchants.filter((m) => {
      if (!includesText(m.name, brandName)) return false;
      if (industry && m.industry !== industry) return false;
      if (status && m.status !== status) return false;
      if (incompleteOnly && m.profileComplete) return false;
      return true;
    });
  }, [merchants, brandName, industry, status, incompleteOnly]);

  const stats = useMemo(() => {
    const disabled = merchants.filter((m) => m.status === 'disabled').length;
    return {
      total: merchants.length,
      active: merchants.length - disabled,
      incomplete: merchants.filter((m) => !m.profileComplete).length,
      uncertified: merchants.filter((m) => m.certStatus === 'uncertified' || !m.certStatus).length,
    };
  }, [merchants]);

  const refreshDetail = async (name: string) => {
    const res = await platformApiFetch(`/api/platform/merchants/${encodeURIComponent(name)}`);
    const d = await res.json();
    if (!d.error) setDetail(d as MerchantDetail);
    loadList();
  };

  const toggleStatus = async (next: 'active' | 'disabled') => {
    if (!selected) return;
    if (next === 'disabled' && !statusReason.trim()) {
      toast('请填写禁用原因', 'error');
      return;
    }
    const res = await platformFetch(role, `/api/platform/merchants/${encodeURIComponent(selected.name)}/status`, {
      method: 'POST',
      body: JSON.stringify({
        status: next,
        reason: statusReason || (next === 'active' ? '恢复启用' : ''),
        role,
      }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast(next === 'disabled' ? '已禁用' : '已启用', next === 'disabled' ? 'info' : 'success');
    setStatusReason('');
    void refreshDetail(selected.name);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--platform-text-secondary)]">
        维护发布端品牌主数据（行业、城市、业务描述、关键词等）。资金余额、流水与入账审核请前往侧栏「资金财务」；Agent 与订单请分别前往「Agent 中枢」「订单履约」。
      </p>
      <PlatformStatSummary
        items={[
          { label: '品牌总数', value: stats.total },
          { label: '正常运营', value: stats.active },
          { label: '资料待补全', value: stats.incomplete },
          { label: '未企业认证', value: stats.uncertified },
        ]}
      />
      <PlatformFilterBar onReset={() => { setBrandName(''); setIndustry(''); setStatus(''); setIncompleteOnly(false); }}>
        <PlatformFilterField label="品牌">
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="品牌名称" className="platform-filter-input" />
        </PlatformFilterField>
        <PlatformFilterField label="行业">
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="platform-filter-input">
            <option value="">全部</option>
            {industries.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </PlatformFilterField>
        <PlatformFilterField label="品牌状态">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="platform-filter-input">
            <option value="">全部</option>
            <option value="active">正常</option>
            <option value="disabled">已禁用</option>
          </select>
        </PlatformFilterField>
        <PlatformFilterField label="资料完整度" className="platform-filter-field--checkbox">
          <label className="platform-filter-checkbox-row">
            <input type="checkbox" checked={incompleteOnly} onChange={(e) => setIncompleteOnly(e.target.checked)} />
            <span>仅资料不完整</span>
          </label>
        </PlatformFilterField>
      </PlatformFilterBar>
      <PlatformDataTable<MerchantRow>
        rows={filtered}
        rowKey={(r) => r.id}
        selectedKey={selected?.id}
        onRowClick={setSelected}
        columns={[
          { key: 'name', header: '品牌', render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'industry', header: '行业', render: (r) => r.industry || '—' },
          { key: 'city', header: '城市', render: (r) => r.city || '—' },
          {
            key: 'website',
            header: '官网',
            render: (r) => (
              r.website ? (
                <a href={r.website.startsWith('http') ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer" className="text-[var(--platform-primary)] truncate block max-w-[160px]" onClick={(e) => e.stopPropagation()}>
                  {r.website}
                </a>
              ) : '—'
            ),
          },
          {
            key: 'profile',
            header: '资料',
            render: (r) => (
              <PlatformStatusTag
                label={r.profileComplete ? '完整' : `缺 ${r.missingFields.length} 项`}
                kind={r.profileComplete ? 'success' : 'pending'}
              />
            ),
          },
          {
            key: 'org',
            header: '企业认证',
            render: (r) => (
              r.organizationName ? (
                <PlatformStatusTag
                  label={CERT_LABELS[r.certStatus ?? 'uncertified'] ?? r.certStatus ?? '—'}
                  kind={r.certStatus === 'approved' ? 'success' : r.certStatus === 'rejected' ? 'danger' : 'pending'}
                />
              ) : (
                <span className="text-xs text-[var(--platform-text-tertiary)]">未关联</span>
              )
            ),
          },
          {
            key: 'status',
            header: '状态',
            render: (r) => (
              <PlatformStatusTag
                label={r.status === 'disabled' ? '已禁用' : '正常'}
                kind={r.status === 'disabled' ? 'muted' : 'success'}
              />
            ),
          },
        ]}
        renderActions={(r) => (
          <PlatformTableActions>
            <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
            {r.status === 'active' ? (
              <PlatformTableAction label="停用" variant="danger" disabled={!can('merchant.disable')} onClick={() => setSelected(r)} />
            ) : (
              <PlatformTableAction label="启用" variant="primary" onClick={() => setSelected(r)} />
            )}
          </PlatformTableActions>
        )}
      />

      {selected && (
        <PlatformDetailDrawer
          title={selected.name}
          statusLabel={selected.status === 'disabled' ? '已禁用' : detail?.profileCompleteness.complete ? '资料完整' : '资料待补全'}
          statusKind={selected.status === 'disabled' ? 'muted' : detail?.profileCompleteness.complete ? 'success' : 'pending'}
          onClose={() => { setSelected(null); setStatusReason(''); }}
          footer={!detailLoading ? (
            <div className="space-y-2">
              <input
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="禁用/启用原因"
                className="platform-filter-input w-full"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="geo-btn-secondary geo-btn-xs flex-1"
                  onClick={() => void toggleStatus('disabled')}
                  disabled={!can('merchant.disable')}
                >
                  停用
                </button>
                <button type="button" className="geo-btn-primary geo-btn-xs flex-1" onClick={() => void toggleStatus('active')}>
                  启用
                </button>
              </div>
            </div>
          ) : undefined}
        >
          {detailLoading || !detail ? (
            <p className="text-sm text-[var(--platform-text-tertiary)]">详情加载中…</p>
          ) : (
            <div className="space-y-4 text-sm">
              {!detail.profileCompleteness.complete && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  待补全：{detail.profileCompleteness.missing.join('、')}
                </p>
              )}

              <section className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--platform-text-title)]">基础信息</h4>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div><dt className="text-[var(--platform-text-tertiary)]">行业</dt><dd className="mt-0.5 font-medium">{detail.profile.industry || '—'}</dd></div>
                  <div><dt className="text-[var(--platform-text-tertiary)]">城市</dt><dd className="mt-0.5 font-medium">{detail.profile.city || '—'}</dd></div>
                  <div><dt className="text-[var(--platform-text-tertiary)]">负责人</dt><dd className="mt-0.5 font-medium">{detail.profile.ownerName || '—'}</dd></div>
                  <div><dt className="text-[var(--platform-text-tertiary)]">门店数</dt><dd className="mt-0.5 font-medium">{detail.profile.storeCount}</dd></div>
                  <div className="col-span-2">
                    <dt className="text-[var(--platform-text-tertiary)]">官网</dt>
                    <dd className="mt-0.5 break-all">
                      {detail.profile.website ? (
                        <a href={detail.profile.website.startsWith('http') ? detail.profile.website : `https://${detail.profile.website}`} target="_blank" rel="noreferrer" className="text-[var(--platform-primary)] inline-flex items-center gap-1">
                          {detail.profile.website}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : '—'}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--platform-text-title)]">业务描述</h4>
                <p className="text-xs leading-relaxed text-[var(--platform-text-secondary)] whitespace-pre-wrap">
                  {detail.profile.description || '（未填写）'}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--platform-text-title)]">关键词 / 竞品 / 禁用词</h4>
                <p className="text-xs text-[var(--platform-text-secondary)]">
                  关键词：{detail.profile.keywords.length ? detail.profile.keywords.join('、') : '—'}
                </p>
                <p className="text-xs text-[var(--platform-text-secondary)]">
                  竞品：{detail.profile.competitors.length ? detail.profile.competitors.join('、') : '—'}
                </p>
                <p className="text-xs text-[var(--platform-text-secondary)]">
                  禁用词：{detail.profile.forbiddenWords.length ? detail.profile.forbiddenWords.join('、') : '—'}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--platform-text-title)]">企业与扩展</h4>
                {detail.organization ? (
                  <dl className="text-xs space-y-1 text-[var(--platform-text-secondary)]">
                    <p>关联企业：{detail.organization.name}{detail.organization.legalName ? `（${detail.organization.legalName}）` : ''}</p>
                    <p>认证状态：{CERT_LABELS[detail.organization.certStatus] ?? detail.organization.certStatus}</p>
                    {detail.organization.contactName && <p>联系人：{detail.organization.contactName} {detail.organization.contactPhone ?? ''}</p>}
                  </dl>
                ) : (
                  <p className="text-xs text-[var(--platform-text-tertiary)]">未关联企业主体</p>
                )}
                <p className="text-xs text-[var(--platform-text-secondary)]">
                  参考材料 {detail.sourceMaterialCount} 份 · 自定义发布渠道 {detail.customPlatformCount} 个
                </p>
              </section>

              <section className="rounded-lg border border-[var(--platform-border-subtle)] bg-[var(--platform-surface-subtle)] p-3 space-y-2">
                <h4 className="text-xs font-semibold text-[var(--platform-text-title)]">关联业务（跳转专页）</h4>
                <p className="text-[10px] text-[var(--platform-text-tertiary)]">
                  以下数据不在此页维护，请前往对应菜单查看与操作。
                </p>
                <div className="flex flex-wrap gap-2">
                  {onNavigate && (
                    <>
                      <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => onNavigate('publisher_accounts')}>
                        资金账户
                      </button>
                      <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => onNavigate('agents')}>
                        Agent（{detail.activitySummary.taskCount}）
                      </button>
                      <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => onNavigate('orders')}>
                        订单（{detail.activitySummary.orderCount}）
                      </button>
                      <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => onNavigate('website')}>
                        网站需求（{detail.activitySummary.websiteOrderCount}）
                      </button>
                      <button type="button" className="geo-btn-secondary geo-btn-xs" onClick={() => onNavigate('org_certs')}>
                        企业认证审核
                      </button>
                    </>
                  )}
                </div>
              </section>

              <p className="text-[10px] text-[var(--platform-text-tertiary)] tabular-nums">
                创建于 {new Date(detail.createdAt).toLocaleString('zh-CN')} · 更新于 {new Date(detail.updatedAt).toLocaleString('zh-CN')}
              </p>
            </div>
          )}
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

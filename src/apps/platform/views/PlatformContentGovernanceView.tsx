import { platformApiFetch } from '../../../lib/platform-api';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';
import type { PlatformStatusKind } from '../types';

interface ContentRow {
  id: string;
  title: string;
  brandName: string;
  platform: string;
  status: string;
  risk: string;
  publishedUrl?: string;
  errorCode?: string;
  reviewCategory?: string | null;
  previewText?: string;
  executedAt?: string;
  agentTaskId?: string | null;
  publishJobId?: string | null;
  canRedispatch?: boolean;
  canManualFlag?: boolean;
}

function statusKind(status: string): PlatformStatusKind {
  if (status === 'published' || status === 'succeeded') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending' || status === 'running') return 'pending';
  return 'muted';
}

function canOperate(row: ContentRow): boolean {
  return Boolean(row.canRedispatch || row.canManualFlag || row.status === 'failed');
}

const TABS = [
  { id: 'all', label: '全部' },
  { id: 'library', label: '内容库' },
  { id: 'pending', label: '待发布' },
  { id: 'publishing', label: '发布中' },
  { id: 'failed', label: '发布失败' },
  { id: 'published', label: '已发布' },
  { id: 'risky', label: '风险内容' },
];

export default function PlatformContentGovernanceView() {
  const { toast } = useToast();
  const [tab, setTab] = useState('all');
  const [stats, setStats] = useState({ library: 0, pending: 0, publishing: 0, failed: 0, published: 0, risky: 0 });
  const [items, setItems] = useState<ContentRow[]>([]);
  const [selected, setSelected] = useState<ContentRow | null>(null);
  const [brandName, setBrandName] = useState('');
  const [platform, setPlatform] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (brandName) q.set('brandName', brandName);
    if (platform) q.set('platform', platform);
    if (tab !== 'all' && tab !== 'library' && tab !== 'risky') q.set('tab', tab);
    if (tab === 'risky') q.set('status', 'failed');
    return platformApiFetch(`/api/platform/content-governance?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? { library: 0, pending: 0, publishing: 0, failed: 0, published: 0, risky: 0 });
        let rows = (d.items ?? []) as ContentRow[];
        if (tab === 'risky') rows = rows.filter((r) => r.risk !== '正常');
        setItems(rows);
        setSelected((prev) => (prev ? rows.find((r) => r.id === prev.id) ?? null : null));
      });
  }, [tab, brandName, platform]);

  useEffect(() => {
    void load();
  }, [load]);

  const redispatch = async (row: ContentRow) => {
    if (acting) return;
    setActing(true);
    try {
      const res = await platformApiFetch(`/api/platform/publish-records/${row.id}/redispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: '平台运营重新派发' }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? '重新派发失败', 'error');
        return;
      }
      toast('已重新派发到商家本机 Hermes，非平台代发', 'success');
      await load();
    } catch {
      toast('重新派发失败', 'error');
    } finally {
      setActing(false);
    }
  };

  const flagManual = async (row: ContentRow) => {
    if (acting) return;
    const reason = window.prompt('请填写转人工原因（将通知商家在发布端跟进）');
    if (!reason?.trim()) return;
    setActing(true);
    try {
      const res = await platformApiFetch(`/api/platform/publish-records/${row.id}/manual-flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? '操作失败', 'error');
        return;
      }
      toast('已标记为需人工处理，已通知商家', 'success');
      await load();
    } catch {
      toast('操作失败', 'error');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <p className="text-xs text-[var(--platform-text-tertiary)] leading-relaxed">
          内容与发布监管用于查看发布记录、失败原因与风险标记。平台不代商家直接发布，异常时可重新派发到商家本机 Hermes 或标记人工跟进。
        </p>
        <PlatformStatSummary
          items={[
            { label: '内容库', value: stats.library },
            { label: '待发布', value: stats.pending },
            { label: '发布中', value: stats.publishing },
            { label: '发布失败', value: stats.failed },
          ]}
        />
        <PlatformFilterBar onReset={() => { setBrandName(''); setPlatform(''); }}>
          <PlatformFilterField label="品牌">
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="品牌名称" className="platform-filter-input" />
          </PlatformFilterField>
          <PlatformFilterField label="发布平台">
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="platform-filter-input">
              <option value="">全部</option>
              <option value="小红书">小红书</option>
              <option value="知乎">知乎</option>
              <option value="抖音">抖音</option>
            </select>
          </PlatformFilterField>
        </PlatformFilterBar>
        <PlatformTabBar tabs={TABS} active={tab} onChange={setTab} />
        <PlatformDataTable<ContentRow>
          rows={items}
          rowKey={(r) => r.id}
          selectedKey={selected?.id}
          onRowClick={setSelected}
          columns={[
            { key: 'title', header: '标题', render: (r) => <span className="max-w-[200px] truncate block">{r.title}</span> },
            { key: 'brand', header: '品牌', render: (r) => r.brandName },
            { key: 'platform', header: '平台', render: (r) => r.platform },
            { key: 'status', header: '状态', render: (r) => <PlatformStatusTag label={r.status} kind={statusKind(r.status)} /> },
            { key: 'risk', header: '风险', render: (r) => <PlatformStatusTag label={r.risk} kind={r.risk === '正常' ? 'success' : 'danger'} /> },
          ]}
          renderActions={(r) => (
            <PlatformTableActions>
              <PlatformTableAction label="详情" variant="primary" onClick={() => setSelected(r)} />
              {canOperate(r) && (
                <>
                  <PlatformTableAction
                    label="重新派发"
                    variant="primary"
                    onClick={() => void redispatch(r)}
                  />
                  <PlatformTableAction label="转人工" onClick={() => void flagManual(r)} />
                </>
              )}
            </PlatformTableActions>
          )}
        />
      </div>
      {selected && (
        <PlatformDetailDrawer
          title={selected.title}
          statusLabel={selected.status}
          statusKind={statusKind(selected.status)}
          onClose={() => setSelected(null)}
          footer={
            canOperate(selected) ? (
              <div className="space-y-2">
                <p className="text-[10px] text-[var(--platform-text-tertiary)] leading-relaxed">
                  平台不代商家发布；「重新派发」将向商家本机 Hermes 下发任务。
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="geo-btn-primary text-sm flex-1"
                    disabled={acting}
                    onClick={() => void redispatch(selected)}
                  >
                    重新派发
                  </button>
                  <button
                    type="button"
                    className="geo-btn-secondary text-sm flex-1"
                    disabled={acting}
                    onClick={() => void flagManual(selected)}
                  >
                    转人工
                  </button>
                </div>
              </div>
            ) : undefined
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-[var(--platform-text-tertiary)]">{selected.brandName} · {selected.platform}</p>
            {selected.previewText && (
              <div className="rounded-lg border border-[var(--platform-border)] bg-[var(--platform-surface-subtle)] p-3 text-xs leading-relaxed">
                {selected.previewText.slice(0, 300)}{selected.previewText.length > 300 ? '…' : ''}
              </div>
            )}
            {selected.publishedUrl && (
              <a href={selected.publishedUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--platform-primary)] break-all">
                {selected.publishedUrl}
              </a>
            )}
            {selected.errorCode && (
              <p className="text-xs text-[var(--platform-danger)]">错误：{selected.errorCode}</p>
            )}
            {selected.reviewCategory && (
              <p className="text-xs text-amber-700">监管标记：{selected.reviewCategory}</p>
            )}
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

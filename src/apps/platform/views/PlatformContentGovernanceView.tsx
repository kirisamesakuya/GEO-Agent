import { useEffect, useState } from 'react';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';
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
  previewText?: string;
  executedAt?: string;
}

function statusKind(status: string): PlatformStatusKind {
  if (status === 'published') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending' || status === 'running') return 'pending';
  return 'muted';
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
  const [tab, setTab] = useState('all');
  const [stats, setStats] = useState({ library: 0, pending: 0, publishing: 0, failed: 0, published: 0, risky: 0 });
  const [items, setItems] = useState<ContentRow[]>([]);
  const [selected, setSelected] = useState<ContentRow | null>(null);
  const [brandName, setBrandName] = useState('');
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    const q = new URLSearchParams();
    if (brandName) q.set('brandName', brandName);
    if (platform) q.set('platform', platform);
    if (tab !== 'all' && tab !== 'library' && tab !== 'risky') q.set('tab', tab);
    if (tab === 'risky') q.set('status', 'failed');
    fetch(`/api/platform/content-governance?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? { library: 0, pending: 0, publishing: 0, failed: 0, published: 0, risky: 0 });
        let rows = d.items ?? [];
        if (tab === 'risky') rows = rows.filter((r: ContentRow) => r.risk !== '正常');
        setItems(rows);
      });
  }, [tab, brandName, platform]);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformStatSummary
          items={[
            { label: '内容库', value: stats.library },
            { label: '待发布', value: stats.pending },
            { label: '发布中', value: stats.publishing },
            { label: '发布失败', value: stats.failed },
          ]}
        />
        <PlatformFilterBar onReset={() => { setBrandName(''); setPlatform(''); }}>
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="品牌" className="platform-filter-input" />
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="platform-filter-input">
            <option value="">全部平台</option>
            <option value="小红书">小红书</option>
            <option value="知乎">知乎</option>
            <option value="抖音">抖音</option>
          </select>
        </PlatformFilterBar>
        <PlatformTabBar tabs={TABS} active={tab} onChange={setTab} />
        <PlatformDataTable<ContentRow>
          rows={items}
          rowKey={(r) => r.id}
          onRowClick={setSelected}
          columns={[
            { key: 'title', header: '标题', render: (r) => <span className="max-w-[200px] truncate block">{r.title}</span> },
            { key: 'brand', header: '品牌', render: (r) => r.brandName },
            { key: 'platform', header: '平台', render: (r) => r.platform },
            { key: 'status', header: '状态', render: (r) => <PlatformStatusTag label={r.status} kind={statusKind(r.status)} /> },
            { key: 'risk', header: '风险', render: (r) => <PlatformStatusTag label={r.risk} kind={r.risk === '正常' ? 'success' : 'danger'} /> },
          ]}
        />
      </div>
      {selected && (
        <PlatformDetailDrawer
          title={selected.title}
          statusLabel={selected.status}
          statusKind={statusKind(selected.status)}
          onClose={() => setSelected(null)}
          footer={
            <div className="flex gap-2">
              <button type="button" className="geo-btn-primary text-sm flex-1">重试发布</button>
              <button type="button" className="geo-btn-secondary text-sm flex-1">转人工</button>
            </div>
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
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

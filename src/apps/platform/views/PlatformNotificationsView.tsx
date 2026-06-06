import { useEffect, useState } from 'react';
import PlatformDataTable from '../components/PlatformDataTable';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import PlatformTabBar from '../components/PlatformTabBar';

interface NotificationRow {
  id: string;
  providerName: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  channel: string;
  createdAt: string;
}

interface TemplateRow {
  id: string;
  scene: string;
  channel: string;
  subject: string;
  body: string;
}

const TABS = [
  { id: 'records', label: '通知记录' },
  { id: 'templates', label: '模板管理' },
];

export default function PlatformNotificationsView() {
  const [tab, setTab] = useState('records');
  const [stats, setStats] = useState({ total: 0, unread: 0, failed: 0, templates: 0 });
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selected, setSelected] = useState<NotificationRow | TemplateRow | null>(null);
  const [providerName, setProviderName] = useState('');
  const [readFilter, setReadFilter] = useState('');

  useEffect(() => {
    const q = new URLSearchParams();
    if (providerName) q.set('providerName', providerName);
    if (readFilter) q.set('read', readFilter);
    fetch(`/api/platform/notifications?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? { total: 0, unread: 0, failed: 0, templates: 0 });
        setNotifications(d.notifications ?? []);
        setTemplates(d.templates ?? []);
      });
  }, [providerName, readFilter]);

  const isTemplate = selected && 'scene' in selected;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex-1 space-y-4">
        <PlatformStatSummary
          items={[
            { label: '通知总数', value: stats.total },
            { label: '未读', value: stats.unread },
            { label: '投递失败', value: stats.failed },
            { label: '模板数', value: stats.templates },
          ]}
        />
        <PlatformTabBar tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'records' && (
          <>
            <PlatformFilterBar onReset={() => { setProviderName(''); setReadFilter(''); }}>
              <input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="对象/接单方" className="platform-filter-input" />
              <select value={readFilter} onChange={(e) => setReadFilter(e.target.value)} className="platform-filter-input">
                <option value="">全部状态</option>
                <option value="unread">未读</option>
                <option value="read">已读</option>
              </select>
            </PlatformFilterBar>
            <PlatformDataTable<NotificationRow>
              rows={notifications}
              rowKey={(r) => r.id}
              onRowClick={setSelected}
              columns={[
                { key: 'target', header: '对象', render: (r) => r.providerName },
                { key: 'scene', header: '场景', render: (r) => r.type },
                { key: 'channel', header: '渠道', render: (r) => r.channel },
                { key: 'status', header: '状态', render: (r) => <PlatformStatusTag label={r.read ? '已读' : '未读'} kind={r.read ? 'muted' : 'pending'} /> },
                { key: 'time', header: '时间', render: (r) => new Date(r.createdAt).toLocaleString('zh-CN') },
              ]}
            />
          </>
        )}
        {tab === 'templates' && (
          <PlatformDataTable<TemplateRow>
            rows={templates}
            rowKey={(r) => r.id}
            onRowClick={setSelected}
            columns={[
              { key: 'scene', header: '场景', render: (r) => r.scene },
              { key: 'channel', header: '渠道', render: (r) => r.channel },
              { key: 'subject', header: '标题', render: (r) => r.subject },
            ]}
          />
        )}
      </div>
      {selected && (
        <PlatformDetailDrawer
          title={isTemplate ? (selected as TemplateRow).subject : (selected as NotificationRow).title}
          statusLabel={isTemplate ? '模板' : (selected as NotificationRow).read ? '已读' : '未读'}
          statusKind={isTemplate ? 'muted' : (selected as NotificationRow).read ? 'muted' : 'pending'}
          onClose={() => setSelected(null)}
          footer={
            <div className="flex gap-2">
              {!isTemplate && <button type="button" className="geo-btn-primary text-sm flex-1">重发</button>}
              <button type="button" className="geo-btn-secondary text-sm flex-1">复制模板</button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            {isTemplate ? (
              <p className="whitespace-pre-wrap text-[var(--platform-text-secondary)]">{(selected as TemplateRow).body}</p>
            ) : (
              <>
                <p className="text-[var(--platform-text-tertiary)]">{(selected as NotificationRow).providerName} · {(selected as NotificationRow).channel}</p>
                <p className="whitespace-pre-wrap">{(selected as NotificationRow).body}</p>
                <p className="text-xs text-[var(--platform-text-tertiary)]">
                  {new Date((selected as NotificationRow).createdAt).toLocaleString('zh-CN')}
                </p>
              </>
            )}
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

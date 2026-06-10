import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cpu, Plus } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformApiFetch, platformFetch } from '../../../lib/platform-api';
import {
  createAiMonitorPlatformCatalogEntry,
  slugifyAiMonitorPlatformId,
  type AiMonitorPlatformCatalogEntry,
} from '../../../../lib/ai-monitor-platform-catalog';
import PlatformDataTable from '../components/PlatformDataTable';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import { includesText } from '../lib/platform-filter-utils';

export default function PlatformMonitorPlatformsView() {
  const { toast } = useToast();
  const { role } = usePlatformRole();
  const [platforms, setPlatforms] = useState<AiMonitorPlatformCatalogEntry[]>([]);
  const [keyword, setKeyword] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [selected, setSelected] = useState<AiMonitorPlatformCatalogEntry | null>(null);
  const [draft, setDraft] = useState<AiMonitorPlatformCatalogEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    platformApiFetch('/api/platform/monitor-platforms')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? '加载失败');
        setPlatforms((d.platforms ?? []) as AiMonitorPlatformCatalogEntry[]);
      })
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败', 'error'));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return platforms.filter((item) => {
      if (enabledFilter === 'enabled' && !item.enabled) return false;
      if (enabledFilter === 'disabled' && item.enabled) return false;
      if (keyword.trim()) {
        const q = keyword.trim();
        if (!includesText(item.label, q) && !includesText(item.id, q)) return false;
      }
      return true;
    });
  }, [platforms, enabledFilter, keyword]);

  const stats = useMemo(() => {
    const enabled = platforms.filter((item) => item.enabled).length;
    return { total: platforms.length, enabled };
  }, [platforms]);

  const openEdit = (entry: AiMonitorPlatformCatalogEntry) => {
    setCreating(false);
    setSelected(entry);
    setDraft({ ...entry });
  };

  const openCreate = () => {
    setSelected({ id: '__new__', label: '', loginUrl: '', loginHint: '', sortOrder: 500, enabled: true });
    setDraft(createAiMonitorPlatformCatalogEntry({ label: '', sortOrder: 500 }));
    setCreating(true);
  };

  const closeDrawer = () => {
    setSelected(null);
    setDraft(null);
    setCreating(false);
    setReason('');
  };

  const saveDraft = async () => {
    if (!draft) return;
    const label = draft.label.trim();
    if (!label) {
      toast('请填写平台名称', 'error');
      return;
    }
    if (!draft.loginUrl.trim()) {
      toast('请填写登录入口 URL', 'error');
      return;
    }
    setSaving(true);
    const normalized = creating
      ? createAiMonitorPlatformCatalogEntry({
          ...draft,
          label,
          id: draft.id && draft.id !== '__new__' ? draft.id : slugifyAiMonitorPlatformId(label),
        })
      : { ...draft, label };
    if (creating && platforms.some((item) => item.id === normalized.id || item.label === normalized.label)) {
      toast('平台 ID 或名称已存在', 'error');
      setSaving(false);
      return;
    }
    const next = creating
      ? [...platforms, normalized]
      : platforms.map((item) => (item.id === normalized.id ? normalized : item));
    const res = await platformFetch(role, '/api/platform/monitor-platforms', {
      method: 'PUT',
      body: JSON.stringify({
        platforms: next,
        reason: reason.trim() || '更新监测平台字典',
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast(creating ? '平台已添加' : '监测平台字典已保存', 'success');
    setPlatforms(data.platforms ?? next);
    closeDrawer();
  };

  const resetDefaults = async () => {
    if (!window.confirm('确认恢复为系统默认监测平台字典？')) return;
    setSaving(true);
    const res = await platformFetch(role, '/api/platform/monitor-platforms/reset', {
      method: 'POST',
      body: JSON.stringify({ reason: reason.trim() || '恢复监测平台默认字典' }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('已恢复默认监测平台字典', 'success');
    setPlatforms(data.platforms ?? []);
  };

  const toggleEnabled = async (entry: AiMonitorPlatformCatalogEntry) => {
    const next = platforms.map((item) =>
      item.id === entry.id ? { ...item, enabled: !item.enabled } : item
    );
    setSaving(true);
    const res = await platformFetch(role, '/api/platform/monitor-platforms', {
      method: 'PUT',
      body: JSON.stringify({
        platforms: next,
        reason: reason.trim() || `${entry.enabled ? '停用' : '启用'}监测平台 ${entry.label}`,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast(entry.enabled ? '已停用' : '已启用', 'success');
    setPlatforms(data.platforms ?? next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            监测平台字典
          </h2>
          <p className="text-sm text-[var(--platform-text-secondary)] mt-1">
            维护发布端「AI 监测平台」登录入口与提示文案。平台名称需与排名采样、Hermes 探测任务中的平台名一致。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="geo-btn-primary text-sm inline-flex items-center gap-1" disabled={saving} onClick={openCreate}>
            <Plus className="w-4 h-4" />
            新建平台
          </button>
          <button
            type="button"
            className="geo-btn-secondary text-sm"
            disabled={saving}
            onClick={() => void resetDefaults()}
          >
            恢复默认
          </button>
        </div>
      </div>

      <PlatformStatSummary
        items={[
          { label: '平台总数', value: String(stats.total) },
          { label: '已启用', value: String(stats.enabled) },
        ]}
      />

      <PlatformFilterBar>
        <PlatformFilterField label="状态">
          <select
            className="platform-filter-input text-sm"
            value={enabledFilter}
            onChange={(e) => setEnabledFilter(e.target.value as typeof enabledFilter)}
          >
            <option value="all">全部</option>
            <option value="enabled">已启用</option>
            <option value="disabled">已停用</option>
          </select>
        </PlatformFilterField>
        <PlatformFilterField label="搜索">
          <input
            className="platform-filter-input text-sm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="平台名称 / ID"
          />
        </PlatformFilterField>
      </PlatformFilterBar>

      <PlatformDataTable
        rows={filtered}
        rowKey={(row) => row.id}
        onRowClick={openEdit}
        selectedKey={selected?.id}
        emptyText="暂无监测平台"
        columns={[
          {
            key: 'label',
            header: '平台名称',
            render: (row) => <span className="font-medium">{row.label}</span>,
          },
          {
            key: 'loginUrl',
            header: '登录入口',
            render: (row) => (
              <a
                href={row.loginUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--platform-accent)] hover:underline truncate max-w-[240px] inline-block"
                onClick={(e) => e.stopPropagation()}
              >
                {row.loginUrl}
              </a>
            ),
          },
          {
            key: 'sortOrder',
            header: '排序',
            render: (row) => row.sortOrder,
          },
          {
            key: 'enabled',
            header: '状态',
            render: (row) => (
              <PlatformStatusTag label={row.enabled ? '已启用' : '已停用'} kind={row.enabled ? 'success' : 'muted'} />
            ),
          },
        ]}
        renderActions={(row) => (
          <PlatformTableActions>
            <PlatformTableAction label="编辑" variant="primary" onClick={() => openEdit(row)} />
            {row.enabled ? (
              <PlatformTableAction
                label="停用"
                variant="danger"
                disabled={saving}
                onClick={() => void toggleEnabled(row)}
              />
            ) : (
              <PlatformTableAction
                label="启用"
                variant="primary"
                disabled={saving}
                onClick={() => void toggleEnabled(row)}
              />
            )}
          </PlatformTableActions>
        )}
        clickHint="点击行或「编辑」打开详情；启用/停用将立即保存"
      />

      {selected && draft && (
        <PlatformDetailDrawer
          title={creating ? '新建监测平台' : `编辑监测平台 · ${draft.label}`}
          onClose={closeDrawer}
          footer={
            <button
              type="button"
              className="geo-btn-primary text-sm"
              disabled={saving || !draft}
              onClick={() => void saveDraft()}
            >
              {saving ? '保存中…' : creating ? '确认添加' : '保存'}
            </button>
          }
        >
          <div className="space-y-4 text-sm">
            <span className="text-xs text-[var(--platform-text-tertiary)]">
              ID: {creating ? slugifyAiMonitorPlatformId(draft.label || 'new') : draft.id}
            </span>
            <label className="block space-y-1">
              <span className="text-xs text-[var(--platform-text-secondary)]">平台名称</span>
              <input
                className="platform-filter-input w-full"
                value={draft.label}
                maxLength={20}
                onChange={(e) => setDraft({ ...draft, label: e.target.value.slice(0, 20) })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-[var(--platform-text-secondary)]">登录入口 URL</span>
              <input
                className="platform-filter-input w-full"
                value={draft.loginUrl}
                onChange={(e) => setDraft({ ...draft, loginUrl: e.target.value })}
                placeholder="https://..."
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-[var(--platform-text-secondary)]">登录提示（可选）</span>
              <textarea
                className="platform-filter-input w-full min-h-[72px]"
                value={draft.loginHint}
                onChange={(e) => setDraft({ ...draft, loginHint: e.target.value })}
                placeholder="例如：请使用手机号登录后保持会话"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-[var(--platform-text-secondary)]">排序</span>
              <input
                type="number"
                className="platform-filter-input w-full"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              在发布端启用该平台
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-[var(--platform-text-secondary)]">变更原因（可选）</span>
              <input
                className="platform-filter-input w-full"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例如：更新豆包登录页地址"
              />
            </label>
          </div>
        </PlatformDetailDrawer>
      )}
    </div>
  );
}

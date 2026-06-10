import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers3, Plus } from 'lucide-react';
import PlatformBadge from '../../../components/common/PlatformBadge';
import PlatformLogoUpload from '../../../components/common/PlatformLogoUpload';
import { useToast } from '../../../context/ToastContext';
import { usePlatformRole } from '../../../hooks/usePlatformRole';
import { platformApiFetch, platformFetch } from '../../../lib/platform-api';
import {
  MEDIA_PLATFORM_CATEGORY_LABELS,
  createMediaPlatformCatalogEntry,
  slugifyMediaPlatformId,
  type MediaPlatformCatalogEntry,
  type MediaPlatformCategory,
} from '../../../lib/media-platform-catalog';
import PlatformDataTable from '../components/PlatformDataTable';
import { PlatformTableAction, PlatformTableActions } from '../components/PlatformTableActions';
import PlatformDetailDrawer from '../components/PlatformDetailDrawer';
import PlatformFilterBar from '../components/PlatformFilterBar';
import PlatformFilterField from '../components/PlatformFilterField';
import PlatformStatSummary from '../components/PlatformStatSummary';
import PlatformStatusTag from '../components/PlatformStatusTag';
import { includesText } from '../lib/platform-filter-utils';

const CATEGORY_TABS: Array<{ id: '' | MediaPlatformCategory; label: string }> = [
  { id: '', label: '全部' },
  { id: 'content_publish', label: '内容发布' },
  { id: 'website', label: '网站' },
  { id: 'official_media', label: '官媒' },
  { id: 'ai_search', label: 'AI 搜索' },
];

function emptyDraft(): MediaPlatformCatalogEntry | null {
  return null;
}

export default function PlatformMediaPlatformsView() {
  const { toast } = useToast();
  const { role } = usePlatformRole();
  const [platforms, setPlatforms] = useState<MediaPlatformCatalogEntry[]>([]);
  const [category, setCategory] = useState<'' | MediaPlatformCategory>('');
  const [keyword, setKeyword] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [selected, setSelected] = useState<MediaPlatformCatalogEntry | null>(null);
  const [draft, setDraft] = useState<MediaPlatformCatalogEntry | null>(emptyDraft());
  const [creating, setCreating] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    platformApiFetch('/api/platform/media-platforms')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? '加载失败');
        setPlatforms((d.platforms ?? []) as MediaPlatformCatalogEntry[]);
      })
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败', 'error'));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return platforms.filter((item) => {
      if (category && item.category !== category) return false;
      if (enabledFilter === 'enabled' && !item.enabled) return false;
      if (enabledFilter === 'disabled' && item.enabled) return false;
      if (keyword.trim()) {
        const q = keyword.trim();
        if (!includesText(item.label, q) && !includesText(item.id, q)) return false;
      }
      return true;
    });
  }, [platforms, category, enabledFilter, keyword]);

  const stats = useMemo(() => {
    const enabled = platforms.filter((item) => item.enabled).length;
    const lobby = platforms.filter(
      (item) =>
        item.enabled &&
        (item.category === 'content_publish' ||
          item.category === 'website' ||
          item.category === 'official_media')
    ).length;
    return { total: platforms.length, enabled, lobby };
  }, [platforms]);

  const openEdit = (entry: MediaPlatformCatalogEntry) => {
    setCreating(false);
    setSelected(entry);
    setDraft({ ...entry });
  };

  const openCreate = () => {
    setSelected({ id: '__new__', label: '', category: 'content_publish', sortOrder: 500, enabled: true, abbr: '', gradient: '' });
    setDraft(createMediaPlatformCatalogEntry({ label: '', category: 'content_publish', sortOrder: 500 }));
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
    setSaving(true);
    const normalized = creating
      ? createMediaPlatformCatalogEntry({
          ...draft,
          label,
          id: draft.id && draft.id !== '__new__' ? draft.id : slugifyMediaPlatformId(label),
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
    const res = await platformFetch(role, '/api/platform/media-platforms', {
      method: 'PUT',
      body: JSON.stringify({
        platforms: next,
        reason: reason.trim() || '更新媒体平台字典',
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast(creating ? '平台已添加' : '平台字典已保存', 'success');
    setPlatforms(data.platforms ?? next);
    closeDrawer();
  };

  const resetDefaults = async () => {
    if (!window.confirm('确认恢复为系统默认平台字典？')) return;
    setSaving(true);
    const res = await platformFetch(role, '/api/platform/media-platforms/reset', {
      method: 'POST',
      body: JSON.stringify({ reason: reason.trim() || '恢复媒体平台默认字典' }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('已恢复默认平台字典', 'success');
    setPlatforms(data.platforms ?? []);
  };

  const toggleEnabled = async (entry: MediaPlatformCatalogEntry) => {
    const next = platforms.map((item) =>
      item.id === entry.id ? { ...item, enabled: !item.enabled } : item
    );
    setSaving(true);
    const res = await platformFetch(role, '/api/platform/media-platforms', {
      method: 'PUT',
      body: JSON.stringify({
        platforms: next,
        reason: reason.trim() || `${entry.enabled ? '停用' : '启用'}平台 ${entry.label}`,
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
            <Layers3 className="w-5 h-5" />
            媒体平台字典
          </h2>
          <p className="text-sm text-[var(--platform-text-secondary)] mt-1">
            维护发布端、接单端与内容交付列表使用的平台名称与图标样式。当前默认对齐接单端 10 个平台。
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
          { label: '接单端可选', value: String(stats.lobby) },
        ]}
      />

      <PlatformFilterBar>
        <PlatformFilterField label="分类">
          <select
            className="platform-filter-input text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as '' | MediaPlatformCategory)}
          >
            {CATEGORY_TABS.map((tab) => (
              <option key={tab.id || 'all'} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </PlatformFilterField>
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
        emptyText="暂无平台"
        columns={[
          {
            key: 'icon',
            header: '图标',
            render: (row) => <PlatformBadge label={row.label} catalog={[row]} showLabel={false} size="md" />,
          },
          {
            key: 'label',
            header: '平台名称',
            render: (row) => <span className="font-medium">{row.label}</span>,
          },
          {
            key: 'category',
            header: '分类',
            render: (row) => MEDIA_PLATFORM_CATEGORY_LABELS[row.category],
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
        title={creating ? '新建平台' : `编辑平台 · ${draft.label}`}
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
        {draft && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <PlatformBadge label={draft.label} catalog={[draft]} size="md" />
              <span className="text-xs text-[var(--platform-text-tertiary)]">
                ID: {creating ? slugifyMediaPlatformId(draft.label || 'new') : draft.id}
              </span>
            </div>
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
              <span className="text-xs text-[var(--platform-text-secondary)]">平台 LOGO</span>
              <PlatformLogoUpload
                label={draft.label}
                logoUrl={draft.logoUrl ?? ''}
                onChange={(logoUrl) => setDraft({ ...draft, logoUrl })}
                catalogEntry={draft}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs text-[var(--platform-text-secondary)]">分类</span>
                <select
                  className="platform-filter-input w-full"
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value as MediaPlatformCategory })
                  }
                >
                  {Object.entries(MEDIA_PLATFORM_CATEGORY_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
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
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              在前台启用该平台
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-[var(--platform-text-secondary)]">变更原因（可选）</span>
              <input
                className="platform-filter-input w-full"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例如：新增 MiniMax 平台展示"
              />
            </label>
          </div>
        )}
      </PlatformDetailDrawer>
      )}
    </div>
  );
}

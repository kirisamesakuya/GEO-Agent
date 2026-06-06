import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import type { BrandCenterTab } from '../lib/brand-center';
import { useToast } from '../context/ToastContext';
import { BRANDS_UPDATED_EVENT, notifyBrandsUpdated } from '../lib/brand-events';

interface BrandItem {
  id: string;
  name: string;
  industry: string;
  city: string;
  ownerName: string;
  status: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

function formatBrandListTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

interface Props {
  onBrandCreated?: (name: string) => void;
  onOpenBrandWorkspace: (name: string, tab: BrandCenterTab) => void;
}

export default function BrandListView({ onBrandCreated, onOpenBrandWorkspace }: Props) {
  const { toast } = useToast();
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BrandItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    return fetch('/api/brands')
      .then((r) => r.json())
      .then((d) => setBrands(d.brands ?? []))
      .catch(() => toast('加载品牌列表失败', 'error'));
  }, [toast]);

  useEffect(() => {
    void load();
    const onUpdated = () => void load();
    window.addEventListener(BRANDS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(BRANDS_UPDATED_EVENT, onUpdated);
  }, [load]);

  const openEdit = (name: string) => {
    onOpenBrandWorkspace(name, 'profile');
  };

  const closeAddModal = () => {
    if (creating) return;
    setShowAddModal(false);
    setNewName('');
    setNewOwnerName('');
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) {
      toast('请填写品牌名称', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ownerName: newOwnerName.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(typeof data.error === 'string' ? data.error : '创建失败', 'error');
        return;
      }
      if (!data.profile?.name) {
        toast('创建成功但响应异常，请刷新页面', 'error');
        return;
      }
      toast(`品牌「${data.profile.name}」已创建`, 'success');
      setShowAddModal(false);
      setNewName('');
      setNewOwnerName('');
      await load();
      notifyBrandsUpdated();
      onBrandCreated?.(data.profile.name);
      openEdit(data.profile.name);
    } catch {
      toast('网络错误，创建失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/brands/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(typeof data.error === 'string' ? data.error : '删除失败', 'error');
        return;
      }
      toast(`品牌「${deleteTarget.name}」已删除`, 'success');
      setDeleteTarget(null);
      await load();
      notifyBrandsUpdated();
    } catch {
      toast('网络错误，删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="geo-page-content space-y-4">
        <div className="geo-card p-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-sm mb-1">品牌管理</h2>
            <p className="text-xs" style={{ color: 'var(--neutral-text-03)' }}>
              维护组织下全部品牌的基础档案。点击行或「编辑」进入品牌工作区（资料、词库、知识库、素材）；业务功能请从侧栏进入。
            </p>
          </div>
          <button
            type="button"
            className="geo-btn-primary geo-btn-sm shrink-0 flex items-center gap-1"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            新增品牌
          </button>
        </div>

        <div className="geo-card overflow-x-auto">
          <table className="w-full text-sm geo-table min-w-[720px]">
            <thead>
              <tr>
                <th>品牌</th>
                <th>行业</th>
                <th>城市</th>
                <th>负责人</th>
                <th>创建时间</th>
                <th>最近更新</th>
                <th style={{ textAlign: 'right', width: 120 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {brands.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs" style={{ color: 'var(--neutral-text-03)' }}>
                    暂无品牌，点击「新增品牌」创建
                  </td>
                </tr>
              ) : (
                brands.map((b) => (
                  <tr
                    key={b.id}
                    className="cursor-pointer hover:bg-[var(--neutral-bg-02)]"
                    onClick={() => openEdit(b.name)}
                  >
                    <td className="font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{b.name}</span>
                        {b.isDefault && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: 'var(--neutral-bg-02)', color: 'var(--neutral-text-03)' }}
                          >
                            默认
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{b.industry}</td>
                    <td>{b.city || '—'}</td>
                    <td className="text-xs">{b.ownerName?.trim() || '—'}</td>
                    <td className="text-xs tabular-nums whitespace-nowrap text-[var(--neutral-text-03)]">
                      {formatBrandListTime(b.createdAt)}
                    </td>
                    <td className="text-xs tabular-nums whitespace-nowrap text-[var(--neutral-text-03)]">
                      {formatBrandListTime(b.updatedAt)}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-3 text-xs">
                        <button
                          type="button"
                          className="inline-flex items-center gap-0.5 text-[var(--color-accent)] font-medium hover:underline"
                          onClick={() => openEdit(b.name)}
                        >
                          <Pencil className="w-3 h-3" />
                          编辑
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-0.5 font-medium hover:underline"
                          style={{ color: 'var(--neutral-text-03)' }}
                          onClick={() => setDeleteTarget(b)}
                        >
                          <Trash2 className="w-3 h-3" />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="geo-modal-backdrop" role="dialog" aria-modal="true">
          <div className="geo-modal max-w-md relative">
            <button
              type="button"
              onClick={closeAddModal}
              disabled={creating}
              className="absolute top-5 right-5 p-1 geo-nav-item rounded-lg disabled:opacity-50"
              style={{ color: 'var(--neutral-text-03)' }}
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="geo-modal-head">
              <h3 className="font-bold text-sm" style={{ color: 'var(--neutral-text-01)' }}>
                新增品牌
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-text-03)' }}>
                填写品牌名称，创建后将进入品牌工作区完善资料。
              </p>
            </div>
            <div className="geo-modal-body space-y-3">
              <div>
                <label className="geo-label block mb-1.5" htmlFor="brand-add-name">
                  品牌名称 <span className="text-red-500">*</span>
                </label>
                <input
                  id="brand-add-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：云杉口腔"
                  className="geo-input w-full"
                  disabled={creating}
                  autoFocus
                />
              </div>
              <div>
                <label className="geo-label block mb-1.5" htmlFor="brand-add-owner">
                  负责人
                </label>
                <input
                  id="brand-add-owner"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void create()}
                  placeholder="例如：张运营"
                  className="geo-input w-full"
                  disabled={creating}
                />
              </div>
            </div>
            <div className="geo-modal-foot">
              <button type="button" className="geo-btn-secondary geo-btn-sm" onClick={closeAddModal} disabled={creating}>
                取消
              </button>
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm"
                disabled={creating || !newName.trim()}
                onClick={() => void create()}
              >
                {creating ? '创建中…' : '确认创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="geo-modal-backdrop" role="dialog" aria-modal="true">
          <div className="geo-modal max-w-md relative">
            <button
              type="button"
              onClick={() => !deleting && setDeleteTarget(null)}
              disabled={deleting}
              className="absolute top-5 right-5 p-1 geo-nav-item rounded-lg disabled:opacity-50"
              style={{ color: 'var(--neutral-text-03)' }}
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="geo-modal-head">
              <h3 className="font-bold text-sm" style={{ color: 'var(--neutral-text-01)' }}>
                删除品牌
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-text-03)' }}>
                确定删除品牌「{deleteTarget.name}」？删除后不再出现在列表中，关联历史数据仍保留。
              </p>
            </div>
            <div className="geo-modal-foot">
              <button
                type="button"
                className="geo-btn-secondary geo-btn-sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                取消
              </button>
              <button
                type="button"
                className="geo-btn-primary geo-btn-sm"
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

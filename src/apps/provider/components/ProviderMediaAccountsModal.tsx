import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ExternalLink } from 'lucide-react';

export interface ProviderMediaAccount {
  id: string;
  platform: string;
  accountName: string;
  profileUrl: string;
}

import { PROVIDER_TASK_HALL_FILTER_PLATFORMS } from '../../../lib/publish-content-platforms';

const PLATFORMS = [...PROVIDER_TASK_HALL_FILTER_PLATFORMS] as const;

function newId() {
  return `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseProviderMediaAccounts(
  platformsJson?: string | null,
  capabilitiesJson?: string | null
): ProviderMediaAccount[] {
  try {
    const cap = JSON.parse(capabilitiesJson ?? '[]') as unknown;
    if (Array.isArray(cap) && cap.length > 0 && typeof cap[0] === 'object' && cap[0] !== null && 'platform' in cap[0]) {
      return (cap as Array<{ id?: string; platform?: string; accountName?: string; profileUrl?: string }>).map(
        (a, i) => ({
          id: a.id ?? newId(),
          platform: String(a.platform ?? ''),
          accountName: String(a.accountName ?? ''),
          profileUrl: String(a.profileUrl ?? ''),
        })
      );
    }
  } catch {
    /* legacy */
  }
  try {
    const platforms = JSON.parse(platformsJson ?? '[]') as string[];
    if (Array.isArray(platforms) && platforms.length > 0) {
      return platforms.map((p, i) => ({
        id: `legacy-${i}`,
        platform: p,
        accountName: '',
        profileUrl: '',
      }));
    }
  } catch {
    /* empty */
  }
  return [];
}

export function mediaAccountsToPayload(accounts: ProviderMediaAccount[]) {
  const platforms = [...new Set(accounts.map((a) => a.platform).filter(Boolean))];
  const capabilities = accounts
    .filter((a) => a.platform)
    .map(({ id, platform, accountName, profileUrl }) => ({
      id,
      platform,
      accountName: accountName.trim(),
      profileUrl: profileUrl.trim() || undefined,
    }));
  return { platforms, capabilities };
}

interface Props {
  open: boolean;
  accounts: ProviderMediaAccount[];
  onClose: () => void;
  onSave: (accounts: ProviderMediaAccount[]) => void;
  readOnly?: boolean;
}

export default function ProviderMediaAccountsModal({
  open,
  accounts: initial,
  onClose,
  onSave,
  readOnly = false,
}: Props) {
  const [accounts, setAccounts] = useState<ProviderMediaAccount[]>(initial);
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>('小红书');
  const [accountName, setAccountName] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setAccounts(initial);
  }, [open, initial]);

  if (!open) return null;

  const resetForm = () => {
    setAccountName('');
    setProfileUrl('');
    setEditingId(null);
  };

  const upsertAccount = () => {
    const name = accountName.trim();
    if (!name) return;
    if (editingId) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? { ...a, platform, accountName: name, profileUrl: profileUrl.trim() }
            : a
        )
      );
    } else {
      setAccounts((prev) => [
        ...prev,
        { id: newId(), platform, accountName: name, profileUrl: profileUrl.trim() },
      ]);
    }
    resetForm();
  };

  const startEdit = (a: ProviderMediaAccount) => {
    setEditingId(a.id);
    setPlatform((PLATFORMS.includes(a.platform as (typeof PLATFORMS)[number]) ? a.platform : '小红书') as (typeof PLATFORMS)[number]);
    setAccountName(a.accountName);
    setProfileUrl(a.profileUrl);
  };

  const removeAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (editingId === id) resetForm();
  };

  const handleSave = () => {
    const valid = accounts.filter((a) => a.platform && a.accountName.trim());
    onSave(valid);
    onClose();
  };

  return (
    <div className="provider-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="provider-media-modal-title">
      <div className="provider-modal max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="provider-modal-head flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 id="provider-media-modal-title" className="text-sm font-bold text-provider-title">
              绑定媒体账号
            </h3>
            <p className="text-xs text-provider-muted mt-1">填写各平台账号名称与主页链接，供平台审核与接单匹配</p>
          </div>
          <button type="button" className="p-1 rounded-lg provider-nav-item" onClick={onClose} aria-label="关闭">
            <X className="w-5 h-5 text-provider-muted" />
          </button>
        </div>

        <div className="provider-modal-body overflow-y-auto flex-1 min-h-0 space-y-4">
          {accounts.length === 0 ? (
            <p className="text-xs text-provider-muted text-center py-6">暂未添加账号，请在下方填写后点击「添加」</p>
          ) : (
            <ul className="space-y-2">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-provider bg-provider-subtle/80"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {a.platform.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-provider-title">{a.accountName || '未命名'}</p>
                    <p className="text-xs text-provider-secondary mt-0.5">{a.platform}</p>
                    {a.profileUrl && (
                      <a
                        href={a.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-brand mt-1 inline-flex items-center gap-0.5 hover:underline"
                      >
                        主页 <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button type="button" className="text-[10px] text-brand font-semibold" onClick={() => startEdit(a)}>
                        编辑
                      </button>
                      <button type="button" className="text-[10px] text-red-500 font-semibold" onClick={() => removeAccount(a.id)}>
                        删除
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!readOnly && (
            <div className="p-4 rounded-xl border border-dashed border-provider-subtle space-y-3">
              <p className="text-xs font-semibold text-provider-body">{editingId ? '编辑账号' : '添加账号'}</p>
              <div>
                <label className="text-[10px] text-provider-secondary block mb-1">平台</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])}
                  className="w-full px-3 py-2 border border-provider rounded-lg text-sm bg-white"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-provider-secondary block mb-1">账号名称 / 昵称 *</label>
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="如：小北的美食日记"
                  className="w-full px-3 py-2 border border-provider rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-provider-secondary block mb-1">主页链接（选填）</label>
                <input
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-provider rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="provider-btn-primary text-xs flex-1 flex items-center justify-center gap-1"
                  onClick={upsertAccount}
                  disabled={!accountName.trim()}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {editingId ? '保存修改' : '添加账号'}
                </button>
                {editingId && (
                  <button type="button" className="provider-btn-secondary text-xs" onClick={resetForm}>
                    取消编辑
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="provider-modal-foot shrink-0">
          <button type="button" className="provider-btn-secondary text-xs" onClick={onClose}>
            取消
          </button>
          {!readOnly && (
            <button type="button" className="provider-btn-primary text-xs" onClick={handleSave}>
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

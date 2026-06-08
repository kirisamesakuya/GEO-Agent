import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import type { AccountBinding } from '../../types';
import type { AiPublishGroup } from '../../lib/article-delivery-unified';
import { resolveAccountForPlatform } from '../../lib/ai-article-publish';
import { platformMatches } from '../../lib/content-library-platforms';
import { isPublishReady } from '../../lib/publish-account-login-status';

interface Props {
  open: boolean;
  groups: AiPublishGroup[];
  accounts: AccountBinding[];
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (accountByPlatform: Record<string, string>) => void;
}

export default function ArticleDeliveryPublishDialog({
  open,
  groups,
  accounts,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const platforms = useMemo(() => [...new Set(groups.map((g) => g.platform))], [groups]);
  const articleCount = groups.reduce((sum, g) => sum + g.itemIds.length, 0);

  const [accountByPlatform, setAccountByPlatform] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const platform of platforms) {
      const account = resolveAccountForPlatform(accounts, platform);
      if (account) next[platform] = account.id;
    }
    setAccountByPlatform(next);
  }, [open, platforms, accounts]);

  if (!open || groups.length === 0) return null;

  const allAccountsReady = platforms.every((platform) =>
    resolveAccountForPlatform(accounts, platform, accountByPlatform[platform])
  );

  return (
    <div className="geo-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="article-publish-dialog-title">
      <div className="geo-modal max-w-md">
        <div className="geo-modal-head">
          <h3
            id="article-publish-dialog-title"
            className="text-base font-bold text-[var(--color-title)] flex items-center gap-2"
          >
            <Send className="w-4 h-4 text-[var(--color-accent)]" />
            确认发布
          </h3>
          <p className="text-xs text-[var(--neutral-text-03)] mt-1">
            共 {articleCount} 篇 AI 文章，将经 Hermes 在本机执行发布。
          </p>
        </div>
        <div className="geo-modal-body space-y-3">
          {platforms.map((platform) => {
            const options = accounts.filter(
              (a) => platformMatches(platform, a.platform) && isPublishReady(a.status)
            );

            return (
              <div key={platform}>
                <p className="text-xs text-[var(--neutral-text-03)] mb-1">目标平台 · {platform}</p>
                {options.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                    暂无可用发布账号，请先在「发布账号管理」中登录。
                  </p>
                ) : (
                  <select
                    className="geo-input w-full text-sm"
                    value={accountByPlatform[platform] ?? options[0]?.id ?? ''}
                    onChange={(e) =>
                      setAccountByPlatform((prev) => ({ ...prev, [platform]: e.target.value }))
                    }
                    disabled={loading}
                  >
                    {options.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName} · {a.platform}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
        <div className="geo-modal-foot">
          <button type="button" className="geo-btn-secondary geo-btn-sm" disabled={loading} onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="geo-btn-primary geo-btn-sm"
            disabled={loading || !allAccountsReady}
            onClick={() => onConfirm(accountByPlatform)}
          >
            {loading ? '处理中…' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}

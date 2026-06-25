import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import { buildPublishUnavailableDialogCopy } from '../../../lib/publish-platform-capability';
import { fetchPlatformAuthConfig } from '../../lib/platform-auth-client';
import { resolveCreatorCenterUrl } from '../../lib/manual-publish-copy';
import type { PublishUnavailableDialogState } from '../../lib/publish-unavailable-dialog-state';
import { useToast } from '../../context/ToastContext';

interface Props {
  open: boolean;
  state: PublishUnavailableDialogState | null;
  brandName?: string;
  onClose: () => void;
}

export default function PublishPlatformUnavailableDialog({
  open,
  state,
  brandName,
  onClose,
}: Props) {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!open) setCopying(false);
  }, [open]);

  const copy = useMemo(() => {
    if (!state?.unsupported.length) {
      return {
        title: '',
        hint: '',
        statusUnsupportedLabel: '',
        statusSupportedLabel: '',
        body: '',
        showCopyAction: false,
      };
    }
    return buildPublishUnavailableDialogCopy({
      unsupported: state.unsupported,
      autoPublishedPlatforms: state.autoPublished,
    });
  }, [state]);

  if (!open || !state?.unsupported.length) return null;

  const primaryManualPlatform = state.unsupported[0];

  const handleCopyAndOpen = async () => {
    if (!state.copyText?.trim()) {
      toast('暂无正文可复制，请先在内容库打开文章', 'error');
      return;
    }
    setCopying(true);
    try {
      await navigator.clipboard.writeText(state.copyText);
      const configs = await fetchPlatformAuthConfig(brandName);
      const url = resolveCreatorCenterUrl(primaryManualPlatform, configs);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      toast(
        url
          ? `正文已复制，已打开${primaryManualPlatform}创作后台`
          : `正文已复制，请手动打开${primaryManualPlatform}后台粘贴发布`,
        'success'
      );
      onClose();
    } catch {
      toast('复制失败，请手动选中正文复制', 'error');
    } finally {
      setCopying(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/30"
        aria-label="关闭"
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border shadow-xl p-6 space-y-4"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--neutral-divider-02)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-unavailable-title"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 id="publish-unavailable-title" className="text-sm font-bold text-[var(--color-title)]">
              {copy.title}
            </h3>
            <p className="text-xs text-[var(--neutral-text-03)] mt-1">{copy.hint}</p>
          </div>
        </div>

        <ul className="text-xs space-y-1.5 rounded-lg bg-[var(--neutral-bg-03)] p-3">
          <li>
            <span className="text-[var(--neutral-text-03)]">
              {state.autoPublished?.length ? '需手动发布：' : '暂未开通：'}
            </span>
            <span className="font-medium">{copy.statusUnsupportedLabel}</span>
          </li>
          <li>
            <span className="text-[var(--neutral-text-03)]">
              {state.autoPublished?.length ? '已提交自动发布：' : '已接入自动发布：'}
            </span>
            <span className="font-medium">{copy.statusSupportedLabel}</span>
          </li>
        </ul>

        <p className="text-xs text-[var(--neutral-text-02)] leading-relaxed">{copy.body}</p>

        <div className="flex flex-wrap gap-2 justify-end pt-1">
          <button type="button" className="geo-btn-secondary geo-btn-sm" onClick={onClose}>
            我知道了
          </button>
          {copy.showCopyAction && (
            <button
              type="button"
              className="geo-btn-primary geo-btn-sm inline-flex items-center gap-1"
              disabled={copying}
              onClick={() => void handleCopyAndOpen()}
            >
              {copying ? '处理中…' : '复制并去手动发布'}
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

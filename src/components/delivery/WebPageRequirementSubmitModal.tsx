import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { WEBSITE_PAGE_TYPES } from '../../../lib/website-order-flow';

interface Props {
  brandName: string;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function WebPageRequirementSubmitModal({
  brandName,
  open,
  onClose,
  onSubmitted,
}: Props) {
  const { toast } = useToast();
  const [referenceUrl, setReferenceUrl] = useState('');
  const [pageType, setPageType] = useState(WEBSITE_PAGE_TYPES[0]);
  const [keywords, setKeywords] = useState('');
  const [notes, setNotes] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!keywords.trim()) {
      toast('请填写目标关键词', 'error');
      return;
    }
    if (!contact.trim()) {
      toast('请填写联系方式', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const goal = [
        keywords.trim(),
        notes.trim() ? `参考说明：${notes.trim()}` : '',
        `联系方式：${contact.trim()}`,
      ]
        .filter(Boolean)
        .join('\n');
      const res = await fetch('/api/website-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          pageType,
          goal,
          referenceUrl: referenceUrl.trim() || undefined,
          modules: ['客资提交'],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? '提交失败', 'error');
        return;
      }
      toast('网页需求已提交，后台将尽快处理', 'success');
      setReferenceUrl('');
      setKeywords('');
      setNotes('');
      setContact('');
      onSubmitted();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="geo-modal-backdrop" onClick={onClose}>
      <div className="geo-modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="geo-modal-head">
          <h3 className="font-bold text-sm">提交网页需求</h3>
          <p className="text-xs text-[var(--neutral-text-03)] mt-1">
            填写基础客资后由后台处理，无需设计师接单流程。
          </p>
        </div>
        <div className="geo-modal-body space-y-3">
          <div>
            <label className="geo-label">品牌</label>
            <input className="geo-input w-full mt-1 text-sm" value={brandName} disabled />
          </div>
          <div>
            <label className="geo-label">官网/落地页链接</label>
            <input
              className="geo-input w-full mt-1 text-sm"
              placeholder="https://"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="geo-label">想优化的页面类型</label>
            <select
              className="geo-input w-full mt-1 text-sm"
              value={pageType}
              onChange={(e) => setPageType(e.target.value)}
            >
              {WEBSITE_PAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="geo-label">目标关键词</label>
            <input
              className="geo-input w-full mt-1 text-sm"
              placeholder="例如：南京种植牙、隐形矫正"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>
          <div>
            <label className="geo-label">参考说明（可选）</label>
            <textarea
              className="geo-input w-full mt-1 text-sm min-h-[72px]"
              placeholder="希望突出哪些服务、参考竞品页面等"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div>
            <label className="geo-label">联系方式</label>
            <input
              className="geo-input w-full mt-1 text-sm"
              placeholder="手机号或微信"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
        </div>
        <div className="geo-modal-foot flex justify-end gap-2">
          <button type="button" className="geo-btn-secondary text-sm" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="geo-btn-primary text-sm"
            disabled={submitting || brandName === '__all__'}
            onClick={() => void submit()}
          >
            {submitting ? '提交中…' : '提交需求'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { WEBSITE_PAGE_TYPES, WEBSITE_PHASE1_NOTE } from '../../../lib/website-order-flow';

export interface WebsiteLeadIntakeValues {
  pageType: string;
  referenceUrl: string;
  keywords: string;
  notes: string;
  contact: string;
}

interface Props {
  brandName: string;
  initialValues?: Partial<WebsiteLeadIntakeValues>;
  submitLabel?: string;
  onSuccess?: () => void;
}

export default function WebsiteLeadIntakeForm({
  brandName,
  initialValues,
  submitLabel = '提交需求',
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [referenceUrl, setReferenceUrl] = useState(initialValues?.referenceUrl ?? '');
  const [pageType, setPageType] = useState(initialValues?.pageType ?? WEBSITE_PAGE_TYPES[0]);
  const [keywords, setKeywords] = useState(initialValues?.keywords ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [contact, setContact] = useState(initialValues?.contact ?? '');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (brandName === '__all__' || !brandName.trim()) {
      toast('请先选择具体品牌', 'error');
      return;
    }
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
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: 'var(--neutral-text-03)' }}>
        {WEBSITE_PHASE1_NOTE}
      </p>

      <div>
        <label className="geo-label">官网 / 落地页链接</label>
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
        <label className="geo-label">目标关键词 *</label>
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
        <label className="geo-label">联系方式 *</label>
        <input
          className="geo-input w-full mt-1 text-sm"
          placeholder="手机号或微信"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="geo-btn-primary text-sm w-full sm:w-auto"
        disabled={submitting || brandName === '__all__'}
        onClick={() => void submit()}
      >
        {submitting ? '提交中…' : submitLabel}
      </button>
    </div>
  );
}

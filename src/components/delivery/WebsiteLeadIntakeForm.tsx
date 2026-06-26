import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { formatWebsiteLeadGoal } from '../../../lib/website-lead-intake';
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
  pageTypes?: readonly string[];
  introNote?: string;
  /** @deprecated 请改用 referenceUrlMode */
  requireReferenceUrl?: boolean;
  /** hidden=新建站点（无现成网址）；optional=可填参考链接；required=自有网站优化必填 */
  referenceUrlMode?: 'hidden' | 'optional' | 'required';
  onSuccess?: () => void;
}

export default function WebsiteLeadIntakeForm({
  brandName,
  initialValues,
  submitLabel = '提交需求',
  pageTypes = WEBSITE_PAGE_TYPES,
  introNote = WEBSITE_PHASE1_NOTE,
  requireReferenceUrl,
  referenceUrlMode,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const urlMode: 'hidden' | 'optional' | 'required' =
    referenceUrlMode ?? (requireReferenceUrl ? 'required' : 'hidden');
  const [referenceUrl, setReferenceUrl] = useState(initialValues?.referenceUrl ?? '');
  const [pageType, setPageType] = useState(initialValues?.pageType ?? pageTypes[0]);
  const [keywords, setKeywords] = useState(initialValues?.keywords ?? '');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [contact, setContact] = useState(initialValues?.contact ?? '');
  const [submitting, setSubmitting] = useState(false);

  const pageTypeLabel =
    urlMode === 'required' ? '想优化的页面类型' : '需要建设的页面类型';

  const referenceUrlField =
    urlMode === 'hidden' ? null : (
      <div>
        <label className="geo-label">
          {urlMode === 'required' ? '待优化页面链接 *' : '参考链接（可选）'}
        </label>
        <input
          className="geo-input w-full mt-1 text-sm"
          placeholder={
            urlMode === 'required'
              ? 'https://www.example.com/implant'
              : '竞品页面或风格参考，无则留空'
          }
          value={referenceUrl}
          onChange={(e) => setReferenceUrl(e.target.value)}
        />
        <p className="text-[10px] text-[var(--neutral-text-03)] mt-1">
          {urlMode === 'required'
            ? '填写官网或具体落地页 URL，便于工程师定位优化范围'
            : '可填写竞品或风格参考页，便于设计对齐预期'}
        </p>
      </div>
    );

  const pageTypeField = (
    <div>
      <label className="geo-label">{pageTypeLabel}</label>
      <select
        className="geo-input w-full mt-1 text-sm"
        value={pageType}
        onChange={(e) => setPageType(e.target.value)}
      >
        {pageTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );

  const submit = async () => {
    if (brandName === '__all__' || !brandName.trim()) {
      toast('请先选择具体品牌', 'error');
      return;
    }
    if (!keywords.trim()) {
      toast('请填写目标关键词', 'error');
      return;
    }
    if (urlMode === 'required' && !referenceUrl.trim()) {
      toast('请填写待优化页面链接', 'error');
      return;
    }
    if (!contact.trim()) {
      toast('请填写联系方式', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const trimmedKeywords = keywords.trim();
      const trimmedContact = contact.trim();
      const trimmedNotes = notes.trim();
      const res = await fetch('/api/website-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          pageType,
          goal: formatWebsiteLeadGoal({
            keywords: trimmedKeywords,
            notes: trimmedNotes,
            contact: trimmedContact,
          }),
          keywords: trimmedKeywords,
          contact: trimmedContact,
          notes: trimmedNotes || undefined,
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
      {introNote.trim() ? (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--neutral-text-03)' }}>
          {introNote}
        </p>
      ) : null}

      {urlMode === 'required' ? (
        <>
          {referenceUrlField}
          {pageTypeField}
        </>
      ) : (
        <>
          {pageTypeField}
          {referenceUrlField}
        </>
      )}

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

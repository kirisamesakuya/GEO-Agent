import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { DEFAULT_PROVIDER_ONBOARDING_OPTIONS } from '../../../../lib/provider-onboarding-defaults';
import {
  type ProviderCredibilityDraft,
  PROFILE_REVIEW_STATUS_LABEL,
  type ProviderProfileReviewStatus,
  credibilityDraftFromProvider,
  validateCredibilityDraft,
} from '../../../../lib/provider-profile-change';

interface OnboardingOptions {
  mediaPlatforms: string[];
  serviceRegions: string[];
}

interface Props {
  providerId: string;
  live: {
    name: string;
    type?: string | null;
    contactName?: string | null;
    phone?: string | null;
    platforms: string[];
    serviceAreas: string[];
    caseLinks: string[];
    budgetMin?: number | null;
    budgetMax?: number | null;
    pricingNote?: string | null;
  };
  profileReviewStatus: ProviderProfileReviewStatus;
  reviewNote?: string | null;
  pendingDraft: ProviderCredibilityDraft | null;
  onClose: () => void;
  onUpdated: () => void;
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export default function ProviderProfileEditor({
  providerId,
  live,
  profileReviewStatus,
  reviewNote,
  pendingDraft,
  onClose,
  onUpdated,
}: Props) {
  const { toast } = useToast();
  const [options, setOptions] = useState<OnboardingOptions>({
    mediaPlatforms: [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.mediaPlatforms],
    serviceRegions: [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.serviceRegions],
  });
  const [contactName, setContactName] = useState(live.contactName ?? '');
  const [phone, setPhone] = useState(live.phone ?? '');
  const [draft, setDraft] = useState<ProviderCredibilityDraft>(() =>
    pendingDraft ??
      credibilityDraftFromProvider({
        name: live.name,
        type: live.type,
        platforms: JSON.stringify(live.platforms),
        serviceAreas: JSON.stringify(live.serviceAreas),
        caseLinks: JSON.stringify(live.caseLinks),
        budgetMin: live.budgetMin,
        budgetMax: live.budgetMax,
        pricingNote: live.pricingNote,
      })
  );
  const [newCaseLink, setNewCaseLink] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const locked = profileReviewStatus === 'pending';

  useEffect(() => {
    fetch('/api/provider/onboarding-options')
      .then((r) => r.json())
      .then((d: OnboardingOptions) => {
        setOptions({
          mediaPlatforms: d.mediaPlatforms?.length
            ? d.mediaPlatforms
            : [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.mediaPlatforms],
          serviceRegions: d.serviceRegions?.length
            ? d.serviceRegions
            : [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.serviceRegions],
        });
      })
      .catch(() => {});
  }, []);

  const saveContact = async () => {
    if (!contactName.trim()) {
      toast('请填写联系人', 'error');
      return;
    }
    setSavingContact(true);
    try {
      const res = await fetch('/api/provider/profile/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, contactName: contactName.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast(data.error ?? '保存失败', 'error');
        return;
      }
      toast('联系方式已更新', 'success');
      onUpdated();
    } finally {
      setSavingContact(false);
    }
  };

  const saveDraft = async () => {
    const err = validateCredibilityDraft(draft);
    if (err) {
      toast(err, 'error');
      return;
    }
    setSavingDraft(true);
    try {
      const res = await fetch('/api/provider/profile/credibility-draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, providerId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast(data.error ?? '保存失败', 'error');
        return;
      }
      toast('变更草稿已保存', 'success');
      onUpdated();
    } finally {
      setSavingDraft(false);
    }
  };

  const submitReview = async () => {
    const err = validateCredibilityDraft(draft);
    if (err) {
      toast(err, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const putRes = await fetch('/api/provider/profile/credibility-draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, providerId }),
      });
      const putData = await putRes.json();
      if (!putRes.ok || putData.error) {
        toast(putData.error ?? '保存失败', 'error');
        return;
      }
      const res = await fetch('/api/provider/profile/credibility-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast(data.error ?? '提交失败', 'error');
        return;
      }
      toast('资料变更已提交审核', 'success');
      onUpdated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const withdrawReview = async () => {
    setWithdrawing(true);
    try {
      const res = await fetch('/api/provider/profile/credibility-withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast(data.error ?? '撤回失败', 'error');
        return;
      }
      toast('已撤回资料变更', 'info');
      onUpdated();
    } finally {
      setWithdrawing(false);
    }
  };

  const renderChips = (
    items: string[],
    selected: string[],
    onToggle: (v: string) => void
  ) => (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          disabled={locked}
          onClick={() => onToggle(item)}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
            selected.includes(item)
              ? 'provider-nav-active'
              : 'provider-nav-item border border-provider'
          } disabled:opacity-50`}
        >
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="flex items-center gap-1.5 text-sm text-provider-muted hover:text-brand"
        onClick={onClose}
      >
        <ArrowLeft className="w-4 h-4" />
        返回个人中心
      </button>

      <div>
        <h1 className="text-xl font-bold text-provider-title">编辑资料</h1>
        <p className="text-xs text-provider-muted mt-1">
          联系方式可即时生效；团队名称、媒体平台、案例与报价等公信力信息变更须提交平台审核后生效。
        </p>
      </div>

      {profileReviewStatus !== 'none' && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs ${
            profileReviewStatus === 'pending'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <p className="font-semibold">{PROFILE_REVIEW_STATUS_LABEL[profileReviewStatus]}</p>
          {profileReviewStatus === 'pending' && (
            <p className="mt-1">审核通过前，任务大厅与比价页仍展示原资料。</p>
          )}
          {reviewNote && <p className="mt-1">审核说明：{reviewNote}</p>}
          {profileReviewStatus === 'pending' && (
            <button
              type="button"
              className="provider-btn-secondary text-xs mt-3"
              disabled={withdrawing}
              onClick={() => void withdrawReview()}
            >
              {withdrawing ? '撤回中…' : '撤回变更申请'}
            </button>
          )}
        </div>
      )}

      <section className="provider-card rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-provider-title">联系方式</h2>
        <p className="text-xs text-provider-muted">仅用于平台沟通，修改后立即生效，无需审核</p>
        <label className="block text-xs">
          <span className="text-provider-secondary font-medium">联系人</span>
          <input
            className="provider-input w-full mt-1"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </label>
        <label className="block text-xs">
          <span className="text-provider-secondary font-medium">联系电话</span>
          <input
            className="provider-input w-full mt-1"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="provider-btn-secondary text-sm"
          disabled={savingContact}
          onClick={() => void saveContact()}
        >
          {savingContact ? '保存中…' : '保存联系方式'}
        </button>
      </section>

      <section className="provider-card rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-provider-title">基础资料（需审核）</h2>
        <label className="block text-xs">
          <span className="text-provider-secondary font-medium">团队/机构名称</span>
          <input
            className="provider-input w-full mt-1"
            value={draft.name}
            disabled={locked}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </label>
        <label className="block text-xs">
          <span className="text-provider-secondary font-medium">主体类型</span>
          <input
            className="provider-input w-full mt-1"
            value={draft.type}
            disabled={locked}
            onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
          />
        </label>
      </section>

      <section className="provider-card rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-provider-title">平台与地区（需审核）</h2>
        <div>
          <p className="text-xs text-provider-secondary mb-2">可接单媒体</p>
          {renderChips(options.mediaPlatforms, draft.platforms, (v) =>
            setDraft((d) => ({ ...d, platforms: toggle(d.platforms, v) }))
          )}
        </div>
        <div>
          <p className="text-xs text-provider-secondary mb-2">可接单地区</p>
          {renderChips(options.serviceRegions, draft.serviceAreas, (v) =>
            setDraft((d) => ({ ...d, serviceAreas: toggle(d.serviceAreas, v) }))
          )}
        </div>
      </section>

      <section className="provider-card rounded-2xl p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-provider-title">案例资源（需审核）</h2>
        {draft.caseLinks.length === 0 ? (
          <p className="text-xs text-provider-muted">暂无案例链接</p>
        ) : (
          <ul className="space-y-2">
            {draft.caseLinks.map((link) => (
              <li key={link} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate text-provider-body">{link}</span>
                {!locked && (
                  <button
                    type="button"
                    className="text-provider-muted hover:text-red-600"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        caseLinks: d.caseLinks.filter((x) => x !== link),
                      }))
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!locked && (
          <div className="flex gap-2">
            <input
              className="provider-input flex-1 text-xs"
              value={newCaseLink}
              onChange={(e) => setNewCaseLink(e.target.value)}
              placeholder="https://..."
            />
            <button
              type="button"
              className="provider-btn-secondary text-xs shrink-0 flex items-center gap-1"
              onClick={() => {
                const url = newCaseLink.trim();
                if (!url) return;
                setDraft((d) => ({ ...d, caseLinks: [...d.caseLinks, url] }));
                setNewCaseLink('');
              }}
            >
              <Plus className="w-3.5 h-3.5" /> 添加
            </button>
          </div>
        )}
      </section>

      <section className="provider-card rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-provider-title">报价规则（需审核）</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs">
            <span className="text-provider-secondary font-medium">最低单价（元）</span>
            <input
              type="number"
              className="provider-input w-full mt-1"
              disabled={locked}
              value={draft.budgetMin ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  budgetMin: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </label>
          <label className="block text-xs">
            <span className="text-provider-secondary font-medium">最高单价（元）</span>
            <input
              type="number"
              className="provider-input w-full mt-1"
              disabled={locked}
              value={draft.budgetMax ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  budgetMax: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </label>
        </div>
        <label className="block text-xs">
          <span className="text-provider-secondary font-medium">报价说明</span>
          <textarea
            className="provider-input w-full min-h-[80px] mt-1 text-sm"
            disabled={locked}
            value={draft.pricingNote ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, pricingNote: e.target.value }))}
            placeholder="如：含改稿 2 次、不含硬广植入等"
          />
        </label>
      </section>

      {!locked && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="provider-btn-secondary text-sm"
            disabled={savingDraft}
            onClick={() => void saveDraft()}
          >
            {savingDraft ? '保存中…' : '保存变更草稿'}
          </button>
          <button
            type="button"
            className="provider-btn-primary text-sm"
            disabled={submitting}
            onClick={() => void submitReview()}
          >
            {submitting ? '提交中…' : '提交审核'}
          </button>
        </div>
      )}
    </div>
  );
}

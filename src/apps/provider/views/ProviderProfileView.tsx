import { useState, useEffect, type FormEvent } from 'react';
import {
  User,
  Sparkles,
  PlayCircle,
  Wallet,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import ProviderOnboarding from '../ProviderOnboarding';
import {
  parseJsonArray,
  DEFAULT_AVATAR,
  APPLICATION_STATUS_LABEL,
  PAYOUT_CHANNEL_OPTIONS,
  payoutChannelLabel,
  type PayoutChannel,
} from '../lib/provider-ui';
import {
  applyMockProviderIdentity,
  applyMockProviderPayoutAccount,
  ensureDemoProviderMockStore,
  loadMockProviderIdentity,
  loadMockProviderPayoutAccount,
} from '../lib/provider-mock-payout';
import type { ProviderRecord } from '../types';

interface Props {
  provider: ProviderRecord;
  providerId: string;
  onProviderReady: (id: string) => void;
}

interface PayoutForm {
  payoutChannel: PayoutChannel;
  payoutAccountName: string;
  payoutAccountDetail: string;
}

interface IdentityState {
  verified: boolean;
  realName: string;
  idNumberMask: string;
}

type PayoutPanelStep = 'identity' | 'payout';

function parsePayoutDetail(channel: string, label: string | null | undefined): string {
  if (!label) return '';
  if (channel === 'alipay') return label.replace(/^支付宝\s*/, '');
  if (channel === 'wechat') return label.replace(/^微信\s*/, '');
  if (channel === 'bank') return label.replace(/^银行卡\s*/, '').replace(/^\S+\s+/, '');
  return label;
}

export default function ProviderProfileView({
  provider,
  providerId,
  onProviderReady,
}: Props) {
  const { toast } = useToast();
  const [demoOnboarding, setDemoOnboarding] = useState(false);
  const [payoutPanelOpen, setPayoutPanelOpen] = useState(false);
  const [payoutPanelStep, setPayoutPanelStep] = useState<PayoutPanelStep>('identity');
  const [identity, setIdentity] = useState<IdentityState>({
    verified: false,
    realName: '',
    idNumberMask: '',
  });
  const [identityForm, setIdentityForm] = useState({ realName: '', idNumber: '' });
  const [identitySaving, setIdentitySaving] = useState(false);
  const [industryTags, setIndustryTags] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [payoutSaved, setPayoutSaved] = useState<PayoutForm | null>(null);
  const [payoutForm, setPayoutForm] = useState<PayoutForm>({
    payoutChannel: 'bank',
    payoutAccountName: '',
    payoutAccountDetail: '',
  });
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [useMockPayout, setUseMockPayout] = useState(false);
  const approved = provider.applicationStatus === 'approved';
  const statusLabel =
    APPLICATION_STATUS_LABEL[provider.applicationStatus] ?? provider.applicationStatus;

  const loadProfile = () => {
    fetch(`/api/provider/profile?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.provider;
        if (!p) return;
        ensureDemoProviderMockStore(providerId, p.name ?? provider.name);
        setIndustryTags(parseJsonArray(p.industryTags));
        setPlatforms(parseJsonArray(p.platforms));
        const channel = (p.payoutChannel as PayoutChannel) || 'alipay';
        const mockIdentity = loadMockProviderIdentity(providerId);
        const mockPayout = loadMockProviderPayoutAccount(providerId);
        const identityVerified = Boolean(p.identityVerifiedAt) || Boolean(mockIdentity?.verified);
        const resolvedIdentity = identityVerified
          ? {
              verified: true,
              realName: p.identityRealName ?? mockIdentity?.realName ?? '',
              idNumberMask: p.identityIdNumberMask ?? mockIdentity?.idNumberMask ?? '',
            }
          : { verified: false, realName: '', idNumberMask: '' };
        setIdentity(resolvedIdentity);
        setUseMockPayout(Boolean(mockIdentity || mockPayout));

        const saved: PayoutForm = {
          payoutChannel: ['bank', 'alipay', 'wechat'].includes(channel) ? channel : 'bank',
          payoutAccountName:
            p.payoutAccountName ?? mockPayout?.payoutAccountName ?? p.identityRealName ?? '',
          payoutAccountDetail:
            parsePayoutDetail(channel, p.payoutAccountLabel) || mockPayout?.payoutAccountDetail || '',
        };
        const hasPayout = Boolean(p.payoutAccountLabel) || Boolean(mockPayout?.payoutAccountLabel);
        if (mockPayout) {
          saved.payoutChannel = mockPayout.payoutChannel;
          saved.payoutAccountName = mockPayout.payoutAccountName;
          saved.payoutAccountDetail = mockPayout.payoutAccountDetail;
        }
        setPayoutSaved(hasPayout ? saved : null);
        setPayoutForm(saved);
        setIdentityForm({
          realName: resolvedIdentity.realName,
          idNumber: '',
        });
        if (!identityVerified) setPayoutPanelStep('identity');
        else if (!hasPayout) setPayoutPanelStep('payout');
      })
      .catch(() => {
        const mockIdentity = loadMockProviderIdentity(providerId);
        const mockPayout = loadMockProviderPayoutAccount(providerId);
        if (mockIdentity) {
          setIdentity(mockIdentity);
          setUseMockPayout(true);
          setPayoutForm((f) => ({ ...f, payoutAccountName: mockIdentity.realName }));
        }
        if (mockPayout) {
          setPayoutSaved({
            payoutChannel: mockPayout.payoutChannel,
            payoutAccountName: mockPayout.payoutAccountName,
            payoutAccountDetail: mockPayout.payoutAccountDetail,
          });
          setPayoutForm({
            payoutChannel: mockPayout.payoutChannel,
            payoutAccountName: mockPayout.payoutAccountName,
            payoutAccountDetail: mockPayout.payoutAccountDetail,
          });
          setUseMockPayout(true);
        }
      });
  };

  const completeMockIdentity = () => {
    const result = applyMockProviderIdentity(providerId, identityForm);
    if (!result.ok) {
      toast(result.error, 'error');
      return false;
    }
    setUseMockPayout(true);
    setIdentity(result.identity);
    setPayoutForm((f) => ({ ...f, payoutAccountName: result.identity.realName }));
    setIdentityForm((f) => ({ ...f, idNumber: '' }));
    setPayoutPanelStep('payout');
    toast('演示：已通过 Mock 实名认证', 'success');
    return true;
  };

  const openPayoutPanel = () => {
    setPayoutPanelStep(identity.verified ? 'payout' : 'identity');
    setPayoutPanelOpen(true);
  };

  useEffect(() => {
    loadProfile();
  }, [providerId]);

  const buildPayoutLabel = (form: PayoutForm) => {
    if (form.payoutChannel === 'bank') {
      return `银行卡 ${form.payoutAccountDetail.trim()}`;
    }
    if (form.payoutChannel === 'alipay') {
      return `支付宝 ${form.payoutAccountDetail.trim()}`;
    }
    return `微信 ${form.payoutAccountDetail.trim()}`;
  };

  const payoutSummary = payoutSaved
    ? `${payoutChannelLabel(payoutSaved.payoutChannel)} · ${payoutSaved.payoutAccountName} · ${buildPayoutLabel(payoutSaved).replace(/^(银行卡|支付宝|微信)\s/, '')}`
    : identity.verified
      ? '已实名，请绑定收款账户'
      : '未绑定，需先完成身份证实名认证';

  const handleVerifyIdentity = async (e: FormEvent) => {
    e.preventDefault();
    if (!identityForm.realName.trim()) {
      toast('请填写真实姓名', 'error');
      return;
    }
    if (!identityForm.idNumber.trim()) {
      toast('请填写身份证号码', 'error');
      return;
    }
    setIdentitySaving(true);
    try {
      const res = await fetch('/api/provider/identity-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          realName: identityForm.realName.trim(),
          idNumber: identityForm.idNumber.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        completeMockIdentity();
        return;
      }
      toast('实名认证已通过', 'success');
      setIdentity({
        verified: true,
        realName: data.provider.identityRealName ?? identityForm.realName.trim(),
        idNumberMask: data.provider.identityIdNumberMask ?? '',
      });
      setPayoutForm((f) => ({
        ...f,
        payoutAccountName: data.provider.identityRealName ?? identityForm.realName.trim(),
      }));
      setIdentityForm((f) => ({ ...f, idNumber: '' }));
      setPayoutPanelStep('payout');
    } catch {
      completeMockIdentity();
    } finally {
      setIdentitySaving(false);
    }
  };

  const handleMockVerifyIdentity = () => {
    setIdentitySaving(true);
    completeMockIdentity();
    setIdentitySaving(false);
  };

  const handleSavePayout = async (e: FormEvent) => {
    e.preventDefault();
    if (!payoutForm.payoutAccountName.trim()) {
      toast('请填写账户实名', 'error');
      return;
    }
    if (!payoutForm.payoutAccountDetail.trim()) {
      toast('请填写账户信息', 'error');
      return;
    }
    const accountLabel = buildPayoutLabel(payoutForm);
    setPayoutSaving(true);
    try {
      const res = await fetch('/api/provider/payout-account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          payoutChannel: payoutForm.payoutChannel,
          payoutAccountName: payoutForm.payoutAccountName.trim(),
          payoutAccountLabel: accountLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (!identity.verified && !useMockPayout) {
          toast(data.error ?? '保存失败', 'error');
          return;
        }
        applyMockProviderPayoutAccount(providerId, {
          payoutChannel: payoutForm.payoutChannel,
          payoutAccountName: payoutForm.payoutAccountName.trim(),
          payoutAccountDetail: payoutForm.payoutAccountDetail.trim(),
          payoutAccountLabel: accountLabel,
        });
        setUseMockPayout(true);
        toast('演示：提现账户已保存（Mock）', 'success');
        setPayoutSaved({ ...payoutForm });
        setPayoutPanelOpen(false);
        return;
      }
      toast('提现账户已保存', 'success');
      setPayoutSaved({ ...payoutForm });
      setPayoutPanelOpen(false);
    } catch {
      if (identity.verified || useMockPayout) {
        applyMockProviderPayoutAccount(providerId, {
          payoutChannel: payoutForm.payoutChannel,
          payoutAccountName: payoutForm.payoutAccountName.trim(),
          payoutAccountDetail: payoutForm.payoutAccountDetail.trim(),
          payoutAccountLabel: accountLabel,
        });
        setUseMockPayout(true);
        toast('演示：提现账户已保存（Mock）', 'success');
        setPayoutSaved({ ...payoutForm });
        setPayoutPanelOpen(false);
      } else {
        toast('保存失败，请稍后重试', 'error');
      }
    } finally {
      setPayoutSaving(false);
    }
  };

  if (demoOnboarding) {
    return (
      <ProviderOnboarding
        providerId={providerId}
        onProviderReady={onProviderReady}
        demoMode
        onExitDemo={() => setDemoOnboarding(false)}
      />
    );
  }

  const payoutDetailPlaceholder = '支付宝登录手机号或邮箱，如 13812348888';

  if (payoutPanelOpen && approved) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-provider-muted hover:text-brand transition-colors"
          onClick={() => setPayoutPanelOpen(false)}
        >
          <ArrowLeft className="w-4 h-4" />
          返回个人中心
        </button>

        <div>
          <h1 className="text-xl font-bold text-provider-title">
            {payoutPanelStep === 'identity' ? '身份证实名认证' : '提现账户'}
          </h1>
          <p className="text-xs text-provider-muted mt-1">
            {payoutPanelStep === 'identity'
              ? '绑定提现账户前需完成基础身份证实名认证。'
              : '当前仅支持支付宝收款；平台审核通过后将线下打款至以下账户，账户实名须与身份证一致。'}
          </p>
        </div>

        {useMockPayout && (
          <p className="text-xs rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 max-w-lg">
            当前为演示 Mock 数据（本地保存），未写入服务端；可继续完成绑定提现账户流程。
          </p>
        )}

        {payoutPanelStep === 'identity' ? (
          <div className="provider-card rounded-2xl p-6 shadow-sm max-w-lg">
            <form onSubmit={handleVerifyIdentity} className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-brand-light/40 border border-brand-light p-3 text-xs text-provider-body">
                <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <p>仅用于提现风控与账户校验。API 不可用时可使用下方 Mock 跳过并完成后续绑定。</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-provider-body mb-1.5">真实姓名</label>
                <input
                  type="text"
                  value={identityForm.realName}
                  onChange={(e) => setIdentityForm((f) => ({ ...f, realName: e.target.value }))}
                  placeholder="与身份证一致的姓名"
                  className="w-full p-2.5 border border-provider rounded-xl text-xs outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-provider-body mb-1.5">身份证号码</label>
                <input
                  type="text"
                  value={identityForm.idNumber}
                  onChange={(e) => setIdentityForm((f) => ({ ...f, idNumber: e.target.value }))}
                  placeholder="18 位身份证号码"
                  className="w-full p-2.5 border border-provider rounded-xl text-xs outline-none focus:border-brand"
                  maxLength={18}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  className="provider-btn-secondary text-sm flex-1"
                  onClick={() => setPayoutPanelOpen(false)}
                >
                  取消
                </button>
                <button type="submit" disabled={identitySaving} className="provider-btn-primary text-sm flex-1">
                  {identitySaving ? '认证中…' : '提交认证'}
                </button>
              </div>
              <button
                type="button"
                disabled={identitySaving}
                onClick={handleMockVerifyIdentity}
                className="w-full text-xs text-brand font-medium hover:underline disabled:opacity-50"
              >
                演示：Mock 跳过 API，进入绑定提现账户
              </button>
            </form>
          </div>
        ) : (
        <div className="provider-card rounded-2xl p-6 shadow-sm max-w-lg">
          {identity.verified && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              已实名：{identity.realName}
              {identity.idNumberMask ? ` · ${identity.idNumberMask}` : ''}
            </div>
          )}
          <form onSubmit={handleSavePayout} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-provider-body mb-1.5">提现渠道</label>
              <div className="relative">
                <select
                  value={payoutForm.payoutChannel}
                  onChange={(e) =>
                    setPayoutForm((f) => ({
                      ...f,
                      payoutChannel: e.target.value as PayoutChannel,
                    }))
                  }
                  className="w-full p-2.5 border border-provider rounded-xl text-xs outline-none focus:border-brand bg-white appearance-none pr-8"
                >
                  {PAYOUT_CHANNEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-provider-muted pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-provider-body mb-1.5">账户实名</label>
              <input
                type="text"
                value={payoutForm.payoutAccountName}
                readOnly={identity.verified}
                onChange={(e) =>
                  setPayoutForm((f) => ({ ...f, payoutAccountName: e.target.value }))
                }
                placeholder="与银行卡/支付宝/微信实名一致"
                className="w-full p-2.5 border border-provider rounded-xl text-xs outline-none focus:border-brand disabled:bg-provider-hover"
              />
              {identity.verified && (
                <p className="text-[10px] text-provider-muted mt-1.5">已与身份证实名绑定，不可修改</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-provider-body mb-1.5">账户信息</label>
              <input
                type="text"
                value={payoutForm.payoutAccountDetail}
                onChange={(e) =>
                  setPayoutForm((f) => ({ ...f, payoutAccountDetail: e.target.value }))
                }
                placeholder={payoutDetailPlaceholder}
                className="w-full p-2.5 border border-provider rounded-xl text-xs outline-none focus:border-brand"
              />
              <p className="text-[10px] text-provider-muted mt-1.5">
                填写支付宝登录手机号或邮箱，财务将据此线下转账。
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                className="provider-btn-secondary text-sm flex-1"
                onClick={() => setPayoutPanelOpen(false)}
              >
                取消
              </button>
              <button type="submit" disabled={payoutSaving} className="provider-btn-primary text-sm flex-1">
                {payoutSaving ? '保存中…' : payoutSaved ? '更新账户' : '保存账户'}
              </button>
            </div>
          </form>
        </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-provider-title">个人中心</h1>
        <p className="text-xs text-provider-muted">
          {approved ? '管理账号资料、提现账户与接单偏好' : '选择媒体与接单地区，完成入驻审核后可接单'}
        </p>
      </div>

      <div className="provider-card rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6">
          <img src={DEFAULT_AVATAR} alt="" className="w-20 h-20 rounded-2xl border border-provider object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-provider-title flex items-center gap-2">
              <User className="w-5 h-5 text-brand" />
              {provider.name}
            </h2>
            {approved ? (
              <p className="text-xs text-provider-muted mt-1">
                入驻状态：<span className="text-green-600 font-medium">已通过</span>
              </p>
            ) : (
              <p className="text-xs text-provider-muted mt-1">
                入驻状态：<span className="text-brand font-medium">{statusLabel}</span>
                <span className="text-provider-muted mx-1">·</span>
                请在下方完成资料并提交审核
              </p>
            )}
          </div>
        </div>

        {approved && (
          <button
            type="button"
            className="mt-5 w-full flex items-center justify-between gap-3 rounded-xl border border-provider px-4 py-3 text-left hover:border-brand hover:bg-brand-light/20 transition-colors"
            onClick={openPayoutPanel}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-brand" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-provider-title">提现账户</p>
                <p className={`text-xs mt-0.5 truncate ${payoutSaved ? 'text-provider-body' : 'text-amber-700'}`}>
                  {payoutSummary}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-provider-muted shrink-0" />
          </button>
        )}
      </div>

      {!approved && (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-provider-title">入驻审核进度</h2>
            <p className="text-xs text-provider-muted mt-0.5">填写资料、提交审核并等待平台确认</p>
          </div>
          <ProviderOnboarding
            providerId={providerId}
            onProviderReady={onProviderReady}
            embedded
          />
        </section>
      )}

      <div className="provider-card rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-provider-title flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-brand" /> 内容偏好
        </h3>
        <div className="flex flex-wrap gap-2">
          {[...industryTags, ...platforms].length === 0 ? (
            <p className="text-xs text-provider-muted">入驻所选媒体与地区将用于任务匹配</p>
          ) : (
            [...new Set([...industryTags, ...platforms])].map((tag) => (
              <span key={tag} className="text-xs px-3 py-1.5 rounded-lg bg-brand-light text-brand font-medium">
                {tag}
              </span>
            ))
          )}
        </div>
      </div>

      {approved && (
        <div className="bg-brand-light/30 border border-brand-light rounded-2xl p-4 text-sm text-provider-body">
          您已通过平台入驻审核，可在任务大厅直接领取合作任务。
          {!identity.verified
            ? ' 提现前请先完成身份证实名认证并绑定收款账户。'
            : !payoutSaved
              ? ' 请绑定收款账户后再申请提现。'
              : ''}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-dashed border-provider-subtle p-5 shadow-sm">
        <h3 className="text-sm font-bold text-provider-title mb-1">演示与体验</h3>
        <p className="text-xs text-provider-muted mb-4">
          在不改动真实入驻状态的前提下，完整体验资料填写、提交审核与审核结果各阶段。
        </p>
        <button
          type="button"
          className="provider-btn-secondary text-sm flex items-center gap-2"
          onClick={() => setDemoOnboarding(true)}
        >
          <PlayCircle className="w-4 h-4 text-brand" />
          体验入驻流程
        </button>
      </div>
    </div>
  );
}

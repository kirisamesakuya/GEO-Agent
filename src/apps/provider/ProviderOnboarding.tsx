import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Sparkles,
  PenLine,
  Building2,
  Users,
  ArrowRight,
  Target,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { DEFAULT_PROVIDER_ONBOARDING_OPTIONS } from '../../../lib/provider-onboarding-defaults';
import {
  MARKETPLACE_PLATFORM_FEE_RATE,
  PROVIDER_AGREEMENT_VERSION,
  PROVIDER_COOPERATION_AGREEMENT,
  PROVIDER_PRIVACY_AGREEMENT,
  PROVIDER_USER_AGREEMENT,
} from '../../../lib/marketplace-agreements';
import {
  PROVIDER_ONBOARDING_AGREEMENT_LABEL,
  PROVIDER_ONBOARDING_REGISTRATION_ACK,
  PROVIDER_PRIVACY_TITLE,
  PROVIDER_USER_AGREEMENT_TITLE,
  PROVIDER_FEE_EXAMPLE,
  PROVIDER_NO_GUARANTEE_HINT,
} from '../../../lib/platform-legal-copy';
import { PROVIDER_APP_NAME } from '../../lib/app-branding';
import { useToast } from '../../context/ToastContext';
import MarketplaceAgreementModal from '../../components/common/MarketplaceAgreementModal';
import ProviderLogo from '../../components/common/ProviderLogo';
interface Provider {
  id: string;
  name: string;
  applicationStatus: string;
  reviewNote?: string | null;
  platforms?: string | null;
  serviceAreas?: string | null;
  contactName?: string | null;
  phone?: string | null;
  caseLinks?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  pricingNote?: string | null;
}

interface ApplicationVersion {
  id: string;
  version: number;
  status: string;
  reviewNote?: string | null;
  createdAt: string;
}

interface OnboardingOptions {
  mediaPlatforms: string[];
  serviceRegions: string[];
}

interface Props {
  providerId: string | null;
  onProviderReady: (id: string) => void;
  embedded?: boolean;
  demoMode?: boolean;
  onExitDemo?: () => void;
}

const DEMO_PLATFORMS = ['小红书', '知乎'];
const DEMO_REGIONS = ['南京', '苏州'];

const MACRO_STEPS = [
  { id: 0, title: '填写资料' },
  { id: 1, title: '提交审核' },
  { id: 2, title: '审核结果' },
] as const;

const WIZARD_STEPS = [
  { id: 0, title: '基础资料' },
  { id: 1, title: '平台地区' },
  { id: 2, title: '案例资源' },
  { id: 3, title: '报价规则' },
  { id: 4, title: '协议确认' },
] as const;

type OnboardingPhase = 'welcome' | 'identity' | 'form';

const IDENTITY_OPTIONS = [
  {
    id: '达人',
    title: '达人 / KOL',
    desc: '拥有社媒账号，可接单发布种草、测评、探店等内容',
    icon: Sparkles,
  },
  {
    id: '内容写手',
    title: '内容写手',
    desc: '擅长撰稿与 SEO 内容，可接稿件类与品牌介绍任务',
    icon: PenLine,
  },
  {
    id: '媒体机构',
    title: '媒体 / 机构',
    desc: '具备官方媒体或垂类账号，可接权威发布与行业媒体任务',
    icon: Building2,
  },
  {
    id: 'MCN',
    title: 'MCN / 服务商',
    desc: '统一管理多位创作者或媒体资源，可批量承接撮合任务',
    icon: Users,
  },
] as const;

const ONBOARDING_VALUE_PROPS = [
  { icon: Target, label: '智能匹配', desc: '按平台与地区推荐任务' },
  { icon: Wallet, label: 'P0 报价', desc: '填写到手价，系统自动算 G/F' },
  { icon: ShieldCheck, label: '平台撮合', desc: '验收通过后结算到账' },
  { icon: Sparkles, label: '品牌合作', desc: '对接 GEO 投放品牌方' },
] as const;
const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  submitted: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  suspended: '已暂停',
  withdrawn: '已撤回',
};

function macroStepIndex(status: string): number {
  if (status === 'submitted') return 1;
  if (status === 'approved') return 2;
  return 0;
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export default function ProviderOnboarding({
  providerId,
  onProviderReady,
  embedded = false,
  demoMode = false,
  onExitDemo,
}: Props) {
  const { toast } = useToast();
  const [options, setOptions] = useState<OnboardingOptions>({
    mediaPlatforms: [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.mediaPlatforms],
    serviceRegions: [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.serviceRegions],
  });
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [caseLinksText, setCaseLinksText] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [pricingNote, setPricingNote] = useState('');
  const [providerType, setProviderType] = useState('达人');
  const [phase, setPhase] = useState<OnboardingPhase>(() => (embedded ? 'form' : 'welcome'));
  const [wizardStep, setWizardStep] = useState(0);  const [status, setStatus] = useState('draft');
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [registrationAgreed, setRegistrationAgreed] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState<'user' | 'privacy' | 'cooperation' | null>(null);
  const [versions, setVersions] = useState<ApplicationVersion[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/provider/onboarding-options')
      .then((r) => {
        if (!r.ok) throw new Error('load failed');
        return r.json();
      })
      .then((d: OnboardingOptions) => {
        setOptions({
          mediaPlatforms:
            d.mediaPlatforms?.length
              ? d.mediaPlatforms
              : [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.mediaPlatforms],
          serviceRegions:
            d.serviceRegions?.length
              ? d.serviceRegions
              : [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.serviceRegions],
        });
      })
      .catch(() => {
        setOptions({
          mediaPlatforms: [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.mediaPlatforms],
          serviceRegions: [...DEFAULT_PROVIDER_ONBOARDING_OPTIONS.serviceRegions],
        });
      });
  }, []);

  const loadVersions = useCallback(() => {
    if (!providerId) return;
    fetch(`/api/provider/applications?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => setVersions(d.applications ?? []));
  }, [providerId]);

  useEffect(() => {
    if (!demoMode) return;
    setStatus('draft');
    setReviewNote('演示：请补充可接单地区。');
    setAgreed(false);
    setRegistrationAgreed(false);
    setPlatforms(DEMO_PLATFORMS);
    setServiceAreas(DEMO_REGIONS);
  }, [demoMode]);

  useEffect(() => {
    if (demoMode || !providerId) return;
    fetch(`/api/provider/profile?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.provider as Provider;
        if (!p) return;
        setStatus(p.applicationStatus);
        setReviewNote(p.reviewNote ?? '');
        setProviderType(p.type ?? '达人');
        setPlatforms(parseJsonArray(p.platforms));        setServiceAreas(parseJsonArray(p.serviceAreas));
        setDisplayName(p.name ?? '');
        setContactName(p.contactName ?? '');
        setPhone(p.phone ?? '');
        setCaseLinksText(parseJsonArray(p.caseLinks).join('\n'));
        setBudgetMin(p.budgetMin != null ? String(p.budgetMin) : '');
        setBudgetMax(p.budgetMax != null ? String(p.budgetMax) : '');
        setPricingNote(p.pricingNote ?? '');
        const hasProgress =
          Boolean(p.name?.trim()) ||
          parseJsonArray(p.platforms).length > 0 ||
          parseJsonArray(p.serviceAreas).length > 0;
        if (embedded && !hasProgress && p.applicationStatus === 'draft') {
          setPhase('identity');
        } else if (embedded || hasProgress) {
          setPhase('form');
        }
      });    loadVersions();
  }, [providerId, loadVersions, demoMode]);

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((x) => x !== platform) : [...prev, platform]
    );
  };

  const toggleRegion = (region: string) => {
    setServiceAreas((prev) =>
      prev.includes(region) ? prev.filter((x) => x !== region) : [...prev, region]
    );
  };

  const checks = {
    basic: Boolean(displayName.trim() && contactName.trim()),
    media: platforms.length > 0,
    regions: serviceAreas.length > 0,
  };
  const allChecksPass = checks.basic && checks.media && checks.regions;
  const canEdit = status !== 'submitted' && status !== 'approved';
  const macroStep = macroStepIndex(status);

  const buildPayload = () => ({
    name: displayName.trim() || '新媒体接单方',
    type: providerType,    contactName: contactName.trim(),
    phone: phone.trim() || undefined,
    platforms,
    serviceAreas,
    serviceTypes: platforms,
    capabilities: platforms,
    industryTags: [],
    caseLinks: caseLinksText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    budgetMin: budgetMin ? Number(budgetMin) : undefined,
    budgetMax: budgetMax ? Number(budgetMax) : undefined,
    pricingNote: pricingNote.trim() || undefined,
  });

  const save = async (silent = false) => {
    if (demoMode) {
      setLastSavedAt(new Date().toLocaleTimeString('zh-CN'));
      if (!silent) toast('演示：已本地保存', 'success');
      return;
    }
    if (!providerId && !registrationAgreed) {
      if (!silent) toast('请先阅读并同意用户服务协议和隐私政策', 'error');
      return;
    }
    if (status === 'submitted' || status === 'approved') return;
    setSaving(true);
    const res = await fetch('/api/provider/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, ...buildPayload() }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      if (!silent) toast(data.error, 'error');
      return;
    }
    if (data.provider) {
      onProviderReady(data.provider.id);
      setLastSavedAt(new Date().toLocaleTimeString('zh-CN'));
      loadVersions();
      if (!silent) toast('已保存', 'success');
    }
  };

  useEffect(() => {
    if (demoMode || status === 'submitted' || status === 'approved') return;
    if (!platforms.length && !serviceAreas.length) return;
    if (!providerId && !registrationAgreed) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => void save(true), 8000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [platforms, serviceAreas, displayName, contactName, phone, caseLinksText, budgetMin, budgetMax, pricingNote, status, demoMode, providerId, registrationAgreed]);

  const submit = async () => {
    if (!providerId && !registrationAgreed) {
      toast('请先阅读并同意用户服务协议和隐私政策', 'error');
      return;
    }
    if (!agreed) {
      toast(`请先阅读并同意${PROVIDER_ONBOARDING_AGREEMENT_LABEL}`, 'error');
      return;
    }
    if (!allChecksPass) {
      toast('请完成基础资料、媒体平台与接单地区', 'error');
      return;
    }
    if (wizardStep < WIZARD_STEPS.length - 1) {
      toast('请完成全部入驻步骤后再提交', 'error');
      return;
    }
    if (demoMode) {
      setStatus('submitted');
      toast('演示：已模拟提交审核', 'success');
      return;
    }
    if (!providerId) {
      await save();
      return;
    }
    await save(true);
    const res = await fetch('/api/provider/applications/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, agreementVersion: PROVIDER_AGREEMENT_VERSION }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    setStatus('submitted');
    loadVersions();
    toast('入驻申请已提交，等待平台审核', 'success');
  };

  const withdraw = async () => {
    if (demoMode) {
      setStatus('draft');
      setAgreed(false);
    setRegistrationAgreed(false);
      toast('演示：已回到资料填写', 'info');
      return;
    }
    if (!providerId) return;
    const res = await fetch('/api/provider/applications/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    setStatus('draft');
    setAgreed(false);
    setRegistrationAgreed(false);
    loadVersions();
    toast('已撤回申请，可继续编辑', 'info');
  };

  const renderDemoBanner = () => {
    if (!demoMode) return null;
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <p className="text-sm font-bold text-amber-900">演示模式</p>
            <p className="text-xs text-amber-800/80 mt-0.5">仅用于体验入驻流程，不会保存到服务器</p>
          </div>
          {onExitDemo && (
            <button type="button" className="provider-btn-secondary text-xs shrink-0" onClick={onExitDemo}>
              退出演示
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { st: 'draft', label: '选择媒体与地区' },
              { st: 'submitted', label: '审核中' },
              { st: 'approved', label: '已通过' },
              { st: 'rejected', label: '已驳回' },
            ] as const
          ).map(({ st, label }) => (
            <button
              key={st}
              type="button"
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border ${
                status === st
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100/50'
              }`}
              onClick={() => setStatus(st)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderWelcome = () => (
    <div className="provider-onboarding-shell space-y-6">
      <div className="provider-onboarding-hero">
        <ProviderLogo size={56} className="mx-auto mb-4" />
        <p className="text-[11px] font-semibold text-brand tracking-wide uppercase">欢迎入驻</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-provider-title mt-2">
          加入 {PROVIDER_APP_NAME}
        </h1>
        <p className="text-sm text-provider-secondary mt-3 max-w-md mx-auto leading-relaxed">
          开通接单资格，获取品牌 GEO 投放合作机会。平台负责撮合、验收与结算，您专注内容与交付。
        </p>
        <div className="provider-onboarding-value-grid">
          {ONBOARDING_VALUE_PROPS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="provider-onboarding-value-item">
              <Icon className="w-5 h-5 text-brand mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-provider-title">{label}</p>
              <p className="text-[10px] text-provider-muted mt-0.5 leading-snug">{desc}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="provider-btn-primary mt-8 px-8 py-3 text-sm inline-flex items-center gap-2"
          onClick={() => setPhase('identity')}
        >
          立即开始入驻
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-[11px] text-provider-muted mt-4">
          预计 5 分钟完成资料 · 审核约 1 个工作日
        </p>
      </div>
    </div>
  );

  const renderIdentity = () => (
    <div className="provider-onboarding-shell space-y-6">
      <div className="text-center">
        <p className="text-[11px] font-semibold text-brand">步骤 1 / 2</p>
        <h1 className="text-xl sm:text-2xl font-bold text-provider-title mt-2">选择您的入驻身份</h1>
        <p className="text-sm text-provider-secondary mt-2 max-w-lg mx-auto">
          不同身份对应不同的任务匹配与展示方式，请选择最符合您实际情况的一项
        </p>
      </div>
      <div className="provider-onboarding-identity-grid">
        {IDENTITY_OPTIONS.map(({ id, title, desc, icon: Icon }) => {
          const selected = providerType === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setProviderType(id)}
              className={`provider-onboarding-identity-card ${
                selected ? 'provider-onboarding-identity-card--selected' : ''
              }`}
            >
              <div className="provider-onboarding-identity-icon">
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-provider-title">{title}</p>
                <p className="text-xs text-provider-secondary mt-1 leading-relaxed">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between gap-3 pt-2">
        {!embedded && (
          <button type="button" className="provider-btn-secondary text-sm px-4" onClick={() => setPhase('welcome')}>
            返回
          </button>
        )}
        <button
          type="button"
          className="provider-btn-primary text-sm px-6 ml-auto inline-flex items-center gap-1.5"
          onClick={() => setPhase('form')}
        >
          下一步：填写资料
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderWizardStepper = () => (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto pb-2">
      {WIZARD_STEPS.map((s, i) => {
        const active = wizardStep === s.id;
        const done = wizardStep > s.id;
        return (
          <div key={s.id} className="flex items-center shrink-0">
            <div className="flex flex-col items-center min-w-[72px] sm:min-w-[88px]">
              <div
                className={`provider-onboarding-step-dot ${
                  active ? 'provider-onboarding-step-dot--active' : done ? 'provider-onboarding-step-dot--done' : ''
                }`}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.id + 1}
              </div>
              <span className={`text-[10px] sm:text-xs mt-1.5 font-medium text-center ${active ? 'text-brand' : 'text-provider-muted'}`}>
                {s.title}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={`provider-onboarding-step-line ${done || active ? 'provider-onboarding-step-line--active' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
  const canWizardNext = () => {
    if (wizardStep === 0) return checks.basic;
    if (wizardStep === 1) return checks.media && checks.regions;
    return true;
  };

  const renderWizardStepContent = () => {
    if (wizardStep === 0) {
      return (
        <section className="provider-section-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-provider-title">基础资料</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-light text-brand font-medium">
              身份：{providerType}
            </span>
          </div>
          <p className="text-xs text-provider-muted">填写对外展示名称与联系人，便于平台审核与撮合沟通</p>
          <label className="block text-xs">
            <span className="text-provider-secondary font-medium">团队/机构名称</span>
            <input
              className="provider-input-field w-full mt-1"              value={displayName}
              disabled={!canEdit}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="如：晨光传媒工作室"
            />
          </label>
          <label className="block text-xs">
            <span className="text-provider-secondary font-medium">联系人</span>
            <input
              className="provider-input-field w-full mt-1"
              value={contactName}
              disabled={!canEdit}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="真实姓名或昵称"
            />
          </label>
          <label className="block text-xs">
            <span className="text-provider-secondary font-medium">联系电话（选填）</span>
            <input
              className="provider-input-field w-full mt-1"
              value={phone}
              disabled={!canEdit}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="便于平台联系"
            />
          </label>
        </section>
      );
    }
    if (wizardStep === 1) {
      return (
        <>
          <section className="provider-section-card">
            <h2 className="text-sm font-bold text-provider-title mb-1">媒体平台</h2>
            <p className="text-xs text-provider-muted mb-4">平台名单由后台维护，请选择您可接单的内容渠道</p>
            {renderChipGroup(options.mediaPlatforms, platforms, togglePlatform)}
          </section>
          <section className="provider-section-card">
            <h2 className="text-sm font-bold text-provider-title mb-1">接单地区</h2>
            <p className="text-xs text-provider-muted mb-4">地区名单由后台维护，可多选</p>
            {renderChipGroup(options.serviceRegions, serviceAreas, toggleRegion)}
          </section>
        </>
      );
    }
    if (wizardStep === 2) {
      return (
        <section className="provider-section-card space-y-3">
          <h2 className="text-sm font-bold text-provider-title">案例资源</h2>
          <p className="text-xs text-provider-muted">每行填写一个可公开访问的案例链接，发布方比价时可查看</p>
          <textarea
            className="provider-input-field w-full min-h-[140px] text-sm"
            value={caseLinksText}
            disabled={!canEdit}
            onChange={(e) => setCaseLinksText(e.target.value)}
            placeholder={'https://...\nhttps://...'}
          />
        </section>
      );
    }
    if (wizardStep === 3) {
      return (
        <section className="provider-section-card space-y-4">
          <h2 className="text-sm font-bold text-provider-title">报价规则</h2>
          <p className="text-xs text-provider-muted">说明您的常接单价区间与报价习惯，便于平台撮合（选填）</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs">
              <span className="text-provider-secondary font-medium">最低单价（元）</span>
              <input
                type="number"
                className="provider-input-field w-full mt-1"
                value={budgetMin}
                disabled={!canEdit}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="1000"
              />
            </label>
            <label className="block text-xs">
              <span className="text-provider-secondary font-medium">最高单价（元）</span>
              <input
                type="number"
                className="provider-input-field w-full mt-1"
                value={budgetMax}
                disabled={!canEdit}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="20000"
              />
            </label>
          </div>
          <label className="block text-xs">
            <span className="text-provider-secondary font-medium">报价说明</span>
            <textarea
              className="provider-input-field w-full min-h-[80px] mt-1 text-sm"
              value={pricingNote}
              disabled={!canEdit}
              onChange={(e) => setPricingNote(e.target.value)}
              placeholder="如：含改稿 2 次、不含硬广植入等"
            />
          </label>
        </section>
      );
    }
    return (
      <section className="provider-section-card space-y-3">
        <h2 className="text-sm font-bold text-provider-title">资料核对</h2>
        <p className="text-xs text-provider-muted">确认以下信息无误后，在右侧勾选协议并提交审核</p>
        <div className="text-xs space-y-2 text-provider-secondary">
          <p>身份：{providerType} · 名称：{displayName || '—'} · 联系人：{contactName || '—'}</p>
          <p>媒体：{platforms.join('、') || '—'}</p>
          <p>地区：{serviceAreas.join('、') || '—'}</p>
          <p>案例：{caseLinksText.split('\n').filter(Boolean).length} 条</p>
        </div>
      </section>
    );
  };

  const renderStepper = () => (
    <div className="flex items-center justify-center gap-0 mb-8">
      {MACRO_STEPS.map((s, i) => {
        const active = macroStep === s.id;
        const done = macroStep > s.id;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center min-w-[100px]">
              <div
                className={`provider-onboarding-step-dot w-8 h-8 text-sm ${
                  active ? 'provider-onboarding-step-dot--active' : done ? 'provider-onboarding-step-dot--done' : ''
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : s.id + 1}
              </div>
              <span className={`text-xs mt-2 font-medium ${active ? 'text-brand' : 'text-provider-muted'}`}>
                {s.title}
              </span>
            </div>
            {i < MACRO_STEPS.length - 1 && (
              <div className={`provider-onboarding-step-line w-16 sm:w-24 ${done || active ? 'provider-onboarding-step-line--active' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderResult = () => (
    <div className="provider-onboarding-shell space-y-5">
      <div className="provider-section-card p-8 shadow-sm text-center">
        {status === 'approved' && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-provider-title">审核已通过</h2>
            <p className="text-sm text-provider-secondary mt-2">
              您已具备接单资格，可前往任务大厅浏览任务并提交 P0 报价方案。
            </p>
          </>
        )}
        {status === 'submitted' && (
          <>
            <Clock className="w-14 h-14 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-provider-title">审核进行中</h2>
            <p className="text-sm text-provider-secondary mt-2">预计 1 个工作日内完成，结果将通过消息通知您。</p>
            <button type="button" className="provider-btn-secondary mt-6" onClick={() => void withdraw()}>
              {demoMode ? '返回修改' : '撤回申请'}
            </button>
          </>
        )}
      </div>

      <div className="provider-onboarding-earnings-card">
        <h3 className="text-sm font-bold text-provider-title flex items-center gap-2">
          <Wallet className="w-4 h-4 text-brand" /> 开通后您可以
        </h3>
        <ul className="mt-3 space-y-2 text-xs text-provider-secondary">
          <li>· 在任务大厅查看匹配任务，填写期望到手价 P0 提交报价</li>
          <li>
            · 验收通过后按实际结算金额到账（平台收取 {(MARKETPLACE_PLATFORM_FEE_RATE * 100).toFixed(0)}% 技术服务费）
          </li>
          <li>
            · 参考：单笔结算 ¥{PROVIDER_FEE_EXAMPLE.settlement.toLocaleString('zh-CN')}，您可结算 ¥
            {PROVIDER_FEE_EXAMPLE.income.toLocaleString('zh-CN')}
          </li>
        </ul>
        <p className="text-[10px] text-provider-muted mt-3">{PROVIDER_NO_GUARANTEE_HINT}</p>
      </div>
    </div>
  );
  const renderPageHeader = () => {
    if (embedded || phase !== 'form') return null;
    return (
      <div className="text-center sm:text-left">
        <p className="text-[11px] font-semibold text-brand">步骤 2 / 2 · 填写入驻资料</p>
        <h1 className="text-xl font-bold text-provider-title mt-1">完善资料并提交审核</h1>
        <p className="text-xs text-provider-muted mt-1">
          身份：<span className="text-brand font-medium">{providerType}</span>
          {!embedded && (
            <button type="button" className="text-brand hover:underline ml-2" onClick={() => setPhase('identity')}>
              修改
            </button>
          )}
        </p>
        {!demoMode && status !== 'submitted' && status !== 'approved' && (
          <p className="text-xs text-provider-secondary mt-1">
            当前状态：<span className="text-brand font-medium">{STATUS_LABEL[status] ?? status}</span>
            {lastSavedAt && canEdit && (
              <span className="text-provider-muted"> · 已自动保存 {lastSavedAt}</span>
            )}
          </p>
        )}
      </div>
    );
  };
  const renderCheckRow = (ok: boolean, label: string, detail: string) => (
    <div className="flex items-start gap-3 py-2">
      {ok ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-5 h-5 text-provider-muted shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-provider-title">{label}</p>
        <p className={`text-xs mt-0.5 ${ok ? 'text-green-600' : 'text-provider-muted'}`}>{detail}</p>
      </div>
    </div>
  );

  const renderChipGroup = (
    items: string[],
    selected: string[],
    onToggle: (item: string) => void
  ) => {
    if (!items.length) {
      return <p className="text-xs text-provider-muted">暂无可选项，请联系平台管理员配置名单</p>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const on = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              disabled={!canEdit}
              onClick={() => onToggle(item)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                on
                  ? 'provider-nav-active-brand border-brand-light'
                  : 'border-provider text-provider-secondary hover:border-provider-subtle disabled:opacity-60'
              }`}
            >
              {on && <span className="mr-1">✓</span>}
              {item}
            </button>
          );
        })}
      </div>
    );
  };

  if (status === 'submitted' || status === 'approved') {
    return (
      <div className="space-y-6">
        {renderDemoBanner()}
        {!embedded && (
          <div className="text-center">
            <h1 className="text-xl font-bold text-provider-title">入驻审核</h1>
            <p className="text-xs text-provider-muted mt-1">您的申请已进入平台审核流程</p>
          </div>
        )}
        {renderStepper()}
        {renderResult()}
        {versions.length > 0 && (
          <div className="provider-section-card max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-provider-title mb-3">申请记录</h3>
            {versions.slice(0, 3).map((v) => (
              <div key={v.id} className="flex justify-between text-xs py-2 border-b border-provider last:border-0">
                <span>v{v.version}</span>
                <span className="text-provider-muted">{new Date(v.createdAt).toLocaleString('zh-CN')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === 'welcome' && !embedded) {
    return (
      <div className="space-y-6">
        {renderDemoBanner()}
        {renderWelcome()}
      </div>
    );
  }

  if (phase === 'identity') {
    return (
      <div className="space-y-6">
        {renderDemoBanner()}
        {renderIdentity()}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${embedded ? '' : 'provider-onboarding-shell--wide'}`}>      {renderDemoBanner()}
      {renderPageHeader()}
      {embedded && (
        <p className="text-xs text-provider-secondary -mt-2">
          当前状态：<span className="text-brand font-medium">{STATUS_LABEL[status] ?? status}</span>
          {demoMode && <span className="text-amber-600">（演示）</span>}
        </p>
      )}

      {renderWizardStepper()}

      {status === 'rejected' && (
        <div className="bg-brand-light/40 border border-brand-light rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-brand shrink-0" />
          <div>
            <p className="text-sm font-semibold text-provider-title">上次审核未通过</p>
            <p className="text-xs text-provider-secondary mt-1">{reviewNote || '请修改后重新提交审核。'}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {renderWizardStepContent()}
          {wizardStep < WIZARD_STEPS.length - 1 && (
            <div className="flex justify-between gap-3">
              <button
                type="button"
                className="provider-btn-secondary text-sm px-4"
                disabled={wizardStep === 0}
                onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
              >
                上一步
              </button>
              <div className="flex gap-2 ml-auto">
                {!embedded && (
                  <button
                    type="button"
                    className="provider-btn-secondary text-sm px-4"
                    onClick={() => setPhase('identity')}
                  >
                    修改身份
                  </button>
                )}
                <button
                  type="button"
                  className="provider-btn-primary text-sm px-4"
                  disabled={!canWizardNext()}
                  onClick={() => setWizardStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))}
                >
                  下一步
                </button>
              </div>
            </div>
          )}        </div>

        <div className="lg:col-span-1">
          {wizardStep === WIZARD_STEPS.length - 1 ? (
          <div className="provider-section-card sticky top-4">
            <h2 className="text-sm font-bold text-provider-title mb-4">提交审核</h2>
            {renderCheckRow(
              checks.basic,
              '基础资料',
              checks.basic ? `${displayName} · ${contactName}` : '请填写名称与联系人'
            )}
            {renderCheckRow(
              checks.media,
              '媒体平台',
              checks.media ? `已选 ${platforms.length} 个：${platforms.join('、')}` : '请至少选择 1 个媒体'
            )}
            {renderCheckRow(
              checks.regions,
              '接单地区',
              checks.regions ? `已选 ${serviceAreas.length} 个：${serviceAreas.join('、')}` : '请至少选择 1 个地区'
            )}

            <div className="mt-4 rounded-xl border border-brand-light bg-brand-light/30 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold text-provider-title">平台技术服务费</span>
                <span className="text-base font-bold text-brand">{(MARKETPLACE_PLATFORM_FEE_RATE * 100).toFixed(0)}%</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-provider-secondary">
                按每笔验收通过的订单实际结算金额收取；订单结算 ¥{PROVIDER_FEE_EXAMPLE.settlement.toLocaleString('zh-CN')}，您可结算 ¥{PROVIDER_FEE_EXAMPLE.income.toLocaleString('zh-CN')}。
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-provider-muted">
                {PROVIDER_NO_GUARANTEE_HINT}
              </p>
              <button type="button" className="mt-2 text-[11px] font-medium text-brand hover:underline" onClick={() => setAgreementOpen('cooperation')}>
                查看入驻与撮合服务协议
              </button>
            </div>

            {!providerId && (
              <label className="flex items-start gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={registrationAgreed}
                  disabled={!canEdit}
                  onChange={(e) => setRegistrationAgreed(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-xs text-provider-secondary leading-relaxed">
                  我已阅读并同意
                  <button
                    type="button"
                    className="text-brand font-medium hover:underline"
                    onClick={(event) => {
                      event.preventDefault();
                      setAgreementOpen('user');
                    }}
                  >
                    《{PROVIDER_USER_AGREEMENT_TITLE}》
                  </button>
                  和
                  <button
                    type="button"
                    className="text-brand font-medium hover:underline"
                    onClick={(event) => {
                      event.preventDefault();
                      setAgreementOpen('privacy');
                    }}
                  >
                    《{PROVIDER_PRIVACY_TITLE}》
                  </button>
                </span>
              </label>
            )}

            <label className="flex items-start gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                disabled={!canEdit}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
              />
              <span className="text-xs text-provider-secondary leading-relaxed">
                我已阅读并同意
                <button
                  type="button"
                  className="text-brand font-medium hover:underline"
                  onClick={(event) => {
                    event.preventDefault();
                    setAgreementOpen('cooperation');
                  }}
                >
                  {PROVIDER_ONBOARDING_AGREEMENT_LABEL}
                </button>
                ，知悉平台按订单实际结算金额收取 {(MARKETPLACE_PLATFORM_FEE_RATE * 100).toFixed(0)}% 平台技术服务费，并同意按照平台规则完成接单、交付、验收、结算和争议处理。
              </span>
            </label>
            {providerId && (
              <p className="mt-2 text-[10px] leading-relaxed text-provider-muted px-1">{PROVIDER_ONBOARDING_REGISTRATION_ACK}</p>
            )}

            <button
              type="button"
              className="provider-btn-primary w-full mt-5 py-3 text-sm disabled:opacity-50"
              disabled={!canEdit || saving || !allChecksPass || (!providerId && !registrationAgreed) || !agreed}
              onClick={() => void submit()}
            >
              提交审核
            </button>

            <div className="mt-4 pt-4 border-t border-provider flex gap-2 text-[10px] text-provider-muted">
              <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>
                预计 1 个工作日内完成
                <br />
                审核结果将通过站内信通知你
              </p>
            </div>

            {canEdit && (
              <button
                type="button"
                className="provider-btn-secondary w-full mt-3 text-xs"
                disabled={saving}
                onClick={() => void save()}
              >
                保存草稿
              </button>
            )}
          </div>
          ) : (
            <div className="provider-section-card sticky top-4 text-xs text-provider-secondary">              <p className="font-medium text-provider-title mb-2">当前步骤：{WIZARD_STEPS[wizardStep]?.title}</p>
              <p>完成本步后点击「下一步」，全部步骤完成后在此提交审核。</p>
              {lastSavedAt && canEdit && (
                <p className="text-provider-muted mt-3">已自动保存 {lastSavedAt}</p>
              )}
            </div>
          )}
        </div>
      </div>
      <MarketplaceAgreementModal
        agreement={
          agreementOpen === 'user'
            ? PROVIDER_USER_AGREEMENT
            : agreementOpen === 'privacy'
              ? PROVIDER_PRIVACY_AGREEMENT
              : agreementOpen === 'cooperation'
                ? PROVIDER_COOPERATION_AGREEMENT
                : null
        }
        onClose={() => setAgreementOpen(null)}
      />
    </div>
  );
}

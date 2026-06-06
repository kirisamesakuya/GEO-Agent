import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { DEFAULT_PROVIDER_ONBOARDING_OPTIONS } from '../../../lib/provider-onboarding-defaults';
import { useToast } from '../../context/ToastContext';

interface Provider {
  id: string;
  name: string;
  applicationStatus: string;
  reviewNote?: string | null;
  platforms?: string | null;
  serviceAreas?: string | null;
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
  { id: 0, title: '选择媒体与地区' },
  { id: 1, title: '提交审核' },
  { id: 2, title: '审核结果' },
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
  const [status, setStatus] = useState('draft');
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [agreed, setAgreed] = useState(false);
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
        setPlatforms(parseJsonArray(p.platforms));
        setServiceAreas(parseJsonArray(p.serviceAreas));
      });
    loadVersions();
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
    media: platforms.length > 0,
    regions: serviceAreas.length > 0,
  };
  const allChecksPass = checks.media && checks.regions;
  const canEdit = status !== 'submitted' && status !== 'approved';
  const macroStep = macroStepIndex(status);

  const buildPayload = () => ({
    name: '新媒体接单方',
    type: '达人',
    platforms,
    serviceAreas,
    serviceTypes: platforms,
    capabilities: platforms,
    industryTags: platforms,
  });

  const save = async (silent = false) => {
    if (demoMode) {
      setLastSavedAt(new Date().toLocaleTimeString('zh-CN'));
      if (!silent) toast('演示：已本地保存', 'success');
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
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => void save(true), 8000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [platforms, serviceAreas, status, demoMode]);

  const submit = async () => {
    if (!agreed) {
      toast('请先阅读并同意平台合作协议', 'error');
      return;
    }
    if (!allChecksPass) {
      toast('请选择媒体平台与接单地区', 'error');
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
      body: JSON.stringify({ providerId }),
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

  const renderStepper = () => (
    <div className="flex items-center justify-center gap-0 mb-8">
      {MACRO_STEPS.map((s, i) => {
        const active = macroStep === s.id;
        const done = macroStep > s.id;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center min-w-[100px]">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  active
                    ? 'bg-brand border-brand text-white'
                    : done
                      ? 'bg-brand-light border-brand text-brand'
                      : 'bg-white border-gray-200 text-gray-400'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : s.id + 1}
              </div>
              <span className={`text-xs mt-2 font-medium ${active ? 'text-brand' : 'text-gray-400'}`}>
                {s.title}
              </span>
            </div>
            {i < MACRO_STEPS.length - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mx-2 mb-6 ${done || active ? 'bg-brand/40' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderResult = () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center max-w-lg mx-auto">
      {status === 'approved' && (
        <>
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900">审核已通过</h2>
          <p className="text-sm text-gray-500 mt-2">您已具备接单资格，可前往任务大厅领取合作任务。</p>
        </>
      )}
      {status === 'submitted' && (
        <>
          <Clock className="w-14 h-14 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900">审核进行中</h2>
          <p className="text-sm text-gray-500 mt-2">预计 1 个工作日内完成，结果将通过消息通知您。</p>
          <button type="button" className="provider-btn-secondary mt-6" onClick={() => void withdraw()}>
            {demoMode ? '返回修改' : '撤回申请'}
          </button>
        </>
      )}
    </div>
  );

  const renderPageHeader = () => {
    if (embedded) return null;
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900">入驻审核</h1>
        <p className="text-xs text-gray-400 mt-1">选择可接单媒体与地区，提交后等待平台审核</p>
        {!demoMode && status !== 'submitted' && status !== 'approved' && (
          <p className="text-xs text-gray-500 mt-1">
            当前状态：<span className="text-brand font-medium">{STATUS_LABEL[status] ?? status}</span>
            {lastSavedAt && canEdit && (
              <span className="text-gray-400"> · 已自动保存 {lastSavedAt}</span>
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
        <Circle className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className={`text-xs mt-0.5 ${ok ? 'text-green-600' : 'text-gray-400'}`}>{detail}</p>
      </div>
    </div>
  );

  const renderChipGroup = (
    items: string[],
    selected: string[],
    onToggle: (item: string) => void
  ) => {
    if (!items.length) {
      return <p className="text-xs text-gray-400">暂无可选项，请联系平台管理员配置名单</p>;
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
                  ? 'bg-brand-light border-brand-light text-brand'
                  : 'border-gray-100 text-gray-600 hover:border-gray-200 disabled:opacity-60'
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
        {renderPageHeader()}
        {renderStepper()}
        {renderResult()}
        {versions.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-gray-900 mb-3">申请记录</h3>
            {versions.slice(0, 3).map((v) => (
              <div key={v.id} className="flex justify-between text-xs py-2 border-b border-gray-50 last:border-0">
                <span>v{v.version}</span>
                <span className="text-gray-400">{new Date(v.createdAt).toLocaleString('zh-CN')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderDemoBanner()}
      {renderPageHeader()}
      {embedded && (
        <p className="text-xs text-gray-500 -mt-2">
          当前状态：<span className="text-brand font-medium">{STATUS_LABEL[status] ?? status}</span>
          {demoMode && <span className="text-amber-600">（演示）</span>}
        </p>
      )}

      {renderStepper()}

      {status === 'rejected' && (
        <div className="bg-brand-light/40 border border-brand-light rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-brand shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900">上次审核未通过</p>
            <p className="text-xs text-gray-600 mt-1">{reviewNote || '请修改后重新提交审核。'}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-1">媒体平台</h2>
            <p className="text-xs text-gray-400 mb-4">平台名单由后台维护，请选择您可接单的内容渠道</p>
            {renderChipGroup(options.mediaPlatforms, platforms, togglePlatform)}
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-1">接单地区</h2>
            <p className="text-xs text-gray-400 mb-4">地区名单由后台维护，可多选</p>
            {renderChipGroup(options.serviceRegions, serviceAreas, toggleRegion)}
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm sticky top-4">
            <h2 className="text-sm font-bold text-gray-900 mb-4">提交审核</h2>
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

            <label className="flex items-start gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                disabled={!canEdit}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                我已阅读并同意
                <span className="text-brand font-medium">《平台合作协议》</span>
              </span>
            </label>

            <button
              type="button"
              className="provider-btn-primary w-full mt-5 py-3 text-sm disabled:opacity-50"
              disabled={!canEdit || saving || !allChecksPass}
              onClick={() => void submit()}
            >
              提交审核
            </button>

            <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2 text-[10px] text-gray-400">
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
        </div>
      </div>
    </div>
  );
}

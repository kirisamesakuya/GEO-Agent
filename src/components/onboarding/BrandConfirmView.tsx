import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { BrandProfile } from '../../types';
import { confirmOnboardingBrand } from '../../lib/onboarding-client';
import type { OnboardingGoal } from '../../lib/brand-clue';

interface Props {
  brandName: string;
  initialProfile?: Partial<BrandProfile>;
  goal?: OnboardingGoal;
  onConfirmed: (result: { brandName: string; taskId: string }) => void;
  onBack?: () => void;
}

export default function BrandConfirmView({
  brandName,
  initialProfile,
  goal = 'geo_quick_start',
  onConfirmed,
  onBack,
}: Props) {
  const [profile, setProfile] = useState<Partial<BrandProfile>>({
    name: brandName,
    industry: '',
    city: '',
    website: '',
    description: '',
    keywords: [],
    competitors: [],
    ...initialProfile,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [missingHints, setMissingHints] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/brand-profile?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.name) {
          setProfile((p) => ({ ...p, ...d }));
          const hints: string[] = [];
          if (!d.city) hints.push('是否有城市/门店地址？');
          if (!d.website && !d.description) hints.push('是否有官网或社媒主页？');
          if (!d.keywords?.length) hints.push('主营服务是否完整？');
          setMissingHints(hints);
        }
      })
      .catch(() => {});
  }, [brandName]);

  const handleConfirm = async () => {
    if (!profile.name?.trim()) {
      setError('请填写品牌名称');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await confirmOnboardingBrand({
        brandName,
        profile,
        goal,
      });
      onConfirmed({ brandName: result.brand.name, taskId: result.task.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : '确认失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="geo-page-content overflow-y-auto h-full">
      <div className="geo-card p-6 max-w-4xl mx-auto">
        <h2 className="text-lg font-bold mb-1">确认品牌资料</h2>
        <p className="text-sm text-[var(--neutral-text-03)] mb-6">
          Hermes 将基于这些信息执行首次 AI 可见度体检
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">我们整理出的品牌信息</h3>
            <label className="block text-xs text-[var(--neutral-text-03)]">
              品牌名称
              <input
                className="geo-input w-full mt-1"
                value={profile.name ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label className="block text-xs text-[var(--neutral-text-03)]">
              行业
              <input
                className="geo-input w-full mt-1"
                value={profile.industry ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, industry: e.target.value }))}
              />
            </label>
            <label className="block text-xs text-[var(--neutral-text-03)]">
              城市
              <input
                className="geo-input w-full mt-1"
                value={profile.city ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
              />
            </label>
            <label className="block text-xs text-[var(--neutral-text-03)]">
              业务描述
              <textarea
                className="geo-input w-full mt-1 min-h-[80px]"
                value={profile.description ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
              />
            </label>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">还可以补充</h3>
            <label className="block text-xs text-[var(--neutral-text-03)]">
              主营服务（逗号分隔）
              <input
                className="geo-input w-full mt-1"
                value={(profile.keywords ?? []).join('、')}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    keywords: e.target.value.split(/[,、]/).map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </label>
            <label className="block text-xs text-[var(--neutral-text-03)]">
              竞品（逗号分隔）
              <input
                className="geo-input w-full mt-1"
                value={(profile.competitors ?? []).join('、')}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    competitors: e.target.value.split(/[,、]/).map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </label>

            {missingHints.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-medium mb-1">还差信息：</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {missingHints.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <div className="flex justify-between mt-6">
          {onBack && (
            <button type="button" className="geo-btn-secondary" onClick={onBack}>
              返回修改
            </button>
          )}
          <button
            type="button"
            className="geo-btn-primary ml-auto"
            disabled={loading}
            onClick={() => void handleConfirm()}
          >
            {loading ? '提交中…' : '确认并开始 AI 体检'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingStepList({
  steps = [],
}: {
  steps?: Array<{ id: string; label: string; done: boolean; current?: boolean }>;
}) {
  return (
    <ul className="space-y-2">
      {steps.map((s) => (
        <li key={s.id} className="flex items-start gap-2 text-sm">
          {s.done ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          ) : s.current ? (
            <Loader2 className="w-4 h-4 text-[var(--color-accent)] animate-spin shrink-0 mt-0.5" />
          ) : (
            <Circle className="w-4 h-4 text-[var(--neutral-text-03)] shrink-0 mt-0.5" />
          )}
          <span className={s.current ? 'text-[var(--color-accent)] font-medium' : ''}>{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

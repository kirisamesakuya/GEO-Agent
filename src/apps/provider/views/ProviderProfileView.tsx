import { useState, useEffect } from 'react';
import { User, Sparkles, PlayCircle } from 'lucide-react';
import ProviderOnboarding from '../ProviderOnboarding';
import { parseJsonArray, DEFAULT_AVATAR, APPLICATION_STATUS_LABEL } from '../lib/provider-ui';
import type { ProviderPageId, ProviderRecord } from '../types';

interface Props {
  provider: ProviderRecord;
  providerId: string;
  onProviderReady: (id: string) => void;
  onNavigate: (tab: ProviderPageId) => void;
}

export default function ProviderProfileView({
  provider,
  providerId,
  onProviderReady,
  onNavigate,
}: Props) {
  const [demoOnboarding, setDemoOnboarding] = useState(false);
  const [industryTags, setIndustryTags] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const approved = provider.applicationStatus === 'approved';
  const statusLabel =
    APPLICATION_STATUS_LABEL[provider.applicationStatus] ?? provider.applicationStatus;

  useEffect(() => {
    fetch(`/api/provider/profile?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.provider;
        if (!p) return;
        setIndustryTags(parseJsonArray(p.industryTags));
        setPlatforms(parseJsonArray(p.platforms));
      });
  }, [providerId]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-provider-title">个人中心</h1>
        <p className="text-xs text-provider-muted">
          {approved ? '管理账号资料与接单偏好' : '选择媒体与接单地区，完成入驻审核后可接单'}
        </p>
      </div>

      <div className="provider-card rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
        <img src={DEFAULT_AVATAR} alt="" className="w-20 h-20 rounded-2xl border border-provider object-cover" />
        <div className="flex-1">
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
            <p className="text-xs text-provider-muted">
              {approved ? '在「账号资源」中补充报价与接单偏好' : '入驻所选媒体与地区将用于任务匹配'}
            </p>
          ) : (
            [...new Set([...industryTags, ...platforms])].map((tag) => (
              <span key={tag} className="text-xs px-3 py-1.5 rounded-lg bg-brand-light text-brand font-medium">
                {tag}
              </span>
            ))
          )}
        </div>
        {approved && (
          <button
            type="button"
            className="text-xs text-brand font-semibold mt-4 hover:underline"
            onClick={() => onNavigate('accounts')}
          >
            前往账号资源 →
          </button>
        )}
      </div>

      {approved && (
        <div className="bg-brand-light/30 border border-brand-light rounded-2xl p-4 text-sm text-provider-body">
          您已通过平台入驻审核，可在任务大厅直接领取合作任务。
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

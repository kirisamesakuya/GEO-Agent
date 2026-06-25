import { useState } from 'react';
import type { PaidSourceTaskBrief } from '../../../lib/paid-source-brief';

const TASK_TYPES = ['官方媒体', '行业媒体', '问答', '测评', '探店', '综合投放'];
const PLATFORMS = ['官方媒体', '行业媒体', '知乎', '小红书', '网站'];
const WORD_RANGES = ['800-1200', '1200-2000', '自定义'];
const DEADLINES = ['24小时', '48小时', '72小时', '指定时间'];

interface Props {
  brandName: string;
  initial?: PaidSourceTaskBrief;
  onChange: (brief: PaidSourceTaskBrief) => void;
}

export default function PaidSourcePublishFormView({ brandName, initial, onChange }: Props) {
  const [brief, setBrief] = useState<PaidSourceTaskBrief>({
    taskName: '',
    brandIntro: brandName,
    requireLink: true,
    requireScreenshot: true,
    requireIndexingProof: false,
    hiddenBudgetMaxCents: 2_000_000,
    perTaskBudgetCapCents: 300_000,
    ...initial,
  });

  const patch = (next: Partial<PaidSourceTaskBrief>) => {
    const merged = { ...brief, ...next };
    setBrief(merged);
    onChange(merged);
  };

  return (
    <div className="geo-card p-5 space-y-6">
      <div>
        <h3 className="font-semibold text-sm">任务基础信息</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <label className="block md:col-span-2">
            <span className="text-xs text-[var(--neutral-text-03)]">任务名称</span>
            <input
              className="geo-input w-full mt-1"
              value={brief.taskName ?? ''}
              onChange={(e) => patch({ taskName: e.target.value })}
              placeholder="品牌权威内容铺设"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--neutral-text-03)]">任务类型</span>
            <select
              className="geo-input w-full mt-1"
              value={brief.taskType ?? TASK_TYPES[0]}
              onChange={(e) => patch({ taskType: e.target.value })}
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-[var(--neutral-text-03)]">需求来源</span>
            <select
              className="geo-input w-full mt-1"
              value={brief.demandSource ?? '按品牌资料'}
              onChange={(e) => patch({ demandSource: e.target.value })}
            >
              <option value="按品牌资料">按品牌资料</option>
              <option value="根据 GEO 报告">根据 GEO 报告</option>
              <option value="根据排名缺口">根据排名缺口</option>
            </select>
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const selected = brief.targetPlatforms?.includes(p);
            return (
              <button
                key={p}
                type="button"
                className={`text-xs px-2.5 py-1 rounded-lg border ${selected ? 'geo-nav-active' : 'geo-nav-item'}`}
                onClick={() => {
                  const cur = brief.targetPlatforms ?? [];
                  patch({
                    targetPlatforms: selected ? cur.filter((x) => x !== p) : [...cur, p],
                  });
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm">品牌与内容判断</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
          <textarea
            className="geo-input w-full min-h-[72px]"
            placeholder="品牌介绍"
            value={brief.brandIntro ?? ''}
            onChange={(e) => patch({ brandIntro: e.target.value })}
          />
          <textarea
            className="geo-input w-full min-h-[72px]"
            placeholder="产品/服务卖点"
            value={brief.productSellingPoints ?? ''}
            onChange={(e) => patch({ productSellingPoints: e.target.value })}
          />
          <input
            className="geo-input w-full"
            placeholder="目标关键词（逗号分隔）"
            value={(brief.targetKeywords ?? []).join(' / ')}
            onChange={(e) =>
              patch({
                targetKeywords: e.target.value.split(/[,，/]/).map((s) => s.trim()).filter(Boolean),
              })
            }
          />
          <input
            className="geo-input w-full"
            placeholder="官网链接"
            value={brief.websiteUrl ?? ''}
            onChange={(e) => patch({ websiteUrl: e.target.value })}
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm">交付要求</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <select
            className="geo-input w-full"
            value={brief.wordCountRange ?? WORD_RANGES[1]}
            onChange={(e) => patch({ wordCountRange: e.target.value })}
          >
            {WORD_RANGES.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          <select
            className="geo-input w-full"
            value={brief.publishDeadline ?? DEADLINES[2]}
            onChange={(e) => patch({ publishDeadline: e.target.value })}
          >
            {DEADLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={brief.requireLink ?? true}
              onChange={(e) => patch({ requireLink: e.target.checked })}
            />
            必须带链接
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={brief.requireScreenshot ?? true}
              onChange={(e) => patch({ requireScreenshot: e.target.checked })}
            />
            必须带截图
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={brief.requireIndexingProof ?? false}
              onChange={(e) => patch({ requireIndexingProof: e.target.checked })}
            />
            必须带收录证明
          </label>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm">限制与预算控制</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <input
            className="geo-input w-full"
            placeholder="行业限制"
            value={brief.industryLimit ?? ''}
            onChange={(e) => patch({ industryLimit: e.target.value })}
          />
          <input
            className="geo-input w-full"
            placeholder="地区限制"
            value={brief.regionLimit ?? ''}
            onChange={(e) => patch({ regionLimit: e.target.value })}
          />
          <textarea
            className="geo-input w-full md:col-span-2 min-h-[56px]"
            placeholder="禁用词/合规要求"
            value={brief.complianceNotes ?? ''}
            onChange={(e) => patch({ complianceNotes: e.target.value })}
          />
          <label className="block">
            <span className="text-xs text-[var(--neutral-text-03)]">隐藏总上限（元）</span>
            <input
              type="number"
              className="geo-input w-full mt-1"
              value={Math.round((brief.hiddenBudgetMaxCents ?? 0) / 100)}
              onChange={(e) =>
                patch({ hiddenBudgetMaxCents: Math.round(Number(e.target.value) * 100) })
              }
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--neutral-text-03)]">单任务上限（元）</span>
            <input
              type="number"
              className="geo-input w-full mt-1"
              value={Math.round((brief.perTaskBudgetCapCents ?? 0) / 100)}
              onChange={(e) =>
                patch({ perTaskBudgetCapCents: Math.round(Number(e.target.value) * 100) })
              }
            />
          </label>
        </div>
        <p className="text-xs text-[var(--neutral-text-03)] mt-2">
          确认报价后才冻结，不在发布时冻结。
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Plus, Link2, Layers } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { parseJsonArray } from '../lib/provider-ui';
import { PROVIDER_TASK_HALL_FILTER_PLATFORMS, PROVIDER_INDUSTRY_MEDIA_OUTLETS } from '../../../lib/publish-content-platforms';
import { PROVIDER_CASE_SUBMISSION_ENABLED } from '../provider-feature-flags';
import ProviderAccountShell from '../components/workspace/ProviderAccountShell';

const PLATFORMS = [...PROVIDER_TASK_HALL_FILTER_PLATFORMS];
const INDUSTRIES = ['医疗健康', '本地生活', '教育', '美业', 'B2B'];

interface Props {
  providerId: string;
}

export default function ProviderAccountView({ providerId }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState('达人');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [industryTags, setIndustryTags] = useState<string[]>([]);
  const [caseLinks, setCaseLinks] = useState('');
  const [budgetMin, setBudgetMin] = useState(1000);
  const [budgetMax, setBudgetMax] = useState(50000);
  const [assets, setAssets] = useState<Array<{ id: string; title: string; type: string; url: string }>>([]);
  const [assetTitle, setAssetTitle] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [pricingRules, setPricingRules] = useState<
    Array<{ id: string; taskType: string; minBudget?: number; maxBudget?: number; note?: string }>
  >([]);
  const [ruleTaskType, setRuleTaskType] = useState('种草');
  const [ruleMin, setRuleMin] = useState('');
  const [ruleMax, setRuleMax] = useState('');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [section, setSection] = useState('platforms');

  const accountNav = [
    { id: 'platforms', label: '平台与行业' },
    { id: 'pricing', label: '报价规则' },
    ...(PROVIDER_CASE_SUBMISSION_ENABLED ? [{ id: 'cases', label: '案例素材' }] : []),
  ];

  const loadAssets = () => {
    fetch(`/api/provider/assets?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => setAssets(d.assets ?? []));
  };

  const loadPricingRules = () => {
    fetch(`/api/provider/pricing-rules?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => setPricingRules(d.rules ?? []));
  };

  useEffect(() => {
    loadAssets();
    loadPricingRules();
    fetch(`/api/provider/profile?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.provider;
        if (!p) return;
        setName(p.name ?? '');
        setType(p.type ?? '达人');
        setPlatforms(parseJsonArray(p.platforms));
        setIndustryTags(parseJsonArray(p.industryTags));
        setCaseLinks(parseJsonArray(p.caseLinks).join('\n'));
        setBudgetMin(p.budgetMin ?? 1000);
        setBudgetMax(p.budgetMax ?? 50000);
      });
  }, [providerId]);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const save = async () => {
    const res = await fetch('/api/provider/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId,
        name: name || '接单方',
        type,
        platforms,
        industryTags,
        caseLinks: caseLinks.split('\n').filter(Boolean),
        budgetMin,
        budgetMax,
        capabilities: platforms,
        serviceTypes: industryTags,
      }),
    });
    const data = await res.json();
    if (data.provider) toast('服务资源已保存', 'success');
  };

  const canAcceptCount = platforms.length;

  return (
    <ProviderAccountShell
      title="账号资源"
      subtitle={
        PROVIDER_CASE_SUBMISSION_ENABLED
          ? '管理可接单平台、案例与报价规则'
          : '管理可接单平台与报价规则（本期无需提交案例）'
      }
      nav={accountNav}
      activeId={section}
      onNavChange={setSection}
    >
      <div className={`grid gap-4 ${PROVIDER_CASE_SUBMISSION_ENABLED ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div className="provider-card rounded-2xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-provider-title">{platforms.length}</p>
          <p className="text-xs text-provider-muted mt-1">已绑定平台</p>
        </div>
        <div className="provider-card rounded-2xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-brand">{canAcceptCount}</p>
          <p className="text-xs text-provider-muted mt-1">可接单资源</p>
        </div>
        {PROVIDER_CASE_SUBMISSION_ENABLED && (
          <div className="provider-card rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-provider-title">{assets.length}</p>
            <p className="text-xs text-provider-muted mt-1">案例素材</p>
          </div>
        )}
      </div>

      {section === 'platforms' && (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {platforms.map((p) => (
          <div key={p} className="provider-card rounded-2xl p-5 shadow-sm flex justify-between items-start">
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white text-xs font-bold mb-3">
                {p.slice(0, 2)}
              </div>
              <h3 className="font-bold text-provider-title">{p} 服务资源</h3>
              <p className="text-xs text-provider-muted mt-1">已启用接单匹配</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {industryTags.slice(0, 3).map((t) => (
                  <span key={t} className="text-[9px] bg-provider-hover text-provider-secondary px-2 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium">可接单</span>
          </div>
        ))}
        {platforms.length === 0 && (
          <p className="text-sm text-provider-muted col-span-2">请在下方勾选至少一个平台</p>
        )}
      </div>

      <div className="provider-card rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-provider-title flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand" /> 平台与行业
        </h2>
        <div>
          <label className="text-xs text-provider-secondary block mb-2">擅长平台</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggle(platforms, setPlatforms, p)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                  platforms.includes(p) ? 'provider-nav-active' : 'provider-nav-item border border-provider'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {platforms.includes('行业媒体') && (
            <div className="mt-3 pt-3 border-t border-provider-subtle">
              <p className="text-[11px] text-provider-muted mb-2">行业媒体子项（可选，勾选后匹配更精准）</p>
              <div className="flex flex-wrap gap-2">
                {PROVIDER_INDUSTRY_MEDIA_OUTLETS.map((outlet) => (
                  <button
                    key={outlet}
                    type="button"
                    onClick={() => toggle(platforms, setPlatforms, outlet)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                      platforms.includes(outlet)
                        ? 'provider-nav-active'
                        : 'provider-nav-item border border-provider'
                    }`}
                  >
                    {outlet}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-provider-secondary block mb-2">行业标签</label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggle(industryTags, setIndustryTags, t)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                  industryTags.includes(t) ? 'provider-nav-active' : 'provider-nav-item border border-provider'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-provider-secondary block mb-1">报价下限 ¥</label>
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(Number(e.target.value))}
              className="w-full px-3 py-2 border border-provider rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-provider-secondary block mb-1">报价上限 ¥</label>
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(Number(e.target.value))}
              className="w-full px-3 py-2 border border-provider rounded-xl text-sm"
            />
          </div>
        </div>
        {PROVIDER_CASE_SUBMISSION_ENABLED && (
          <div>
            <label className="text-xs text-provider-secondary block mb-1">案例链接</label>
            <textarea
              value={caseLinks}
              onChange={(e) => setCaseLinks(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-provider rounded-xl text-sm"
            />
          </div>
        )}
        <button type="button" className="provider-btn-workbench" onClick={() => void save()}>
          保存服务资源
        </button>
      </div>
      </>
      )}

      {section === 'cases' && PROVIDER_CASE_SUBMISSION_ENABLED && (
      <div className="provider-card rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-provider-title flex items-center gap-2">
            <Link2 className="w-4 h-4 text-brand" /> 案例素材
          </h2>
          <button type="button" className="text-xs text-brand font-semibold flex items-center gap-1" onClick={() => setShowAddAsset(!showAddAsset)}>
            <Plus className="w-3.5 h-3.5" /> 添加
          </button>
        </div>
        {showAddAsset && (
          <div className="flex gap-2 flex-wrap p-3 bg-provider-subtle rounded-xl">
            <input
              value={assetTitle}
              onChange={(e) => setAssetTitle(e.target.value)}
              placeholder="标题"
              className="flex-1 min-w-[100px] px-3 py-2 border border-provider rounded-lg text-xs"
            />
            <input
              value={assetUrl}
              onChange={(e) => setAssetUrl(e.target.value)}
              placeholder="链接 URL"
              className="flex-[2] min-w-[140px] px-3 py-2 border border-provider rounded-lg text-xs"
            />
            <button
              type="button"
              className="provider-btn-primary text-xs"
              onClick={async () => {
                if (!assetTitle || !assetUrl) return;
                await fetch('/api/provider/assets', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ providerId, title: assetTitle, url: assetUrl, type: 'case' }),
                });
                setAssetTitle('');
                setAssetUrl('');
                setShowAddAsset(false);
                loadAssets();
                toast('已添加', 'success');
              }}
            >
              确认
            </button>
          </div>
        )}
        {assets.map((a) => (
          <div key={a.id} className="flex justify-between items-center text-sm py-2 border-b border-provider last:border-0">
            <a href={a.url} target="_blank" rel="noreferrer" className="text-brand truncate flex-1">
              {a.title}
            </a>
            <button
              type="button"
              className="text-xs text-provider-muted hover:text-brand ml-2"
              onClick={async () => {
                await fetch(`/api/provider/assets/${a.id}?providerId=${providerId}`, { method: 'DELETE' });
                loadAssets();
              }}
            >
              删除
            </button>
          </div>
        ))}
      </div>
      )}

      {section === 'pricing' && (
      <div className="provider-card rounded-2xl p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-provider-title">报价规则</h2>
        {pricingRules.map((r) => (
          <div key={r.id} className="flex justify-between text-sm p-3 bg-provider-subtle rounded-xl">
            <span>
              {r.taskType} · ¥{r.minBudget ?? '—'}–{r.maxBudget ?? '—'}
            </span>
            <button
              type="button"
              className="text-xs text-brand"
              onClick={async () => {
                await fetch(`/api/provider/pricing-rules/${r.id}?providerId=${providerId}`, { method: 'DELETE' });
                loadPricingRules();
              }}
            >
              删除
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <input
            value={ruleTaskType}
            onChange={(e) => setRuleTaskType(e.target.value)}
            placeholder="任务类型"
            className="px-3 py-2 border border-provider rounded-lg text-xs"
          />
          <input
            value={ruleMin}
            onChange={(e) => setRuleMin(e.target.value)}
            placeholder="最低"
            className="w-20 px-3 py-2 border border-provider rounded-lg text-xs"
          />
          <input
            value={ruleMax}
            onChange={(e) => setRuleMax(e.target.value)}
            placeholder="最高"
            className="w-20 px-3 py-2 border border-provider rounded-lg text-xs"
          />
          <button
            type="button"
            className="provider-btn-secondary text-xs"
            onClick={async () => {
              await fetch('/api/provider/pricing-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  providerId,
                  taskType: ruleTaskType,
                  minBudget: ruleMin ? Number(ruleMin) : undefined,
                  maxBudget: ruleMax ? Number(ruleMax) : undefined,
                }),
              });
              setRuleMin('');
              setRuleMax('');
              loadPricingRules();
              toast('报价规则已保存', 'success');
            }}
          >
            添加规则
          </button>
        </div>
      </div>
      )}
    </ProviderAccountShell>
  );
}

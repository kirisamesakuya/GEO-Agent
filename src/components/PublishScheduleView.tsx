import { useCallback, useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import type { AccountBinding } from '../types';
import { useToast } from '../context/ToastContext';
import { fetchAvailablePublishAccounts, toAccountBindingShape } from '../lib/publish-accounts';
import { isPublishReady } from '../lib/publish-account-login-status';
import { platformMatches } from '../lib/content-library-platforms';
import PageHeaderWithBrand from './common/PageHeaderWithBrand';
import type { GeoContentProjectSummary } from '../lib/geo-content-project';

interface Plan {
  id: string;
  name: string;
  sourceType: string;
  frequency: string;
  status: string;
  targetAccountIds?: string[];
}

interface SchedulableItem {
  id: string;
  title: string;
  platform: string;
  projectId?: string;
  publishStatus?: string;
  status: string;
}

interface PublishJobRow {
  id: string;
  planId: string;
  contentItemId: string;
  platform: string;
  scheduledAt: string;
  status: string;
}

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: string) => void;
}

export default function PublishScheduleView({ brandName, onBrandChange }: Props) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [jobs, setJobs] = useState<PublishJobRow[]>([]);
  const [projects, setProjects] = useState<GeoContentProjectSummary[]>([]);
  const [accounts, setAccounts] = useState<AccountBinding[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'staggered' | 'single' | 'multi'>('staggered');
  const [startAt, setStartAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [filterPlatform, setFilterPlatform] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/publish-plans?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => {});
    fetch(`/api/publish-jobs?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => setJobs([]));
    fetch(`/api/geo-content-projects?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]));
    void fetchAvailablePublishAccounts(brandName)
      .then((rows) => setAccounts(rows.map(toAccountBindingShape)))
      .catch(() => setAccounts([]));
  }, [brandName]);

  useEffect(() => {
    load();
  }, [load]);

  const [allItems, setAllItems] = useState<SchedulableItem[]>([]);

  useEffect(() => {
    const ids = [...selectedProjectIds];
    if (!ids.length) {
      setAllItems([]);
      return;
    }
    void Promise.all(
      ids.map((id) =>
        fetch(`/api/geo-content-projects/${id}?brandName=${encodeURIComponent(brandName)}`)
          .then((r) => r.json())
          .then((d) => (d.project?.items ?? []) as SchedulableItem[])
      )
    ).then((groups) => {
      setAllItems(groups.flat().filter((i) => i.status !== 'published' && i.publishStatus !== 'published'));
    });
  }, [selectedProjectIds, brandName]);

  const filteredItems = allItems.filter((i) => !filterPlatform || i.platform === filterPlatform);

  const authorizedAccounts = accounts.filter((a) => isPublishReady(a.status));

  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectedItemIds(new Set());
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllItems = () => {
    setSelectedItemIds(new Set(filteredItems.map((i) => i.id)));
  };

  const bulkSchedule = async () => {
    if (!scheduleName.trim()) {
      toast('请填写排程名称', 'error');
      return;
    }
    if (selectedItemIds.size === 0) {
      toast('请选择要发布的文章', 'error');
      return;
    }
    const platforms = [...new Set([...selectedItemIds].map((id) => allItems.find((i) => i.id === id)?.platform).filter(Boolean))];
    const accountBindings = platforms
      .map((platform) => {
        const account = authorizedAccounts.find((a) => platformMatches(platform!, a.platform));
        return account ? { platform: platform!, accountBindingId: account.id } : null;
      })
      .filter(Boolean) as Array<{ platform: string; accountBindingId: string }>;
    if (accountBindings.length !== platforms.length) {
      toast('部分平台未完成本机登录确认，请先在发布账号页确认', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/publish-plans/bulk-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          name: scheduleName.trim(),
          projectIds: [...selectedProjectIds],
          contentItemIds: [...selectedItemIds],
          accountBindings,
          schedule: {
            mode: scheduleMode,
            startAt: new Date(startAt).toISOString(),
            intervalMinutes,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? '排程失败', 'error');
        return;
      }
      toast(`已创建 ${data.jobCount} 条发布任务，到点后逐条 Hermes 执行`, 'success');
      setScheduleName('');
      setSelectedItemIds(new Set());
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const execute = async (id: string) => {
    await fetch(`/api/publish-plans/${id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName }),
    });
    load();
  };

  return (
    <div className="geo-page-content space-y-4">
      <PageHeaderWithBrand
        title="多项目发布排程"
        brandName={brandName}
        onBrandChange={onBrandChange}
      />

      <div className="geo-card p-4 space-y-4">
        <input
          className="geo-input w-full text-sm"
          placeholder="排程名称，如：6 月种植牙内容发布"
          value={scheduleName}
          onChange={(e) => setScheduleName(e.target.value)}
        />

        <div>
          <p className="text-xs font-medium mb-2">选择项目（可多选）</p>
          <div className="flex flex-wrap gap-2">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProject(p.id)}
                className={`text-xs px-2.5 py-1.5 rounded-md ${
                  selectedProjectIds.has(p.id) ? 'geo-nav-active' : 'geo-nav-item'
                }`}
              >
                {p.name}
              </button>
            ))}
            {projects.length === 0 && (
              <span className="text-xs text-[var(--neutral-text-03)]">暂无项目，请先生成文章或在文章结果中新建分组</span>
            )}
          </div>
        </div>

        {selectedProjectIds.size > 0 && (
          <div>
            <div className="flex flex-wrap gap-2 mb-2 items-center">
              <p className="text-xs font-medium">选择文章</p>
              <select
                className="geo-input text-xs"
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
              >
                <option value="">全部渠道</option>
                {[...new Set(allItems.map((i) => i.platform))].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button type="button" className="geo-link text-xs" onClick={selectAllItems}>
                全选待发布
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              {filteredItems.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedItemIds.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                  />
                  <span className="truncate">
                    [{item.platform}] {item.title}
                  </span>
                </label>
              ))}
              {filteredItems.length === 0 && (
                <p className="text-xs text-[var(--neutral-text-03)]">所选项目暂无待发布文章</p>
              )}
            </div>
            <p className="text-[11px] text-[var(--neutral-text-03)] mt-1">
              已选 {selectedItemIds.size} 篇 · 账号按平台自动匹配已确认登录
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs block mb-1">排程模式</label>
            <select
              className="geo-input w-full text-sm"
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value as typeof scheduleMode)}
            >
              <option value="staggered">间隔错峰</option>
              <option value="single">单一时间点起排队</option>
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1">开始时间</label>
            <input
              type="datetime-local"
              className="geo-input w-full text-sm"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          {scheduleMode === 'staggered' && (
            <div>
              <label className="text-xs block mb-1">间隔（分钟）</label>
              <input
                type="number"
                min={5}
                className="geo-input w-full text-sm"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          className="geo-btn-primary text-sm"
          disabled={submitting}
          onClick={() => void bulkSchedule()}
        >
          {submitting ? '创建中…' : `创建排程（${selectedItemIds.size} 条任务）`}
        </button>
      </div>

      <div className="geo-card overflow-hidden">
        <div className="p-3 border-b font-semibold text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          发布任务明细（PublishJob）
        </div>
        <table className="w-full text-sm geo-table">
          <thead>
            <tr>
              <th>计划</th>
              <th>平台</th>
              <th>计划时间</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-[var(--neutral-text-03)]">
                  暂无排程任务
                </td>
              </tr>
            ) : (
              jobs.slice(0, 30).map((j) => (
                <tr key={j.id}>
                  <td className="text-xs font-mono">{j.planId.slice(0, 8)}…</td>
                  <td>{j.platform}</td>
                  <td className="text-xs whitespace-nowrap">{j.scheduledAt.slice(0, 16).replace('T', ' ')}</td>
                  <td>{j.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="geo-card overflow-hidden">
        <div className="p-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          <span className="font-semibold text-sm">历史发布计划</span>
          <button type="button" className="geo-link text-xs" onClick={() => setShowLegacy(!showLegacy)}>
            {showLegacy ? '收起单批次计划' : '单批次计划（旧）'}
          </button>
        </div>
        <table className="w-full text-sm geo-table">
          <thead>
            <tr>
              <th className="text-left">名称</th>
              <th>类型</th>
              <th>状态</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="text-xs">{p.sourceType}</td>
                <td>{p.status}</td>
                <td>
                  {p.status === 'draft' && p.sourceType === 'content_batch' && (
                    <button type="button" className="geo-link text-xs inline-flex gap-1" onClick={() => execute(p.id)}>
                      <Play className="w-3 h-3" /> 执行
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

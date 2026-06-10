import { useEffect, useState } from 'react';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import type { AgentTask, ViewType } from '../types';
import { getResultConfirmUiStatus, isResultConfirmPending } from '../lib/agent-result-confirmation';
import { navigateToAgentTaskResult } from '../lib/agent-task-result-nav';
import { buildLoopNavigateHint, applyLoopNavigateUrl } from '../lib/geo-capability-loop';
import TaskStatusPill from './common/TaskStatusPill';
import AgentTaskResultConfirmPanel from './agent/AgentTaskResultConfirmPanel';

const GROUPS = [
  { id: 'brand', label: '品牌词' },
  { id: 'industry', label: '行业词' },
  { id: 'longtail', label: '长尾词' },
  { id: 'geo', label: '地域词' },
  { id: 'competitor', label: '竞品词' },
] as const;

interface Keyword {
  id: string;
  term: string;
  group: string;
  source: string;
}

interface Props {
  brandName: string;
  initialTab?: string;
  embedded?: boolean;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function KeywordLibraryView({
  brandName,
  initialTab,
  embedded,
  onNavigate,
}: Props) {
  const [activeGroup, setActiveGroup] = useState(initialTab === 'mine' ? 'mine' : 'brand');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newTerm, setNewTerm] = useState('');
  const [mining, setMining] = useState(false);
  const [profile, setProfile] = useState<{ industry?: string; keywords?: string[] }>({});
  const [lastMiningTask, setLastMiningTask] = useState<AgentTask | null>(null);
  const [allKeywords, setAllKeywords] = useState<Keyword[]>([]);

  const loadAllKeywords = () => {
    fetch(`/api/keywords?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => setAllKeywords(d.keywords ?? []))
      .catch(() => setAllKeywords([]));
  };

  const load = () => {
    const params = new URLSearchParams({ brandName });
    if (activeGroup !== 'mine') params.set('group', activeGroup);
    fetch(`/api/keywords?${params}`)
      .then((r) => r.json())
      .then((d) => setKeywords(d.keywords ?? []))
      .catch(() => {});
  };

  const loadLastMiningTask = () => {
    fetch(`/api/agent-tasks?brandName=${encodeURIComponent(brandName)}&type=keyword_mining&limit=5`)
      .then((r) => r.json())
      .then((d) => {
        const tasks = (d.tasks ?? []) as AgentTask[];
        setLastMiningTask(tasks[0] ?? null);
      })
      .catch(() => setLastMiningTask(null));
  };

  useEffect(() => {
    loadAllKeywords();
  }, [brandName]);

  useEffect(() => {
    fetch(`/api/brand-profile?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {});
  }, [brandName]);

  useEffect(() => {
    if (activeGroup !== 'mine') load();
  }, [brandName, activeGroup]);

  useEffect(() => {
    if (activeGroup === 'mine') loadLastMiningTask();
  }, [brandName, activeGroup, mining]);

  useEffect(() => {
    if (activeGroup !== 'mine' || !lastMiningTask?.id) return;
    if (!['running', 'queued', 'pending_confirm'].includes(lastMiningTask.status)) return;
    const timer = setInterval(() => loadLastMiningTask(), 3000);
    return () => clearInterval(timer);
  }, [activeGroup, lastMiningTask?.id, lastMiningTask?.status, brandName]);

  const addKeyword = async () => {
    if (!newTerm.trim()) return;
    await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName, term: newTerm, group: activeGroup === 'mine' ? 'longtail' : activeGroup }),
    });
    setNewTerm('');
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/keywords/${id}?brandName=${encodeURIComponent(brandName)}`, { method: 'DELETE' });
    load();
  };

  const runMining = async () => {
    setMining(true);
    const res = await fetch('/api/agent-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'keyword_mining',
        title: `AI 挖词 · ${brandName}`,
        brandName,
        input: {
          brand: brandName,
          industry: profile.industry,
          seedKeywords: profile.keywords ?? [],
        },
      }),
    });
    const { task } = await res.json();
    setMining(false);
    if (!task?.id) return;
    setLastMiningTask(task);
    loadLastMiningTask();
  };

  const displayKeywords = activeGroup === 'mine' ? keywords : keywords;
  const miningStatusLabel = lastMiningTask ? getResultConfirmUiStatus(lastMiningTask) : null;

  return (
    <div className={`space-y-4 ${embedded ? 'p-6' : 'geo-page-content'}`}>
      {!embedded && <h2 className="text-lg font-bold">关键词库</h2>}
      <p className="text-xs text-[var(--neutral-text-03)]">供文章生成、GEO 分析、收录查询共用</p>

      {onNavigate && allKeywords.length > 0 && (
        <div className="geo-card p-3 flex flex-wrap gap-2">
          <span className="text-xs text-[var(--neutral-text-03)] w-full mb-1">词库已就绪 · 继续闭环</span>
          {(['detect', 'monitor', 'write'] as const).map((step) => {
            const nav = buildLoopNavigateHint(step, {
              brandName,
              keywordIds: allKeywords.slice(0, 20).map((k) => k.id),
            });
            return (
              <button
                key={step}
                type="button"
                className="geo-btn-secondary geo-btn-xs"
                onClick={() => {
                  if (nav.urlParams) applyLoopNavigateUrl(nav.urlParams);
                  onNavigate(nav.view, nav.hint);
                }}
              >
                {step === 'detect' ? 'GEO 检测' : step === 'monitor' ? '创建监测' : '生成文章'}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActiveGroup(g.id)}
            className={`px-3 py-1.5 rounded-lg text-xs ${activeGroup === g.id ? 'geo-nav-active' : 'geo-nav-item'}`}
          >
            {g.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setActiveGroup('mine')}
          className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 ${activeGroup === 'mine' ? 'geo-nav-active' : 'geo-nav-item'}`}
        >
          <Sparkles className="w-3 h-3" /> AI 挖词
        </button>
      </div>

      {activeGroup === 'mine' ? (
        <div className="space-y-4">
          <div className="geo-card p-4 space-y-3">
            <p className="text-sm">基于品牌资料、行业、现有关键词生成候选词。</p>
            <div className="text-xs text-[var(--neutral-text-03)] space-y-1">
              <p>当前品牌：{brandName}</p>
              {profile.industry && <p>行业：{profile.industry}</p>}
              {(profile.keywords?.length ?? 0) > 0 && (
                <p>种子词：{profile.keywords!.slice(0, 5).join('、')}{(profile.keywords!.length > 5 ? '…' : '')}</p>
              )}
            </div>
            <button type="button" className="geo-btn-primary text-sm" disabled={mining} onClick={() => void runMining()}>
              {mining ? '提交中…' : '开始 AI 挖词'}
            </button>
            <p className="text-xs text-[var(--neutral-text-03)]">
              提交后可离开本页，完成后在消息通知中确认入库。
            </p>
          </div>

          {lastMiningTask && (
            <div className="geo-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-medium">最近一次任务</p>
                <TaskStatusPill status={lastMiningTask.status} />
              </div>
              <p className="text-xs text-[var(--neutral-text-03)]">{lastMiningTask.title}</p>
              {miningStatusLabel && (
                <p className="text-xs font-medium text-amber-800">{miningStatusLabel}</p>
              )}
              <p className="text-xs text-[var(--neutral-text-03)]">
                {lastMiningTask.status === 'succeeded' && miningStatusLabel === '待确认入库'
                  ? '候选词已生成，请确认后写入关键词库。'
                  : lastMiningTask.status === 'running' || lastMiningTask.status === 'queued'
                    ? '任务执行中，完成后将通知你确认。'
                    : '可在运行日志查看详情。'}
              </p>
              {onNavigate && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {isResultConfirmPending(lastMiningTask) && (
                    <button
                      type="button"
                      className="geo-btn-primary geo-btn-xs"
                      onClick={() => navigateToAgentTaskResult(onNavigate, lastMiningTask.id)}
                    >
                      查看结果
                    </button>
                  )}
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-xs"
                    onClick={() => onNavigate('agent_tasks', lastMiningTask.id)}
                  >
                    查看运行日志
                  </button>
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-xs"
                    onClick={() => onNavigate('notifications')}
                  >
                    查看通知
                  </button>
                </div>
              )}

              {isResultConfirmPending(lastMiningTask) && (
                <div className="pt-3 border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
                  <p className="text-xs font-semibold text-[var(--color-title)] mb-2">
                    确认入库（按词性写入对应分组）
                  </p>
                  <AgentTaskResultConfirmPanel
                    task={lastMiningTask}
                    compact
                    showRegenerate={false}
                    onUpdated={() => {
                      loadLastMiningTask();
                      load();
                      loadAllKeywords();
                    }}
                    onNavigate={onNavigate}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="geo-input geo-input-inline text-sm min-w-[12rem] flex-1 max-w-md"
              placeholder="新增关键词"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void addKeyword()}
            />
            <button
              type="button"
              className="geo-btn-primary geo-btn-sm inline-flex flex-row items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
              onClick={() => void addKeyword()}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>添加</span>
            </button>
          </div>
          <div className="geo-table-wrap">
            <table className="geo-table">
              <thead>
                <tr>
                  <th>关键词</th>
                  <th>来源</th>
                  <th className="geo-table__actions" aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {displayKeywords.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-[var(--neutral-text-03)]">
                      暂无关键词
                    </td>
                  </tr>
                ) : (
                  displayKeywords.map((k) => (
                    <tr key={k.id}>
                      <td>{k.term}</td>
                      <td className="text-xs">{k.source === 'ai_mining' ? 'AI 挖词' : '手动'}</td>
                      <td>
                        <button type="button" onClick={() => remove(k.id)} className="text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

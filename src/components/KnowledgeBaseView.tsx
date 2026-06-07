import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { AgentTask, ViewType } from '../types';
import { getResultConfirmUiStatus } from '../lib/agent-result-confirmation';
import TaskStatusPill from './common/TaskStatusPill';

const CATEGORIES = [
  { id: 'intro', label: '企业介绍' },
  { id: 'product', label: '产品服务' },
  { id: 'case', label: '客户案例' },
  { id: 'credential', label: '资质背书' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: '联系方式' },
] as const;

interface Entry {
  id: string;
  category: string;
  title: string;
  body: string;
  sortOrder: number;
}

interface Props {
  brandName: string;
  embedded?: boolean;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function KnowledgeBaseView({ brandName, embedded, onNavigate }: Props) {
  const [mode, setMode] = useState<'browse' | 'ai'>('browse');
  const [category, setCategory] = useState<string>('intro');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [profile, setProfile] = useState<{ industry?: string; description?: string }>({});
  const [lastExtractTask, setLastExtractTask] = useState<AgentTask | null>(null);

  const load = () => {
    fetch(`/api/knowledge?brandName=${encodeURIComponent(brandName)}&category=${category}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {});
  };

  const loadLastExtractTask = () => {
    fetch(`/api/agent-tasks?brandName=${encodeURIComponent(brandName)}&type=knowledge_extract&limit=5`)
      .then((r) => r.json())
      .then((d) => {
        const tasks = (d.tasks ?? []) as AgentTask[];
        setLastExtractTask(tasks[0] ?? null);
      })
      .catch(() => setLastExtractTask(null));
  };

  useEffect(() => {
    fetch(`/api/brand-profile?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {});
  }, [brandName]);

  useEffect(() => {
    if (mode === 'browse') {
      load();
      setEditingId(null);
      setTitle('');
      setBody('');
    }
  }, [brandName, category, mode]);

  useEffect(() => {
    if (mode === 'ai') loadLastExtractTask();
  }, [brandName, mode, extracting]);

  const save = async () => {
    await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName,
        id: editingId ?? undefined,
        category,
        title: title || CATEGORIES.find((c) => c.id === category)?.label,
        body,
      }),
    });
    setTitle('');
    setBody('');
    setEditingId(null);
    load();
  };

  const edit = (e: Entry) => {
    setEditingId(e.id);
    setTitle(e.title);
    setBody(e.body);
  };

  const remove = async (id: string) => {
    await fetch(`/api/knowledge/${id}?brandName=${encodeURIComponent(brandName)}`, {
      method: 'DELETE',
    });
    load();
  };

  const runExtract = async () => {
    setExtracting(true);
    const res = await fetch('/api/agent-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'knowledge_extract',
        title: `AI 知识库抽取 · ${brandName}`,
        brandName,
        input: {
          brand: brandName,
          industry: profile.industry,
          description: profile.description,
        },
      }),
    });
    const { task } = await res.json();
    setExtracting(false);
    if (!task?.id) return;
    setLastExtractTask(task);
    loadLastExtractTask();
  };

  const extractStatusLabel = lastExtractTask ? getResultConfirmUiStatus(lastExtractTask) : null;

  return (
    <div className={`overflow-y-auto h-full space-y-4 ${embedded ? 'p-6' : 'geo-page-content'}`}>
      {!embedded && <h2 className="text-lg font-bold">企业知识库</h2>}
      <p className="text-xs text-[var(--neutral-text-03)]">文章生成时将自动检索，提高内容真实度</p>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setMode('browse');
              setCategory(c.id);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs ${
              mode === 'browse' && category === c.id ? 'geo-nav-active' : 'geo-nav-item'
            }`}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMode('ai')}
          className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 ${
            mode === 'ai' ? 'geo-nav-active' : 'geo-nav-item'
          }`}
        >
          <Sparkles className="w-3 h-3" /> AI 抽取
        </button>
      </div>

      {mode === 'ai' ? (
        <div className="space-y-4">
          <div className="geo-card p-4 space-y-3">
            <p className="text-sm">基于品牌资料与行业信息，生成企业介绍、产品服务、FAQ 等知识库草稿。</p>
            <div className="text-xs text-[var(--neutral-text-03)] space-y-1">
              <p>当前品牌：{brandName}</p>
              {profile.industry && <p>行业：{profile.industry}</p>}
              {profile.description && (
                <p className="line-clamp-2">业务描述：{profile.description}</p>
              )}
            </div>
            <button
              type="button"
              className="geo-btn-primary text-sm"
              disabled={extracting}
              onClick={() => void runExtract()}
            >
              {extracting ? '提交中…' : '开始 AI 抽取'}
            </button>
            <p className="text-xs text-[var(--neutral-text-03)]">
              提交后可离开本页，完成后在消息通知中确认入库。
            </p>
          </div>

          {lastExtractTask && (
            <div className="geo-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-medium">最近一次任务</p>
                <TaskStatusPill status={lastExtractTask.status} />
              </div>
              <p className="text-xs text-[var(--neutral-text-03)]">{lastExtractTask.title}</p>
              {extractStatusLabel && (
                <p className="text-xs font-medium text-amber-800">{extractStatusLabel}</p>
              )}
              <p className="text-xs text-[var(--neutral-text-03)]">
                {lastExtractTask.status === 'succeeded' && extractStatusLabel === '待确认入库'
                  ? '知识库条目已生成，请确认后写入企业知识库。'
                  : lastExtractTask.status === 'running' || lastExtractTask.status === 'queued'
                    ? '任务执行中，完成后将通知你确认。'
                    : '可在运行日志查看详情。'}
              </p>
              {onNavigate && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-xs"
                    onClick={() => onNavigate('agent_tasks', lastExtractTask.id)}
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
            </div>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="geo-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">{editingId ? '编辑条目' : '新增条目'}</h3>
            <input
              className="geo-input w-full text-sm"
              placeholder="标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="geo-input w-full text-sm min-h-[160px]"
              placeholder="正文内容"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <button type="button" className="geo-btn-primary text-sm" onClick={save}>
              保存
            </button>
          </div>
          <div className="geo-card p-4">
            <h3 className="text-sm font-semibold mb-3">已有条目</h3>
            {entries.length === 0 ? (
              <p className="text-xs text-[var(--neutral-text-03)]">该分类暂无内容</p>
            ) : (
              <ul className="space-y-2">
                {entries.map((e) => (
                  <li
                    key={e.id}
                    className="border rounded-lg p-3 text-sm"
                    style={{ borderColor: 'var(--neutral-divider-02)' }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <strong>{e.title}</strong>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" className="geo-link text-xs" onClick={() => edit(e)}>
                          编辑
                        </button>
                        <button type="button" className="text-xs text-red-500" onClick={() => remove(e.id)}>
                          删除
                        </button>
                      </div>
                    </div>
                    <p className="text-xs mt-2 text-[var(--neutral-text-03)] line-clamp-3">{e.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

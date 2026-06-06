import { useEffect, useState } from 'react';
import { Sparkles, Plus, Trash2 } from 'lucide-react';

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
}

export default function KeywordLibraryView({ brandName, initialTab, embedded }: Props) {
  const [activeGroup, setActiveGroup] = useState(initialTab === 'mine' ? 'mine' : 'brand');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newTerm, setNewTerm] = useState('');
  const [mining, setMining] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ term: string; group: string }>>([]);
  const [profile, setProfile] = useState<{ industry?: string; keywords?: string[] }>({});

  const load = () => {
    const params = new URLSearchParams({ brandName });
    if (activeGroup !== 'mine') params.set('group', activeGroup);
    fetch(`/api/keywords?${params}`)
      .then((r) => r.json())
      .then((d) => setKeywords(d.keywords ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    fetch(`/api/brand-profile?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {});
  }, [brandName]);

  useEffect(() => {
    if (activeGroup !== 'mine') load();
  }, [brandName, activeGroup]);

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
    setSuggestions([]);
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
    if (!task?.id) {
      setMining(false);
      return;
    }
    const poll = setInterval(async () => {
      const tr = await fetch(`/api/agent-tasks/${task.id}`).then((r) => r.json());
      if (tr.task?.status === 'succeeded') {
        clearInterval(poll);
        setMining(false);
        const sug = (tr.task.output?.suggestions as Array<{ term: string; group: string }>) ?? [];
        setSuggestions(sug);
        load();
      } else if (tr.task?.status === 'failed') {
        clearInterval(poll);
        setMining(false);
      }
    }, 2000);
  };

  const importSuggestions = async () => {
    if (!suggestions.length) return;
    await fetch('/api/keywords/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName,
        items: suggestions.map((s) => ({ term: s.term, group: s.group, source: 'ai_mining' })),
      }),
    });
    setSuggestions([]);
    setActiveGroup('longtail');
    load();
  };

  const displayKeywords = activeGroup === 'mine' ? keywords : keywords;

  return (
    <div className={`overflow-y-auto h-full space-y-4 ${embedded ? 'p-6' : 'geo-page-content'}`}>
      {!embedded && <h2 className="text-lg font-bold">关键词库</h2>}
      <p className="text-xs text-[var(--neutral-text-03)]">供文章生成、GEO 分析、收录查询共用</p>

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
        <div className="geo-card p-4 space-y-3">
          <p className="text-sm">基于品牌与行业，AI 生成候选关键词并一键入库。</p>
          <button type="button" className="geo-btn-primary text-sm" disabled={mining} onClick={runMining}>
            {mining ? '挖掘中…' : '开始 AI 挖词'}
          </button>
          {suggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2">建议词（{suggestions.length}）</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {suggestions.map((s) => (
                  <span key={s.term} className="text-xs px-2 py-1 rounded bg-[var(--neutral-bg-03)]">
                    {s.term}
                  </span>
                ))}
              </div>
              <button type="button" className="geo-btn-primary text-sm" onClick={importSuggestions}>
                一键加入词库
              </button>
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
          <div className="geo-card overflow-hidden">
            <table className="w-full text-sm geo-table">
              <thead>
                <tr>
                  <th className="text-left">关键词</th>
                  <th>来源</th>
                  <th />
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

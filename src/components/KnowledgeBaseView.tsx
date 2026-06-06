import { useEffect, useState } from 'react';

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
}

export default function KnowledgeBaseView({ brandName, embedded }: Props) {
  const [category, setCategory] = useState<string>('intro');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    fetch(`/api/knowledge?brandName=${encodeURIComponent(brandName)}&category=${category}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    setEditingId(null);
    setTitle('');
    setBody('');
  }, [brandName, category]);

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

  return (
    <div className={`overflow-y-auto h-full space-y-4 ${embedded ? 'p-6' : 'geo-page-content'}`}>
      {!embedded && <h2 className="text-lg font-bold">企业知识库</h2>}
      <p className="text-xs text-[var(--neutral-text-03)]">文章生成时将自动检索，提高内容真实度</p>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs ${category === c.id ? 'geo-nav-active' : 'geo-nav-item'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

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
                <li key={e.id} className="border rounded-lg p-3 text-sm" style={{ borderColor: 'var(--neutral-divider-02)' }}>
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
    </div>
  );
}

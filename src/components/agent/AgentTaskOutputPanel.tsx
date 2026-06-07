import { useState } from 'react';
import type { AgentTask } from '../../types';
import { KEYWORD_GROUP_OPTIONS } from '../../lib/agent-result-confirmation';

export type TaskDeliverableView = {
  format: 'markdown' | 'html' | 'pdf' | 'structured' | 'text';
  title: string;
  content?: string;
  url?: string;
  hideRawJson?: boolean;
  structured?: {
    type?: string;
    groups?: Record<string, string[]>;
    total?: number;
  };
};

interface Props {
  task: AgentTask;
  deliverable?: TaskDeliverableView | null;
}

function KeywordGroupsPreview({ groups }: { groups: Record<string, string[]> }) {
  const labelFor = (id: string) =>
    KEYWORD_GROUP_OPTIONS.find((g) => g.id === id)?.label ?? id;

  return (
    <div className="space-y-3">
      {KEYWORD_GROUP_OPTIONS.map(({ id, label }) => {
        const terms = groups[id] ?? [];
        if (!terms.length) return null;
        return (
          <div key={id}>
            <p className="text-xs font-semibold text-[var(--color-title)] mb-1">{label}</p>
            <div className="flex flex-wrap gap-1.5">
              {terms.map((term) => (
                <span
                  key={term}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--neutral-bg-03)] border"
                  style={{ borderColor: 'var(--neutral-divider-02)' }}
                >
                  {term}
                </span>
              ))}
            </div>
          </div>
        );
      })}
      {Object.entries(groups)
        .filter(([id]) => !KEYWORD_GROUP_OPTIONS.some((g) => g.id === id))
        .map(([id, terms]) =>
          terms.length ? (
            <div key={id}>
              <p className="text-xs font-semibold text-[var(--color-title)] mb-1">{labelFor(id)}</p>
              <div className="flex flex-wrap gap-1.5">
                {terms.map((term) => (
                  <span key={term} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--neutral-bg-03)]">
                    {term}
                  </span>
                ))}
              </div>
            </div>
          ) : null
        )}
    </div>
  );
}

export default function AgentTaskOutputPanel({ task, deliverable }: Props) {
  const [showTechnical, setShowTechnical] = useState(false);
  const hideRaw = deliverable?.hideRawJson ?? false;

  if (!task.output && !deliverable) return null;

  return (
    <div className="geo-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xs font-semibold text-[var(--color-text-secondary)]">业务交付物</h2>
        {hideRaw && task.output && (
          <button
            type="button"
            className="text-[10px] text-[var(--neutral-text-03)] underline"
            onClick={() => setShowTechnical((v) => !v)}
          >
            {showTechnical ? '隐藏技术详情' : '查看原始 JSON（开发）'}
          </button>
        )}
      </div>

      {!deliverable && (
        <p className="text-xs text-[var(--neutral-text-03)]">暂无结构化交付物预览。</p>
      )}

      {deliverable?.format === 'markdown' && deliverable.content && (
        <pre className="text-xs whitespace-pre-wrap leading-relaxed overflow-auto max-h-[420px] bg-[var(--color-bg)] p-3 rounded-lg">
          {deliverable.content}
        </pre>
      )}

      {deliverable?.format === 'html' && deliverable.content && (
        <div
          className="text-xs overflow-auto max-h-[420px] bg-white p-3 rounded-lg border"
          style={{ borderColor: 'var(--neutral-divider-02)' }}
          dangerouslySetInnerHTML={{ __html: deliverable.content }}
        />
      )}

      {deliverable?.format === 'pdf' && deliverable.url && (
        <a
          href={deliverable.url}
          target="_blank"
          rel="noreferrer"
          className="geo-btn-primary geo-btn-sm inline-flex"
        >
          下载 {deliverable.title}
        </a>
      )}

      {deliverable?.format === 'structured' &&
        deliverable.structured?.type === 'keyword_suggestions' &&
        deliverable.structured.groups && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--neutral-text-03)]">
              共 {deliverable.structured.total ?? 0} 个候选词，确认后将写入对应分组（品牌词 / 行业词 / 长尾词 / 地域词 / 竞品词）。
            </p>
            <KeywordGroupsPreview groups={deliverable.structured.groups} />
          </div>
        )}

      {deliverable?.format === 'text' && deliverable.content && (
        <p className="text-sm text-[var(--neutral-text-02)]">{deliverable.content}</p>
      )}

      {(!hideRaw || showTechnical) && task.output && (
        <div>
          {!hideRaw && (
            <p className="text-[10px] text-[var(--neutral-text-03)] mb-1">原始输出（JSON）</p>
          )}
          <pre className="text-[10px] font-mono bg-[var(--color-bg)] p-3 rounded-lg overflow-auto max-h-64">
            {JSON.stringify(task.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

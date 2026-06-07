import { useMemo, useState } from 'react';
import { AlertCircle, ChevronUp } from 'lucide-react';
import type { ViewType } from '../../types';

export interface WorkbenchTodo {
  id: string;
  label: string;
  priority: string;
  targetView: string;
  targetHint?: string;
}

const VISIBLE_COLLAPSED = 2;

interface Props {
  todos: WorkbenchTodo[];
  onNavigate: (view: ViewType, hint?: string) => void;
}

function priorityRank(p: string) {
  if (p === 'P0') return 0;
  if (p === 'P1') return 1;
  return 2;
}

function TodoChip({
  todo,
  onNavigate,
}: {
  todo: WorkbenchTodo;
  onNavigate: (view: ViewType, hint?: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(todo.targetView as ViewType, todo.targetHint)}
      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-white/70 hover:bg-white border border-[var(--color-warning)]/25 max-w-full"
    >
      <span
        className={`geo-tag text-[10px] py-0 px-1.5 shrink-0 ${
          todo.priority === 'P0' ? 'geo-tag-warning' : 'geo-tag-muted'
        }`}
      >
        {todo.priority}
      </span>
      <span className="truncate">{todo.label}</span>
    </button>
  );
}

export default function WorkbenchAlertStrip({ todos, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () => [...todos].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)),
    [todos],
  );

  if (todos.length === 0) return null;

  const primary = sorted.slice(0, VISIBLE_COLLAPSED);
  const rest = sorted.slice(VISIBLE_COLLAPSED);
  const hasMore = rest.length > 0;

  return (
    <div
      className="rounded-lg border border-[var(--color-warning)]/35 bg-[var(--color-warning-bg)] px-3 py-2"
      role="region"
      aria-label="待处理事项"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-[var(--color-warning)] shrink-0">
          <AlertCircle className="w-3.5 h-3.5" aria-hidden />
          待处理 {todos.length}
        </span>
        {primary.map((t) => (
          <span key={t.id} className="inline-flex max-w-full">
            <TodoChip todo={t} onNavigate={onNavigate} />
          </span>
        ))}
        {hasMore && !expanded && (
          <button
            type="button"
            className="text-xs font-medium text-[var(--color-accent)] hover:underline"
            onClick={() => setExpanded(true)}
          >
            +{rest.length} 展开
          </button>
        )}
        {expanded && hasMore && (
          <button
            type="button"
            className="text-xs text-[var(--neutral-text-03)] inline-flex items-center gap-0.5 hover:text-[var(--color-text)]"
            onClick={() => setExpanded(false)}
          >
            收起
            <ChevronUp className="w-3 h-3" aria-hidden />
          </button>
        )}
      </div>
      {expanded && hasMore && (
        <div className="mt-2 pt-2 flex flex-wrap gap-2 border-t border-[var(--color-warning)]/25">
          {rest.map((t) => (
            <span key={t.id} className="inline-flex max-w-full">
              <TodoChip todo={t} onNavigate={onNavigate} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

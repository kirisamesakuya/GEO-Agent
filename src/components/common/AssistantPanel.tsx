import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';

export interface AssistantSuggestion {
  id: string;
  label: string;
  apply: () => void;
}

interface AssistantPanelProps {
  title?: string;
  summary: string;
  suggestions: AssistantSuggestion[];
  onSendMessage?: (message: string) => void;
  placeholder?: string;
  className?: string;
}

export default function AssistantPanel({
  title = '配置助手',
  summary,
  suggestions,
  onSendMessage,
  placeholder = '用自然语言补充参数，例如：更像小红书、加入本地化关键词…',
  className = '',
}: AssistantPanelProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || !onSendMessage) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <aside className={`geo-card p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-title)]">{title}</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">建议会先应用到表单，不会直接提交任务</p>
        </div>
      </div>

      <p className="text-xs text-[var(--color-text)] leading-relaxed bg-[var(--color-bg)] rounded-lg p-3">
        {summary}
      </p>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={s.apply}
            className="text-xs px-3 py-1.5 rounded-md border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      {onSendMessage && (
        <div className="flex gap-2 mt-auto pt-2 border-t border-[var(--color-border)]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={placeholder}
            className="flex-1 text-sm px-3 py-2 rounded-md border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            className="geo-btn-primary px-3 flex items-center gap-1 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}

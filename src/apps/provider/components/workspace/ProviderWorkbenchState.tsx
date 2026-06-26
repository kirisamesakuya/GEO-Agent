import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

type Mode = 'loading' | 'empty' | 'error';

interface Props {
  mode: Mode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export default function ProviderWorkbenchState({ mode, title, description, action }: Props) {
  const defaults = {
    loading: { title: '加载中…', description: '正在获取最新数据' },
    empty: { title: '暂无数据', description: '当前筛选条件下没有可展示的内容' },
    error: { title: '加载失败', description: '请稍后重试或检查网络连接' },
  }[mode];

  return (
    <div className="provider-section-card flex flex-col items-center justify-center text-center py-14 px-6">
      {mode === 'loading' && <Loader2 className="w-8 h-8 text-workbench animate-spin mb-3" />}
      {mode === 'empty' && <Inbox className="w-8 h-8 text-provider-muted mb-3" />}
      {mode === 'error' && <AlertCircle className="w-8 h-8 text-red-500 mb-3" />}
      <p className="text-sm font-semibold text-provider-title">{title ?? defaults.title}</p>
      <p className="text-xs text-provider-muted mt-1 max-w-sm">{description ?? defaults.description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

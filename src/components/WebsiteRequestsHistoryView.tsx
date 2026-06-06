import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, FileText } from 'lucide-react';

export interface WebsiteAttachment {
  name: string;
  url: string;
  mimeType?: string;
}

export interface WebsiteRequest {
  id: string;
  pageType: string;
  goal: string;
  status: string;
  previewHtml?: string;
  modules?: string[];
  attachments?: WebsiteAttachment[];
  createdAt: string;
}

interface Props {
  brandName: string;
  onBack: () => void;
  onSelect: (req: WebsiteRequest) => void;
}

export default function WebsiteRequestsHistoryView({ brandName, onBack, onSelect }: Props) {
  const [history, setHistory] = useState<WebsiteRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/website-requests?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((d) => setHistory(d.requests ?? []))
      .finally(() => setLoading(false));
  }, [brandName]);

  return (
    <div className="geo-page-content h-full overflow-y-auto space-y-4 pb-8">
      <button type="button" className="geo-btn-secondary text-sm flex items-center gap-2" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        返回创建网页
      </button>

      <div>
        <h1 className="text-lg font-bold text-[var(--color-title)]">历史需求</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {brandName} 的网页创建记录，点击可载入预览与配置
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">加载中…</p>
      ) : history.length === 0 ? (
        <div className="geo-card p-8 text-center text-sm text-[var(--color-text-secondary)]">暂无历史记录</div>
      ) : (
        <div className="space-y-2">
          {history.map((req) => (
            <button
              key={req.id}
              type="button"
              onClick={() => onSelect(req)}
              className="w-full text-left geo-card p-4 flex items-center justify-between gap-3 hover:bg-[var(--color-primary-light)] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium text-[var(--color-title)]">
                  <FileText className="w-4 h-4 shrink-0 text-[var(--color-accent)]" />
                  {req.pageType}
                </div>
                <p className="text-xs mt-1 truncate" style={{ color: 'var(--neutral-text-03)' }}>
                  {req.goal}
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--neutral-text-03)' }}>
                  {req.status} · {new Date(req.createdAt).toLocaleString('zh-CN')}
                  {(req.attachments?.length ?? 0) > 0 && ` · ${req.attachments!.length} 个附件`}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 text-[var(--color-text-secondary)]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

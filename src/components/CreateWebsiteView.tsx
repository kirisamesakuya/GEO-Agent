import { useState, useCallback, useEffect } from 'react';
import { useAgentTaskPolling } from '../hooks/useAgentTaskPolling';
import type { AgentTask, AgentTaskStatus } from '../types';
import AgentInputCard from './common/AgentInputCard';
import TaskStatusPill from './common/TaskStatusPill';
import { resolveTaskPillDisplay } from '../lib/agent-task-display';
import { AgentTaskProgressHint, isAgentTaskInProgress } from './common/AgentTaskProgressLink';
import WebsiteRequestsHistoryView, { type WebsiteAttachment, type WebsiteRequest } from './WebsiteRequestsHistoryView';
import { useToast } from '../context/ToastContext';
import BrandScopeBar from './common/BrandScopeBar';
import { History, ChevronRight } from 'lucide-react';
import type { ViewType } from '../types';
import {
  DEFAULT_WEBSITE_MODULES,
  WEBSITE_ACCEPTANCE,
  WEBSITE_DELIVERABLE,
  WEBSITE_GOAL_PRESETS,
  WEBSITE_MODULE_OPTIONS,
  WEBSITE_PAGE_TYPES,
} from '../../lib/website-order-flow';

interface Props {
  brandName: string;
  onBrandChange: (name: string) => void;
  onNavigate?: (view: ViewType, hint?: string) => void;
  /** 嵌入「发布任务 · 网页改装」时隐藏品牌栏并改为纵向布局 */
  embedded?: boolean;
}

type PageMode = 'create' | 'history';

function syncWebsiteHistoryUrl(showHistory: boolean, embedded: boolean) {
  const url = new URL(window.location.href);
  if (!embedded) url.searchParams.set('view', 'create_website');
  if (showHistory) url.searchParams.set('websiteHistory', '1');
  else url.searchParams.delete('websiteHistory');
  window.history.pushState({}, '', url);
}

export default function CreateWebsiteView({
  brandName,
  onBrandChange,
  onNavigate,
  embedded = false,
}: Props) {
  const { toast } = useToast();
  const [pageMode, setPageMode] = useState<PageMode>(() =>
    new URLSearchParams(window.location.search).get('websiteHistory') === '1' ? 'history' : 'create'
  );
  const [pageType, setPageType] = useState<string>(WEBSITE_PAGE_TYPES[0]);
  const [goal, setGoal] = useState<string>(WEBSITE_GOAL_PRESETS[0]);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [modules, setModules] = useState<string[]>([...DEFAULT_WEBSITE_MODULES]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<WebsiteAttachment[]>([]);

  const toggleModule = (mod: string) => {
    setModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const openHistory = () => {
    setPageMode('history');
    syncWebsiteHistoryUrl(true, embedded);
  };

  const closeHistory = () => {
    setPageMode('create');
    syncWebsiteHistoryUrl(false, embedded);
  };

  const loadRequest = (req: WebsiteRequest) => {
    setRequestId(req.id);
    setPageType(req.pageType);
    setGoal(req.goal);
    setAttachments(req.attachments ?? []);
    if (req.modules?.length) setModules(req.modules);
    if (req.previewHtml) setPreviewHtml(req.previewHtml);
    closeHistory();
    toast('已载入历史需求', 'success');
  };

  const onComplete = useCallback(
    async (task: AgentTask) => {
      setLoading(false);
      if (task.output?.previewHtml) setPreviewHtml(String(task.output.previewHtml));
      if (task.output?.websiteRequestId) {
        const id = String(task.output.websiteRequestId);
        setRequestId(id);
        if (attachments.length > 0) {
          await fetch(`/api/website-requests/${id}/attachments`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attachments }),
          });
        }
      }
      toast('网页结构预览已生成', 'success');
    },
    [toast, attachments]
  );

  const onUpdate = useCallback((task: AgentTask) => setTaskStatus(resolveTaskPillDisplay(task).status), []);
  useAgentTaskPolling({ taskId, onUpdate, onComplete });

  const syncAttachments = async (id: string, items: WebsiteAttachment[]) => {
    await fetch(`/api/website-requests/${id}/attachments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachments: items }),
    });
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: dataUrl, mimeType: file.type }),
      });
      const data = await res.json();
      setUploading(false);
      if (data.error) {
        toast(data.error, 'error');
        return;
      }
      const next = [...attachments, { name: data.name, url: data.url, mimeType: data.mimeType }];
      setAttachments(next);
      if (requestId) {
        await syncAttachments(requestId, next);
      }
      toast('参考材料已上传', 'success');
    };
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!brandName || brandName === '__all__') {
      toast('请先选择具体品牌', 'error');
      return;
    }
    if (modules.length === 0) {
      toast('请至少选择一个页面模块', 'error');
      return;
    }
    setLoading(true);
    setTaskStatus('queued');
    const res = await fetch('/api/website-requests/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName,
        pageType,
        goal,
        referenceUrl,
        modules,
        attachments,
      }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      setLoading(false);
      return;
    }
    if (data.task) setTaskId(data.task.id);
  };

  const confirmOrder = async () => {
    if (!requestId) return;
    const res = await fetch(`/api/website-requests/${requestId}/confirm`, { method: 'POST' });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    if (data.order) {
      toast('网页改装任务已创建，请在任务交付 · 网页任务中跟踪', 'success');
      if (onNavigate) onNavigate('order_delivery', 'website');
    }
  };

  if (pageMode === 'history') {
    return (
      <WebsiteRequestsHistoryView brandName={brandName} onBack={closeHistory} onSelect={loadRequest} />
    );
  }

  const formCard = (
    <AgentInputCard
      title={embedded ? '网页改装需求' : '创建网页'}
      description="AI 生成页面结构、模块文案与 HTML 预览；确认后创建网页设计师接单任务（非文章写作单）"
      footer={
        <div className="flex flex-col gap-3 w-full">
          <div className="flex gap-2">
            <button
              type="button"
              className="geo-btn-primary text-sm flex-1"
              onClick={() => void generate()}
              disabled={loading || brandName === '__all__'}
            >
              {loading ? '生成预览中…' : 'AI 生成网页预览'}
            </button>
            {requestId && (
              <button type="button" className="geo-btn-secondary text-sm" onClick={() => void confirmOrder()}>
                确认创建网页任务
              </button>
            )}
          </div>
          {taskStatus && (
            <div className="flex flex-col gap-2 items-start">
              <TaskStatusPill status={taskStatus} />
              {isAgentTaskInProgress(taskStatus) && onNavigate && (
                <AgentTaskProgressHint onNavigate={onNavigate} taskId={taskId} />
              )}
            </div>
          )}
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--neutral-text-03)' }}>
            交付：{WEBSITE_DELIVERABLE}
            <br />
            验收：{WEBSITE_ACCEPTANCE}
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs block mb-2 font-medium">页面类型</label>
          <div className="flex flex-wrap gap-2">
            {WEBSITE_PAGE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPageType(t)}
                className={`text-xs px-3 py-1.5 rounded-lg ${
                  pageType === t ? 'geo-nav-active' : 'geo-nav-item'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs block mb-2 font-medium">页面目标</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {WEBSITE_GOAL_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setGoal(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-md text-left max-w-full ${
                  goal === preset ? 'geo-nav-active' : 'geo-nav-item'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg text-sm geo-input"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          />
        </div>

        <div>
          <label className="text-xs block mb-2 font-medium">页面模块（可多选）</label>
          <div className="flex flex-wrap gap-2">
            {WEBSITE_MODULE_OPTIONS.map((mod) => (
              <button
                key={mod}
                type="button"
                onClick={() => toggleModule(mod)}
                className={`text-xs px-2.5 py-1 rounded-md ${
                  modules.includes(mod) ? 'geo-nav-active' : 'geo-nav-item'
                }`}
              >
                {modules.includes(mod) ? '✓ ' : ''}
                {mod}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs block mb-1">参考 URL（可选）</label>
          <input
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="竞品或现有官网页面"
            className="w-full px-3 py-2 border rounded-lg text-sm geo-input"
            style={{ borderColor: 'var(--neutral-divider-02)' }}
          />
        </div>

        <div>
          <label className="text-xs block mb-1">参考材料（Logo / 截图 / 文档，可选）</label>
          <label className="geo-btn-secondary text-xs cursor-pointer inline-block">
            {uploading ? '上传中…' : '上传文件'}
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile(f);
                e.target.value = '';
              }}
            />
          </label>
          {attachments.length > 0 && (
            <ul className="mt-2 text-xs space-y-1">
              {attachments.map((a, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <a href={a.url} target="_blank" rel="noreferrer" className="truncate text-[var(--color-accent)]">
                    {a.name}
                  </a>
                  <button
                    type="button"
                    className="text-red-600 shrink-0"
                    onClick={() => {
                      const next = attachments.filter((_, j) => j !== i);
                      setAttachments(next);
                      if (requestId) void syncAttachments(requestId, next);
                    }}
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AgentInputCard>
  );

  const previewPane = (
    <div
      className={`overflow-hidden bg-white min-w-0 border rounded-lg ${
        embedded ? 'min-h-[320px]' : 'flex-1'
      }`}
      style={{ borderColor: 'var(--neutral-divider-02)' }}
    >
      {previewHtml ? (
        <iframe
          title="网页预览"
          srcDoc={previewHtml}
          className={`w-full border-0 ${embedded ? 'min-h-[320px] h-[50vh]' : 'h-full'}`}
          sandbox="allow-same-origin"
        />
      ) : (
        <div className={`flex items-center justify-center ${embedded ? 'min-h-[320px]' : 'h-full'}`}>
          <p className="text-sm text-center px-6" style={{ color: 'var(--neutral-text-03)' }}>
            生成预览后将在此显示 HTML 结构稿
            <br />
            <span className="text-xs">确认结构后创建网页任务，由网页设计师接单交付</span>
          </p>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto geo-page-content space-y-4 max-w-3xl px-6 pb-6">
        <div className="flex justify-end">
          <button
            type="button"
            className="geo-btn-secondary geo-btn-xs flex items-center gap-1"
            onClick={openHistory}
          >
            <History className="w-3.5 h-3.5" />
            历史需求
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
        <div className="geo-card p-4">{formCard}</div>
        {previewPane}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-4 pb-3 flex items-center justify-between gap-3 flex-wrap">
        <BrandScopeBar label="为哪个品牌创建网页" brandName={brandName} onBrandChange={onBrandChange} />
        <button
          type="button"
          className="geo-btn-secondary text-sm flex items-center gap-1.5 shrink-0"
          onClick={openHistory}
        >
          <History className="w-4 h-4" />
          历史需求
          <ChevronRight className="w-4 h-4 opacity-60" />
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div
          className="shrink-0 border-r overflow-y-auto p-6"
          style={{ width: 'var(--layout-panel-width)', borderColor: 'var(--neutral-divider-02)' }}
        >
          {formCard}
        </div>
        {previewPane}
      </div>
    </div>
  );
}

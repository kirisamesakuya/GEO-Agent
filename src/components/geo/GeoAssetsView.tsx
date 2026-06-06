import { useEffect, useState } from 'react';
import type { ViewType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAgentTaskPolling } from '../../hooks/useAgentTaskPolling';
import TaskStatusPill from '../common/TaskStatusPill';
import { resolveTaskPillDisplay } from '../../lib/agent-task-display';
import type { AgentTask, AgentTaskStatus } from '../../types';
import { confirmGeoAuditAction, submitGeoAgentTask } from '../../lib/geo-audit-client';
import { fetchGeoReports } from '../../lib/geo-report';

const ASSET_TYPES = [
  {
    id: 'geo_schema',
    skill: 'geo-schema',
    label: '网站结构化数据',
    short: 'Schema JSON-LD',
    desc: '给官网加上机器可读的机构/服务信息，方便 AI 与搜索引擎识别你是谁、做什么。',
    outputHint: '可复制嵌入官网 <head> 的 JSON-LD 代码片段',
  },
  {
    id: 'geo_llmstxt',
    skill: 'geo-llmstxt',
    label: 'AI 抓取说明文件',
    short: 'llms.txt',
    desc: '生成 llms.txt，告诉大模型爬虫哪些页面值得读、品牌核心信息在哪。',
    outputHint: '可上传到网站根目录的纯文本文件',
  },
  {
    id: 'geo_citability',
    skill: 'geo-citability',
    label: '内容可引用优化',
    short: '改写建议',
    desc: '分析现有文案为何难被 AI 引用，并给出更适合被摘录、推荐的改写方向。',
    outputHint: '段落级修改建议，需人工审核后再发布',
  },
] as const;

interface Props {
  brandName: string;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function GeoAssetsView({ brandName, onNavigate }: Props) {
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [activeType, setActiveType] = useState<(typeof ASSET_TYPES)[number]['id']>('geo_schema');
  const [preview, setPreview] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);

  useEffect(() => {
    if (!brandName || brandName === '__all__') return;
    void fetchGeoReports(brandName).then((rows) => {
      const latest = rows.find((r) => (r as { reportType?: string }).reportType === 'audit' || (r as { reportType?: string }).reportType === 'quick_start') ?? rows[0];
      if (latest) setReportId(latest.id);
    });
  }, [brandName]);

  const onComplete = (task: AgentTask) => {
    setLoading(false);
    setTaskStatus('succeeded');
    const artifacts = task.output?.artifacts as Array<{ preview?: string }> | undefined;
    const asset = task.output?.asset as { preview?: string } | undefined;
    setPreview(asset?.preview ?? artifacts?.[0]?.preview ?? '');
    if (task.output?.geoReportId) setReportId(String(task.output.geoReportId));
    toast('资产草稿已生成，请人工确认后使用', 'success');
  };
  const onUpdate = (task: AgentTask) => setTaskStatus(resolveTaskPillDisplay(task).status);
  useAgentTaskPolling({ taskId, onUpdate, onComplete });

  const generate = async () => {
    if (brandName === '__all__') {
      toast('请先选择具体品牌', 'error');
      return;
    }
    const spec = ASSET_TYPES.find((t) => t.id === activeType)!;
    setLoading(true);
    setTaskStatus('queued');
    const { task, error } = await submitGeoAgentTask({
      type: spec.id,
      title: `${brandName} · ${spec.label}`,
      brandName,
      payload: { skill: spec.skill, websiteUrl: websiteUrl.trim() || undefined, brandName },
    });
    if (error || !task) {
      toast(error ?? '生成失败', 'error');
      setLoading(false);
      return;
    }
    setTaskId(task.id);
  };

  const addToTaskPack = async () => {
    if (!reportId) {
      toast('请先有审计/检测报告', 'info');
      return;
    }
    try {
      await confirmGeoAuditAction(reportId, 'add_to_task_pack', 'medium', { assetType: activeType });
      toast('已记录确认，可前往发布任务生成任务包', 'success');
      onNavigate?.('create_order', `geo:${reportId}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作失败', 'error');
    }
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden geo-page-content px-6 pb-6 gap-4">
      <div className="w-52 shrink-0 space-y-3 text-xs">
        <div>
          <p className="font-semibold text-[var(--color-title)] mb-1">要生成什么？</p>
          <p className="text-[var(--neutral-text-03)] leading-relaxed">
            这里不是做「品牌可见度诊断」（那是快速检测/专业审计），而是产出可放到官网或内容里的
            <strong className="font-medium text-[var(--neutral-text-02)]">技术资产草稿</strong>。
          </p>
        </div>
        <div className="space-y-1">
          {ASSET_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveType(t.id);
                setPreview('');
              }}
              className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors ${
                activeType === t.id
                  ? 'geo-nav-active border-[var(--color-primary)]/30'
                  : 'geo-nav-item border-transparent'
              }`}
            >
              <span className="font-medium block">{t.label}</span>
              <span className="text-[10px] text-[var(--neutral-text-03)]">{t.short}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-3 overflow-y-auto">
        {(() => {
          const spec = ASSET_TYPES.find((t) => t.id === activeType)!;
          return (
            <>
              <div className="geo-card p-4 space-y-2">
                <h3 className="text-sm font-bold text-[var(--color-title)]">{spec.label}</h3>
                <p className="text-xs text-[var(--neutral-text-02)] leading-relaxed">{spec.desc}</p>
                <p className="text-[10px] text-[var(--neutral-text-03)]">
                  生成结果：{spec.outputHint}。当前为演示/mock 输出，上线前请人工核对。
                </p>
              </div>

              <div className="geo-card p-4 space-y-3">
                <p className="text-xs font-medium text-[var(--neutral-text-02)]">操作步骤</p>
                <ol className="text-xs text-[var(--neutral-text-03)] space-y-1 list-decimal list-inside">
                  <li>（可选）填写品牌官网地址，便于生成更贴合站点的草稿</li>
                  <li>点击「生成预览」，等待 Agent 任务完成</li>
                  <li>在下方预览区检查内容，确认无误后复制到网站或交给技术同事嵌入</li>
                  <li>如需外包落地，可点「加入任务包」跳转到发单</li>
                </ol>
                <div>
                  <label className="geo-label">官网 URL（可选）</label>
                  <input
                    className="geo-input w-full mt-1 text-sm"
                    placeholder="https://www.yunshan-dental.cn"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    className="geo-btn-primary geo-btn-sm"
                    disabled={loading || brandName === '__all__'}
                    onClick={() => void generate()}
                  >
                    {loading ? '生成中…' : '生成预览'}
                  </button>
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-sm"
                    disabled={!preview}
                    onClick={() => {
                      void navigator.clipboard.writeText(preview);
                      toast('已复制', 'success');
                    }}
                  >
                    复制草稿
                  </button>
                  <button
                    type="button"
                    className="geo-btn-secondary geo-btn-sm"
                    disabled={!preview}
                    onClick={() => addToTaskPack()}
                  >
                    加入任务包
                  </button>
                  {taskStatus && <TaskStatusPill status={taskStatus} />}
                </div>
              </div>

              <div className="geo-card p-4 min-h-[200px]">
                <p className="text-xs font-medium mb-2 text-[var(--neutral-text-02)]">生成预览</p>
                {preview ? (
                  <pre className="text-[11px] whitespace-pre-wrap overflow-auto max-h-[50vh] bg-[var(--neutral-bg-03)] p-3 rounded-lg">
                    {preview}
                  </pre>
                ) : (
                  <p className="text-xs text-[var(--neutral-text-03)]">
                    选择左侧资产类型，点击「生成预览」后，草稿会显示在这里。
                  </p>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

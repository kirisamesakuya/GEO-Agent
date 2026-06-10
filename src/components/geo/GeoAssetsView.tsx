import { useEffect, useState } from 'react';

import type { ViewType } from '../../types';

import { useToast } from '../../context/ToastContext';

import AgentTaskBackgroundCard, {
  isAgentTaskBlocking,
  type TaskQueueHint,
} from '../common/AgentTaskBackgroundCard';

import type { AgentTask, AgentTaskStatus } from '../../types';

import { confirmGeoAuditAction, submitGeoAgentTask } from '../../lib/geo-audit-client';

import { fetchGeoReports } from '../../lib/geo-report';

import { useHermesSubmitGuard } from '../hermes/HermesSubmitGuard';

import GeoRiskConfirmModal from './GeoRiskConfirmModal';

import GeoArtifactPreview from './GeoArtifactPreview';

import GeoWebsiteDeployChecklist from './GeoWebsiteDeployChecklist';

import { parseGeoAssetTypeFromUrl } from '../../lib/geo-analysis-nav';

import {

  assetActionTypeForTaskType,

  extractAssetPreview,

  GEO_ASSET_RISK_LABELS,

} from '../../lib/geo-asset';

import type { GeoAuditArtifact } from '../../lib/geo-audit-client';



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
    id: 'geo_crawlers',
    skill: 'geo-crawlers',
    label: 'AI 爬虫访问',
    short: 'robots / bot 矩阵',
    desc: '检查 GPTBot、Google-Extended 等 AI 爬虫是否被 robots 误拦，并给出补丁草稿。',
    outputHint: 'robots.txt 补丁或访问矩阵说明',
  },
  {
    id: 'geo_citability',
    skill: 'geo-citability',
    label: '内容可引用优化',
    short: '改写建议',
    desc: '分析现有文案为何难被 AI 引用，并给出更适合被摘录、推荐的改写方向。',
    outputHint: '段落级修改建议，需人工审核后再发布',
  },
  {
    id: 'geo_content',
    skill: 'geo-content',
    label: '内容 E-E-A-T 分析',
    short: '改写 brief',
    desc: '基于页面正文输出 E-E-A-T 评估、可引用段落与内容库候选主题。',
    outputHint: '改写 brief 与引用片段建议',
  },
  {
    id: 'geo_platform_optimizer',
    skill: 'geo-platform-optimizer',
    label: '平台专项优化',
    short: '平台 brief',
    desc: '针对 DeepSeek、豆包、Kimi 等平台生成问答矩阵与优化动作清单。',
    outputHint: '各平台优化 brief，可转入内容库或投放计划',
  },
] as const;



interface Props {

  brandName: string;

  onNavigate?: (view: ViewType, hint?: string) => void;

}



export default function GeoAssetsView({ brandName, onNavigate }: Props) {

  const { toast } = useToast();
  const { ensureHermesReady, showHermesError } = useHermesSubmitGuard();

  const [websiteUrl, setWebsiteUrl] = useState('');

  const [activeType, setActiveType] = useState<(typeof ASSET_TYPES)[number]['id']>('geo_schema');

  const [preview, setPreview] = useState('');

  const [artifacts, setArtifacts] = useState<GeoAuditArtifact[]>([]);

  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

  const [reportId, setReportId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [taskId, setTaskId] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState('');

  const [taskStatus, setTaskStatus] = useState<AgentTaskStatus | null>(null);

  const [queueHint, setQueueHint] = useState<TaskQueueHint | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<'generate' | 'task_pack'>('generate');
  const [platformQueries, setPlatformQueries] = useState('');



  useEffect(() => {

    if (!brandName || brandName === '__all__') return;

    void fetchGeoReports(brandName).then((rows) => {

      const latest =

        rows.find((r) => (r as { reportType?: string }).reportType === 'audit') ??

        rows.find((r) => (r as { reportType?: string }).reportType === 'quick_start') ??

        rows[0];

      if (latest) setReportId(latest.id);

    });

    void fetch(`/api/brand-profile?brandName=${encodeURIComponent(brandName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.website && !websiteUrl) setWebsiteUrl(String(data.website));
      })
      .catch(() => {});

  }, [brandName]);

  useEffect(() => {
    const assetType = parseGeoAssetTypeFromUrl();
    if (assetType && ASSET_TYPES.some((t) => t.id === assetType)) {
      setActiveType(assetType as (typeof ASSET_TYPES)[number]['id']);
    }
  }, []);

  const onComplete = (task: AgentTask) => {

    setLoading(false);

    setTaskStatus('succeeded');

    const output = task.output ?? {};

    const arts = (output.artifacts as GeoAuditArtifact[] | undefined) ?? [];

    setArtifacts(arts);

    setSelectedArtifactId(arts[0]?.id ?? null);

    setPreview(extractAssetPreview(output));

    if (output.geoReportId) setReportId(String(output.geoReportId));

    toast('资产草稿已生成，请人工确认后使用', 'success');

  };

  const runGenerate = async () => {

    const spec = ASSET_TYPES.find((t) => t.id === activeType)!;

    const actionType = assetActionTypeForTaskType(spec.id);

    if (reportId && actionType) {

      await confirmGeoAuditAction(reportId, actionType, 'medium', { assetType: spec.id });

    }

    if (!(await ensureHermesReady(brandName))) return;

    setLoading(true);

    setTaskStatus('queued');

    const title = `${brandName} · ${spec.label}`;

    const { task, error, queueHint: hint } = await submitGeoAgentTask({

      type: spec.id,

      title,

      brandName,

      payload: {

        skill: spec.skill,

        brandUrl: websiteUrl.trim() || undefined,

        brandName,

        sourceReportId: reportId ?? undefined,

        userConfirmedExecution: true,

        riskLevel: 'medium',

        ...(spec.id === 'geo_platform_optimizer' && platformQueries.trim()
          ? {
              queries: platformQueries
                .split(/[\n,，]/)
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 10),
            }
          : {}),

        outputContract: { format: 'json', version: 'geoWebOutput.v1' },

      },

    });

    if (error || !task) {

      if (error) showHermesError(error, brandName);
      toast(error ?? '生成失败', 'error');

      setLoading(false);

      return;

    }

    setTaskId(task.id);

    setTaskTitle(title);

    setTaskStatus(task.status);

    setQueueHint(hint ?? null);

    setConfirmOpen(false);

  };



  const handleGenerateClick = () => {

    if (brandName === '__all__') {

      toast('请先选择具体品牌', 'error');

      return;

    }

    setConfirmKind('generate');

    setConfirmOpen(true);

  };



  const addToTaskPack = async () => {

    if (!reportId) {

      toast('请先有审计/检测报告', 'info');

      return;

    }

    setConfirmKind('task_pack');

    setConfirmOpen(true);

  };



  const handleConfirmModal = async () => {

    if (confirmKind === 'task_pack') {

      if (!reportId) return;

      try {

        await confirmGeoAuditAction(reportId, 'add_to_task_pack', 'medium', { assetType: activeType });

        const genRes = await fetch('/api/campaign-plans/generate-from-geo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandName, geoReportId: reportId, userConfirmedExecution: true }),
        });
        const genData = await genRes.json();

        toast(
          genData.task?.id
            ? '已提交整改任务包生成，Hermes 将在后台处理'
            : '已记录确认，可前往发布任务生成任务包',
          genData.task?.id ? 'success' : 'info'
        );
        setConfirmOpen(false);
        if (genData.task?.id) {
          setTaskId(genData.task.id);
          setTaskTitle(`${brandName} · GEO 任务包`);
          setTaskStatus('queued');
          setQueueHint(genData.queueHint ?? null);
        } else {
          onNavigate?.('create_order', `geo:${reportId}`);
        }

      } catch (e) {

        toast(e instanceof Error ? e.message : '操作失败', 'error');

      }

      return;

    }

    await runGenerate();

  };



  const confirmActionKey =

    confirmKind === 'task_pack' ? 'add_to_task_pack' : assetActionTypeForTaskType(activeType) ?? 'generate_geo_schema';

  const confirmCopy = GEO_ASSET_RISK_LABELS[confirmActionKey] ?? GEO_ASSET_RISK_LABELS.generate_geo_schema;



  return (

    <div className="flex flex-col flex-1 min-h-0 overflow-hidden geo-page-content gap-3 p-4">

      <GeoWebsiteDeployChecklist
        brandName={brandName}
        reportId={reportId ?? undefined}
        websiteUrl={websiteUrl}
        artifacts={artifacts}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden gap-4">

      <GeoRiskConfirmModal

        open={confirmOpen}

        title={confirmCopy.title}

        detail={confirmCopy.detail}

        loading={loading}

        onConfirm={() => void handleConfirmModal()}

        onCancel={() => setConfirmOpen(false)}

      />



      <div className="w-52 shrink-0 space-y-3 text-xs">

        <div>

          <p className="font-semibold text-[var(--color-title)] mb-1">要生成什么？</p>

          <p className="text-[var(--neutral-text-03)] leading-relaxed">

            产出可放到官网或内容里的<strong className="font-medium text-[var(--neutral-text-02)]">技术资产草稿</strong>，发布前需人工确认。

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

                setArtifacts([]);

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

        {reportId && (

          <p className="text-[10px] text-[var(--neutral-text-03)]">

            关联报告：{reportId.slice(0, 8)}…

          </p>

        )}

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

                  生成结果：{spec.outputHint}。中风险动作，确认后由本机 Hermes 执行。

                </p>

              </div>



              <div className="geo-card p-4 space-y-3">

                <div>

                  <label className="geo-label">官网 URL（可选）</label>

                  <input

                    className="geo-input w-full mt-1 text-sm"

                    placeholder="https://www.example.com"

                    value={websiteUrl}

                    onChange={(e) => setWebsiteUrl(e.target.value)}

                  />

                </div>

                {activeType === 'geo_platform_optimizer' && (
                  <div>
                    <label className="geo-label">目标问题/关键词（可选，逗号或换行分隔）</label>
                    <textarea
                      className="geo-input w-full mt-1 min-h-[56px] text-sm"
                      placeholder="例如：种植牙多少钱、品牌口碑如何"
                      value={platformQueries}
                      onChange={(e) => setPlatformQueries(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2 items-center">

                  <button

                    type="button"

                    className="geo-btn-primary geo-btn-sm"

                    disabled={
                      loading || brandName === '__all__' || isAgentTaskBlocking(taskId, taskStatus)
                    }

                    onClick={handleGenerateClick}

                  >

                    {loading ? '等待本机 Hermes…' : '生成预览'}

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

                    onClick={() => void addToTaskPack()}

                  >

                    加入任务包

                  </button>

                </div>

                {taskId && (
                  <AgentTaskBackgroundCard
                    taskId={taskId}
                    taskTitle={taskTitle}
                    initialStatus={taskStatus}
                    queueHint={queueHint}
                    onNavigate={onNavigate}
                    onComplete={onComplete}
                    onStatusChange={setTaskStatus}
                  />
                )}

              </div>



              <div className="geo-card p-4 min-h-[200px]">

                <p className="text-xs font-medium mb-2 text-[var(--neutral-text-02)]">生成预览</p>

                {preview ? (

                  artifacts.length > 0 ? (

                    <GeoArtifactPreview

                      artifact={

                        artifacts.find((a) => a.id === selectedArtifactId) ?? artifacts[0]

                      }

                    />

                  ) : (

                    <pre className="text-[11px] whitespace-pre-wrap overflow-auto max-h-[50vh] bg-[var(--neutral-bg-03)] p-3 rounded-lg">

                      {preview}

                    </pre>

                  )

                ) : (

                  <p className="text-xs text-[var(--neutral-text-03)]">

                    选择左侧资产类型，确认中风险提示后，草稿会显示在这里。

                  </p>

                )}

              </div>

            </>

          );

        })()}

      </div>

    </div>

    </div>

  );

}



import { useEffect, useState } from 'react';
import type { AgentTask, ViewType } from '../../types';
import {
  KEYWORD_GROUP_OPTIONS,
  confirmAgentTaskResult,
  fetchAgentTaskResultPreview,
  getResultConfirmUiStatus,
  isResultConfirmPending,
  regenerateAgentTaskResult,
  rejectAgentTaskResult,
  canRegenerateResultTask,
  knowledgeEntryKey,
  type ResultPreviewResponse,
} from '../../lib/agent-result-confirmation';
import { saveBrandProfileDraft, suggestedProfileToDraft } from '../../lib/brand-profile-draft';
import { useToast } from '../../context/ToastContext';

interface Props {
  task: AgentTask;
  onUpdated: () => void;
  compact?: boolean;
  onRegenerated?: (newTaskId: string) => void;
  showRegenerate?: boolean;
  onNavigate?: (view: ViewType, hint?: string) => void;
}

export default function AgentTaskResultConfirmPanel({
  task,
  onUpdated,
  compact = false,
  onRegenerated,
  showRegenerate = true,
  onNavigate,
}: Props) {
  const { toast } = useToast();
  const [previewData, setPreviewData] = useState<ResultPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [groupOverrides, setGroupOverrides] = useState<Record<string, string>>({});
  const [selectedEntryKeys, setSelectedEntryKeys] = useState<Set<string>>(new Set());

  const uiStatus = getResultConfirmUiStatus(task);
  const pending = isResultConfirmPending(task);

  useEffect(() => {
    if (!pending && !task.output?.confirmedAt && task.reviewCategory !== 'result_rejected') {
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchAgentTaskResultPreview(task.id)
      .then((data) => {
        setPreviewData(data);
        if (data.preview.suggestions) {
          setSelectedTerms(new Set(data.preview.suggestions.map((s) => s.term)));
          setGroupOverrides({});
        }
        if (data.preview.entries) {
          setSelectedEntryKeys(new Set(data.preview.entries.map((e) => knowledgeEntryKey(e))));
        }
      })
      .catch((e) => toast(e instanceof Error ? e.message : '加载预览失败', 'error'))
      .finally(() => setLoading(false));
  }, [task.id, pending, task.output?.confirmedAt, task.reviewCategory, toast]);

  if (!uiStatus && !pending) return null;

  const handleConfirm = async () => {
    setActing(true);
    try {
      if (task.type === 'keyword_mining') {
        await confirmAgentTaskResult(task.id, {
          selectedTerms: [...selectedTerms],
          groupOverrides,
        });
      } else if (task.type === 'knowledge_extract') {
        await confirmAgentTaskResult(task.id, {
          selectedEntryKeys: [...selectedEntryKeys],
        });
      } else {
        await confirmAgentTaskResult(task.id);
      }
      toast('已确认入库', 'success');
      onUpdated();
    } catch (e) {
      toast(e instanceof Error ? e.message : '确认失败', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await rejectAgentTaskResult(task.id);
      toast('已忽略本次结果', 'info');
      onUpdated();
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作失败', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleRegenerate = async () => {
    setActing(true);
    try {
      const { task: newTask } = await regenerateAgentTaskResult(task.id);
      toast('已提交重新生成任务', 'success');
      onRegenerated?.(newTask.id);
      onUpdated();
    } catch (e) {
      toast(e instanceof Error ? e.message : '重新生成失败', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleCopyToForm = () => {
    const suggested = previewData?.preview.suggestedProfile;
    if (!suggested || typeof suggested !== 'object') {
      toast('暂无可复制的 AI 建议', 'error');
      return;
    }
    const brandName = String(task.brandName ?? task.input.brand ?? '').trim();
    if (!brandName) {
      toast('缺少品牌归属', 'error');
      return;
    }
    saveBrandProfileDraft(brandName, suggestedProfileToDraft(suggested), task.id);
    toast('AI 建议已复制到品牌资料表单，请编辑后手动保存', 'success');
    onNavigate?.('brand_profile');
  };

  const toggleTerm = (term: string) => {
    setSelectedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });
  };

  const toggleGroupTerms = (terms: string[], checked: boolean) => {
    setSelectedTerms((prev) => {
      const next = new Set(prev);
      for (const term of terms) {
        if (checked) next.add(term);
        else next.delete(term);
      }
      return next;
    });
  };

  const selectedKeywordCount = previewData?.preview.suggestions?.filter((s) =>
    selectedTerms.has(s.term)
  ).length ?? 0;

  const selectedKnowledgeCount =
    previewData?.preview.entries?.filter((e) => selectedEntryKeys.has(knowledgeEntryKey(e)))
      .length ?? 0;

  const confirmButtonLabel =
    task.type === 'brand_extract'
      ? '确认写入品牌资料'
      : task.type === 'knowledge_extract'
        ? '确认写入知识库'
        : task.type === 'geo_content'
          ? '确认写入内容 brief'
          : '确认写入关键词库';

  const toggleEntry = (key: string) => {
    setSelectedEntryKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroupEntries = (keys: string[], checked: boolean) => {
    setSelectedEntryKeys((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  const confirmResult = task.output?.confirmResult as Record<string, unknown> | undefined;

  return (
    <div
      className={`space-y-4 ${compact ? '' : 'geo-card p-6 border border-amber-200 bg-amber-50/30'}`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className={`font-semibold text-[var(--color-title)] ${compact ? 'text-sm' : 'text-sm'}`}>
            AI 结果确认
          </h2>
          <p className="text-xs text-[var(--neutral-text-03)] mt-0.5">
            {pending
              ? '请预览 AI 生成内容，确认后才会写入业务数据。'
              : uiStatus === '已入库'
                ? `已于 ${task.output?.confirmedAt ? new Date(String(task.output.confirmedAt)).toLocaleString('zh-CN') : ''} 确认入库${
                    confirmResult?.count != null ? `（${String(confirmResult.count)} 条）` : ''
                  }`
                : '本次结果已忽略，不会写入业务数据。'}
          </p>
        </div>
        {uiStatus && (
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${
              pending
                ? 'bg-amber-100 text-amber-900'
                : uiStatus === '已入库'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-[var(--neutral-bg-02)] text-[var(--neutral-text-02)]'
            }`}
          >
            {uiStatus}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--neutral-text-03)]">加载结果预览…</p>
      ) : previewData?.preview.confirmationType === 'brand_profile' ? (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left">
                <th className="p-2 font-medium">字段</th>
                <th className="p-2 font-medium">当前值</th>
                <th className="p-2 font-medium">AI 建议值</th>
              </tr>
            </thead>
            <tbody>
              {(previewData.preview.fields ?? []).map((f) => (
                <tr
                  key={f.key}
                  className={`border-b border-[var(--color-border)] last:border-0 ${
                    f.changed ? 'bg-amber-50/60' : ''
                  }`}
                >
                  <td className="p-2 text-[var(--neutral-text-03)] whitespace-nowrap">
                    {f.label}
                    {f.changed && (
                      <span className="ml-1 text-[10px] text-amber-700 font-medium">有变更</span>
                    )}
                  </td>
                  <td className="p-2 text-[var(--neutral-text-02)]">{f.current || '—'}</td>
                  <td className={`p-2 ${f.changed ? 'font-medium text-[var(--color-title)]' : ''}`}>
                    {f.suggested || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : previewData?.preview.confirmationType === 'keyword_suggestions' ? (
        <div className="space-y-3">
          {(previewData.preview.groups ?? []).map((g) => {
            const allSelected = g.terms.every((t) => selectedTerms.has(t));
            return (
              <div
                key={g.group}
                className="rounded-lg border border-[var(--color-border)] bg-white p-3 space-y-2"
              >
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={!pending}
                    onChange={(e) => toggleGroupTerms(g.terms, e.target.checked)}
                  />
                  {g.label}（{g.count}）
                </label>
                <div className="space-y-1.5 pl-1">
                  {g.terms.map((term) => {
                    const suggestion = previewData.preview.suggestions?.find((s) => s.term === term);
                    const group = groupOverrides[term] ?? suggestion?.group ?? g.group;
                    return (
                      <div key={term} className="flex flex-wrap items-center gap-2 text-xs">
                        <label className="inline-flex items-center gap-1.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedTerms.has(term)}
                            disabled={!pending}
                            onChange={() => toggleTerm(term)}
                          />
                          <span className="truncate">{term}</span>
                        </label>
                        {pending && (
                          <select
                            className="geo-input geo-input-inline text-[10px] py-0.5 max-w-[6rem]"
                            value={group}
                            onChange={(e) =>
                              setGroupOverrides((prev) => ({ ...prev, [term]: e.target.value }))
                            }
                          >
                            {KEYWORD_GROUP_OPTIONS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {pending && (
            <p className="text-xs text-[var(--neutral-text-03)]">
              已选择 {selectedKeywordCount} / {previewData.preview.totalCount ?? 0} 个关键词
            </p>
          )}
        </div>
      ) : previewData?.preview.confirmationType === 'knowledge_entries' ? (
        <div className="space-y-3">
          {(previewData.preview.knowledgeGroups ?? []).map((g) => {
            const keys = g.items.map((item) => knowledgeEntryKey(item));
            const allSelected = keys.every((k) => selectedEntryKeys.has(k));
            return (
              <div
                key={g.category}
                className="rounded-lg border border-[var(--color-border)] bg-white p-3 space-y-2"
              >
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={!pending}
                    onChange={(e) => toggleGroupEntries(keys, e.target.checked)}
                  />
                  {g.label}（{g.count}）
                </label>
                <div className="space-y-2 pl-1">
                  {g.items.map((item) => {
                    const key = knowledgeEntryKey(item);
                    return (
                      <label
                        key={key}
                        className="flex items-start gap-2 text-xs cursor-pointer rounded border border-[var(--color-border)] p-2"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 shrink-0"
                          checked={selectedEntryKeys.has(key)}
                          disabled={!pending}
                          onChange={() => toggleEntry(key)}
                        />
                        <span className="min-w-0">
                          <span className="font-medium block">{item.title}</span>
                          <span className="text-[var(--neutral-text-03)] line-clamp-3">{item.body}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {pending && (
            <p className="text-xs text-[var(--neutral-text-03)]">
              已选择 {selectedKnowledgeCount} / {previewData.preview.totalCount ?? 0} 条知识库条目
            </p>
          )}
        </div>
      ) : previewData?.preview.confirmationType === 'geo_content_brief' ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-3 space-y-2 text-sm">
          <p className="text-xs font-semibold">改写 brief</p>
          <pre className="text-xs whitespace-pre-wrap bg-[var(--neutral-bg-03)] p-3 rounded-lg max-h-48 overflow-auto">
            {previewData.preview.rewriteBrief || '（无 brief 文本）'}
          </pre>
          {(previewData.preview.candidateTopics?.length ?? 0) > 0 && (
            <p className="text-xs text-[var(--neutral-text-03)]">
              候选主题：{previewData.preview.candidateTopics?.join('、')}
            </p>
          )}
          {(previewData.preview.findingsCount ?? 0) > 0 && (
            <p className="text-xs text-[var(--neutral-text-03)]">
              含 {previewData.preview.findingsCount} 条 findings，确认后将写入内容库条目元数据。
            </p>
          )}
        </div>
      ) : null}

      {pending && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="geo-btn-primary geo-btn-sm"
            disabled={
              acting ||
              (task.type === 'keyword_mining' && selectedKeywordCount === 0) ||
              (task.type === 'knowledge_extract' && selectedKnowledgeCount === 0)
            }
            onClick={() => void handleConfirm()}
          >
            {confirmButtonLabel}
          </button>
          <button
            type="button"
            className="geo-btn-secondary geo-btn-sm"
            disabled={acting}
            onClick={() => void handleReject()}
          >
            忽略结果
          </button>
          {task.type === 'brand_extract' && onNavigate && (
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm"
              disabled={acting || !previewData?.preview.suggestedProfile}
              onClick={handleCopyToForm}
            >
              只复制到表单继续编辑
            </button>
          )}
          {showRegenerate && canRegenerateResultTask(task) && (
            <button
              type="button"
              className="geo-btn-secondary geo-btn-sm"
              disabled={acting}
              onClick={() => void handleRegenerate()}
            >
              重新生成
            </button>
          )}
        </div>
      )}

      {!pending && showRegenerate && canRegenerateResultTask(task) && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="geo-btn-secondary geo-btn-sm"
            disabled={acting}
            onClick={() => void handleRegenerate()}
          >
            重新生成
          </button>
        </div>
      )}
    </div>
  );
}

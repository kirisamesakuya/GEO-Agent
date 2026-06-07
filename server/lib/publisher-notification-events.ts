import type { AgentTask } from '../agent/types.js';
import { AGENT_TASK_TYPE_LABELS } from '../agent/status.js';
import { createPublisherNotification } from '../services/notification.service.js';

function brandFromTask(task: AgentTask): string {
  return String(task.brandName ?? task.input.brand ?? '').trim();
}

/** Hermes / Agent 任务完成后统一进入结果页 */
const AGENT_TASK_RESULT_VIEW = 'agent_task_result';

export async function notifyPublisherAgentTask(
  task: AgentTask,
  succeeded: boolean,
  detail?: string | null
) {
  const brandName = brandFromTask(task);
  if (!brandName) return;

  const typeLabel = AGENT_TASK_TYPE_LABELS[task.type] ?? task.type;

  if (succeeded) {
    let body = `「${task.title}」已执行完成，可在结果页查看详情。`;
    let actionView = AGENT_TASK_RESULT_VIEW;
    let title = `${typeLabel}完成`;

    if (task.needsReview && task.reviewCategory === 'result_confirm_required') {
      actionView = AGENT_TASK_RESULT_VIEW;
      if (task.type === 'brand_extract') {
        title = '品牌资料已提取，待确认入库';
        body = 'AI 已根据官网或参考材料提取品牌资料，请确认后写入品牌中心。';
      } else if (task.type === 'keyword_mining') {
        const count = Array.isArray(task.output?.suggestions)
          ? task.output!.suggestions!.length
          : 0;
        title = 'AI 挖词完成，待确认入库';
        body = `已生成 ${count} 个候选关键词，请确认后写入关键词库。`;
      } else if (task.type === 'knowledge_extract') {
        const count = Array.isArray(task.output?.entries) ? task.output!.entries!.length : 0;
        title = '知识库抽取完成，待确认入库';
        body = `已生成 ${count} 条知识库条目，请确认后写入企业知识库。`;
      } else {
        title = `${typeLabel}完成，待确认入库`;
        body = 'AI 结果已生成，请确认后写入业务数据。';
      }
    } else if (task.type === 'article_generation' || task.type === 'article_rewrite') {
      actionView = 'content_library';
      body = 'AI 写作任务已完成，稿件已写入内容库，可前往审阅与发布。';
    } else if (
      task.type === 'geo_analysis' ||
      task.type === 'geo_quick_start' ||
      task.type === 'geo_audit' ||
      task.type.startsWith('geo_')
    ) {
      actionView = AGENT_TASK_RESULT_VIEW;
      body = `${typeLabel}已完成，可在结果页预览报告并确认后续操作。`;
    } else if (task.type === 'hermes_publish') {
      actionView = AGENT_TASK_RESULT_VIEW;
      if (task.needsReview || task.status === 'partial') {
        title = 'Hermes 发布需人工处理';
        body =
          typeof task.output?.evidence === 'string'
            ? String(task.output.evidence)
            : '部分或全部文章未能自动发布，请查看发布证据并手动完成。';
      } else {
        body = '内容已通过 Hermes 发布流程，请在结果页查看发布证据。';
      }
    } else if (task.type === 'account_verify') {
      actionView = AGENT_TASK_RESULT_VIEW;
      body = '账号检测已完成，请在结果页查看登录态与异常说明。';
    } else if (task.type === 'campaign_plan') {
      actionView = AGENT_TASK_RESULT_VIEW;
      body = '投放任务包已生成，可在结果页确认是否应用到发布任务。';
    }

    await createPublisherNotification({
      brandName,
      type: 'agent_task',
      title,
      body,
      refId: task.id,
      actionView,
    });
    return;
  }

  await createPublisherNotification({
    brandName,
    type: 'agent_task',
    title: `${typeLabel}失败`,
    body:
      detail?.slice(0, 200) ??
      `「${task.title}」执行失败，可在结果页查看详情并重试。`,
    refId: task.id,
    actionView: AGENT_TASK_RESULT_VIEW,
  });
}

export async function notifyPublisherOrderAccepted(input: {
  brandName: string;
  orderId: string;
  orderTitle: string;
  providerName: string;
}) {
  await createPublisherNotification({
    brandName: input.brandName,
    type: 'order',
    title: '接单方已接单',
    body: `「${input.orderTitle}」已由 ${input.providerName} 接单，进入执行中。`,
    refId: input.orderId,
    actionView: 'order_delivery',
  });
}

export async function notifyPublisherOrderPendingReview(input: {
  brandName: string;
  orderId: string;
  orderTitle: string;
}) {
  await createPublisherNotification({
    brandName: input.brandName,
    type: 'order',
    title: '订单待验收',
    body: `「${input.orderTitle}」接单方已提交交付，请前往任务交付验收。`,
    refId: input.orderId,
    actionView: 'order_delivery',
  });
}

export async function notifyPublisherArticleDraftSubmitted(input: {
  brandName: string;
  orderId: string;
  orderTitle: string;
}) {
  await createPublisherNotification({
    brandName: input.brandName,
    type: 'order',
    title: '文章草稿待审稿',
    body: `「${input.orderTitle}」接单方已提交文章草稿，请在审稿区处理。`,
    refId: input.orderId,
    actionView: 'order_delivery',
  });
}

export async function notifyPublisherPublishNeedReauth(input: {
  brandName: string;
  platform: string;
  recordId?: string;
  reason?: string;
}) {
  await createPublisherNotification({
    brandName: input.brandName,
    type: 'publish',
    title: '发布账号需重新授权',
    body:
      input.reason?.slice(0, 200) ??
      `${input.platform} 发布账号授权失效，请前往发布账号管理重新授权后再发布。`,
    refId: input.recordId,
    actionView: 'account_binding',
  });
}

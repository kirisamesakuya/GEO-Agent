import type { AgentTask } from '../agent/types.js';
import { AGENT_TASK_TYPE_LABELS } from '../agent/status.js';
import { createPublisherNotification } from '../services/notification.service.js';

function brandFromTask(task: AgentTask): string {
  return String(task.brandName ?? task.input.brand ?? '').trim();
}

export async function notifyPublisherAgentTask(
  task: AgentTask,
  succeeded: boolean,
  detail?: string | null
) {
  const brandName = brandFromTask(task);
  if (!brandName) return;

  const typeLabel = AGENT_TASK_TYPE_LABELS[task.type] ?? task.type;

  if (succeeded) {
    let body = `「${task.title}」已执行完成，可在运行日志查看详情。`;
    let actionView = 'agent_tasks';

    if (task.type === 'article_generation' || task.type === 'article_rewrite') {
      actionView = 'content_library';
      body = 'AI 写作任务已完成，稿件已写入内容库，可前往审阅与发布。';
    } else if (
      task.type === 'geo_analysis' ||
      task.type === 'geo_quick_start' ||
      task.type === 'geo_audit' ||
      task.type.startsWith('geo_')
    ) {
      actionView = 'geo_analysis';
      body = `${typeLabel}已完成，可在 GEO 分析查看报告与行动计划。`;
    } else if (task.type === 'hermes_publish') {
      actionView = 'order_delivery';
      body = '内容已通过 Hermes 发布流程，请在文章结果 · 发布记录中确认状态。';
    } else if (task.type === 'campaign_plan') {
      actionView = 'create_order';
      body = '投放任务包已生成，可前往发布任务确认并发单。';
    }

    await createPublisherNotification({
      brandName,
      type: 'agent_task',
      title: `${typeLabel}完成`,
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
      `「${task.title}」执行失败，可在运行日志查看详情并重试。`,
    refId: task.id,
    actionView: 'agent_tasks',
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

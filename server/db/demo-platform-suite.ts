import { prisma } from './client.js';

const SUITE_KEY = 'demo_platform_suite_v';
const SUITE_VERSION = '1';
const DEMO = '[演示]';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000);
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

export async function ensureDemoPlatformSuite(): Promise<void> {
  const marker = await prisma.systemConfig.findUnique({ where: { key: SUITE_KEY } });
  if (marker?.value === SUITE_VERSION) return;

  const brand = await prisma.brand.findFirst({ where: { name: '云杉口腔' } });
  const chenguang = await prisma.provider.findFirst({ where: { name: '晨光传媒' } });

  await ensureDemoAgentTasks(brand?.name ?? '云杉口腔');
  await ensureDemoSkillAndAutomationRuns();
  if (brand) await ensureDemoPublishRecords(brand.id, brand.name);
  await ensureDemoAuditLogs();
  if (chenguang) await ensureDemoProviderNotifications(chenguang.id);
  await ensureDemoBudgetLedgerExtras(brand?.name ?? '云杉口腔');

  await prisma.systemConfig.upsert({
    where: { key: SUITE_KEY },
    create: { key: SUITE_KEY, value: SUITE_VERSION },
    update: { value: SUITE_VERSION },
  });
}

async function ensureDemoAgentTasks(brandName: string) {
  const exists = await prisma.agentTask.count({ where: { title: { startsWith: DEMO } } });
  if (exists >= 6) return;

  const specs = [
    {
      type: 'article_generation',
      title: `${DEMO} 小红书种草稿批量生成`,
      status: 'succeeded',
      progress: 100,
      executor: 'hermes',
      finishedAt: hoursAgo(2),
    },
    {
      type: 'hermes_publish',
      title: `${DEMO} 知乎问答发布失败`,
      status: 'failed',
      progress: 100,
      executor: 'hermes',
      errorMessage: '账号授权已过期',
      needsReview: true,
      reviewCategory: 'need_reauth',
      finishedAt: hoursAgo(5),
    },
    {
      type: 'hermes_publish',
      title: `${DEMO} 小红书排程发布`,
      status: 'partial',
      progress: 80,
      executor: 'hermes',
      needsReview: true,
      reviewCategory: 'retry_ok',
      finishedAt: hoursAgo(8),
    },
    {
      type: 'brand_extract',
      title: `${DEMO} 品牌资料 AI 提取`,
      status: 'running',
      progress: 42,
      executor: 'hermes',
      startedAt: hoursAgo(0.5),
    },
    {
      type: 'keyword_mining',
      title: `${DEMO} 关键词挖掘`,
      status: 'queued',
      progress: 0,
      executor: 'hermes',
    },
    {
      type: 'geo_audit',
      title: `${DEMO} GEO 专业审计`,
      status: 'failed',
      progress: 100,
      executor: 'hermes',
      errorMessage: '外部技能超时',
      finishedAt: daysAgo(1),
    },
  ];

  for (const spec of specs) {
    const dup = await prisma.agentTask.findFirst({ where: { title: spec.title } });
    if (dup) continue;
    const task = await prisma.agentTask.create({
      data: {
        type: spec.type,
        title: spec.title,
        status: spec.status,
        progress: spec.progress,
        executor: spec.executor,
        brandName,
        input: JSON.stringify({ demo: true, brandName }),
        output: spec.status === 'succeeded' ? JSON.stringify({ demo: true, items: 3 }) : null,
        errorMessage: spec.errorMessage ?? null,
        needsReview: spec.needsReview ?? false,
        reviewCategory: spec.reviewCategory ?? null,
        startedAt: spec.startedAt ?? (spec.status !== 'queued' ? hoursAgo(3) : null),
        finishedAt: spec.finishedAt ?? null,
        createdAt: hoursAgo(12),
        updatedAt: spec.finishedAt ?? hoursAgo(1),
      },
    });
    if (spec.status === 'failed') {
      await prisma.agentTaskLog.create({
        data: {
          taskId: task.id,
          level: 'error',
          message: spec.errorMessage ?? '任务失败',
          detail: '演示数据：供 Agent 监控与驾驶舱统计',
        },
      });
    }
  }
}

async function ensureDemoSkillAndAutomationRuns() {
  const skillCount = await prisma.agentSkillRun.count();
  if (skillCount < 3) {
    await prisma.agentSkillRun.createMany({
      data: [
        {
          skillName: 'article_writer',
          executor: 'hermes',
          status: 'succeeded',
          durationMs: 12400,
          inputSummary: '云杉口腔 · 小红书种草 ×3',
          outputSummary: '生成 3 篇草稿',
          createdAt: hoursAgo(3),
        },
        {
          skillName: 'hermes_publish',
          executor: 'hermes',
          status: 'failed',
          durationMs: 8200,
          inputSummary: '知乎问答发布',
          outputSummary: '授权失效',
          needsReview: true,
          createdAt: hoursAgo(6),
        },
        {
          skillName: 'brand_extract',
          executor: 'hermes',
          status: 'running',
          durationMs: 3200,
          inputSummary: '品牌官网抓取',
          createdAt: hoursAgo(1),
        },
      ],
    });
  }

  const autoCount = await prisma.localAutomationRun.count();
  if (autoCount < 2) {
    await prisma.localAutomationRun.createMany({
      data: [
        {
          automationType: 'publish',
          environment: 'macos-local',
          hostName: 'demo-mac',
          status: 'succeeded',
          evidenceUrl: 'https://example.com/evidence/publish-ok.png',
          inputSummary: '小红书自动发布',
          createdAt: hoursAgo(4),
        },
        {
          automationType: 'publish',
          environment: 'macos-local',
          hostName: 'demo-mac',
          status: 'failed',
          errorMessage: '浏览器未登录小红书',
          inputSummary: '大风网发文',
          createdAt: hoursAgo(10),
        },
      ],
    });
  }
}

async function ensureDemoPublishRecords(brandId: string, brandName: string) {
  const exists = await prisma.publishRecord.count({ where: { brandId } });
  if (exists >= 4) return;

  const rows = [
    { platform: '小红书', status: 'published', publishedUrl: 'https://www.xiaohongshu.com/demo-1' },
    { platform: '知乎', status: 'failed', errorCode: 'AUTH_EXPIRED', reviewCategory: 'need_reauth' },
    { platform: '大风网', status: 'failed', errorCode: 'NETWORK', reviewCategory: 'retry_ok' },
    { platform: '公众号', status: 'pending', errorCode: null, reviewCategory: null },
  ];

  for (const row of rows) {
    const dup = await prisma.publishRecord.findFirst({
      where: { brandId, platform: row.platform, status: row.status },
    });
    if (dup) continue;
    await prisma.publishRecord.create({
      data: {
        brandId,
        platform: row.platform,
        status: row.status,
        publishedUrl: row.publishedUrl ?? null,
        errorCode: row.errorCode,
        reviewCategory: row.reviewCategory,
        executedAt: row.status === 'published' ? hoursAgo(20) : hoursAgo(2),
      },
    });
  }

  void brandName;
}

async function ensureDemoAuditLogs() {
  const exists = await prisma.auditLog.count({ where: { detail: { contains: DEMO } } });
  if (exists >= 5) return;

  await prisma.auditLog.createMany({
    data: [
      { action: 'budget_deposit_approve', entity: 'BudgetDepositRequest', detail: `${DEMO} 云杉口腔充值审核通过`, source: 'platform', createdAt: hoursAgo(6) },
      { action: 'provider_withdrawal_approve', entity: 'ProviderWithdrawalRequest', detail: `${DEMO} 晨光传媒提现审核`, source: 'platform', createdAt: hoursAgo(8) },
      { action: 'org_cert_approve', entity: 'Organization', detail: `${DEMO} 云杉医疗集团认证通过`, source: 'platform', createdAt: daysAgo(7) },
      { action: 'order_assign', entity: 'TaskOrder', detail: `${DEMO} 订单派单至晨光传媒`, source: 'platform', createdAt: hoursAgo(12) },
      { action: 'user_freeze', entity: 'User', detail: `${DEMO} 冻结违规账号`, source: 'platform', createdAt: daysAgo(2) },
      { action: 'agent_manual_flag', entity: 'AgentTask', detail: `${DEMO} 发布任务转人工`, source: 'platform', createdAt: hoursAgo(5) },
    ],
  });
}

async function ensureDemoProviderNotifications(providerId: string) {
  const exists = await prisma.providerNotification.count({ where: { providerId } });
  if (exists >= 3) return;

  await prisma.providerNotification.createMany({
    data: [
      {
        providerId,
        type: 'order',
        title: '新订单待接单',
        body: '云杉口腔发布了一则小红书种草订单，预算 ¥2,800。',
        read: false,
        createdAt: hoursAgo(2),
      },
      {
        providerId,
        type: 'withdrawal',
        title: '提现申请已通过',
        body: '¥1,200 提现申请已审核通过，请等待线下打款。',
        read: false,
        createdAt: hoursAgo(24),
      },
      {
        providerId,
        type: 'settlement',
        title: '结算已完成',
        body: '订单「本地生活探店」结算 ¥2,760 已入账可提现余额。',
        read: true,
        createdAt: daysAgo(3),
      },
    ],
  });
}

async function ensureDemoBudgetLedgerExtras(brandName: string) {
  const anomaly = await prisma.budgetLedger.findFirst({
    where: { brandName, note: { contains: `${DEMO} 异常冻结` } },
  });
  if (anomaly) return;

  const account = await prisma.budgetAccount.findUnique({ where: { brandName } });
  if (!account) return;

  await prisma.budgetLedger.create({
    data: {
      brandName,
      type: 'freeze',
      amount: 500,
      balance: account.balance,
      note: `${DEMO} 异常冻结：订单争议暂扣`,
      createdAt: hoursAgo(4),
    },
  });
}

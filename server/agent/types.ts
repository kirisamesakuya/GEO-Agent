export type AgentTaskStatus =
  | 'pending'
  | 'pending_setup'
  | 'waiting_local_device'
  | 'pending_confirm'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'partial'
  | 'failed'
  | 'canceled';

export type HermesSetupReason =
  | 'hermes_not_installed'
  | 'hermes_not_running'
  | 'hermes_not_bound'
  | 'token_capacity_unavailable'
  | 'skill_missing'
  | 'output_parse_failed';

export type AgentTaskType =
  | 'article_generation'
  | 'geo_analysis'
  | 'geo_quick_start'
  | 'geo_audit'
  | 'geo_schema'
  | 'geo_llmstxt'
  | 'geo_citability'
  | 'geo_report_pdf'
  | 'geo_compare'
  | 'campaign_plan'
  | 'website_preview'
  | 'brand_extract'
  | 'hermes_publish'
  | 'account_verify'
  | 'keyword_mining'
  | 'knowledge_extract'
  | 'index_sampling'
  | 'article_rewrite';

export type AgentExecutorKind = 'direct_model' | 'nous_hermes';

export interface AgentTaskLog {
  id: string;
  taskId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  detail?: string;
  createdAt: string;
}

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  title: string;
  status: AgentTaskStatus;
  progress: number;
  executor: AgentExecutorKind;
  brandId?: string;
  brandName?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorMessage?: string;
  userErrorMessage?: string;
  externalRunId?: string;
  businessRef?: string;
  needsReview?: boolean;
  reviewCategory?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface CreateAgentTaskInput {
  type: AgentTaskType;
  title: string;
  input: Record<string, unknown>;
  brandName?: string;
  executor?: AgentExecutorKind;
  businessRef?: string;
}

export interface AgentExecutor {
  submit(task: AgentTask): Promise<{ externalRunId?: string }>;
  poll(task: AgentTask): Promise<{
    status: AgentTaskStatus;
    progress: number;
    output?: Record<string, unknown>;
    errorMessage?: string;
    userErrorMessage?: string;
    log?: { level: 'info' | 'warn' | 'error'; message: string; detail?: string };
  }>;
  cancel(task: AgentTask): Promise<void>;
}

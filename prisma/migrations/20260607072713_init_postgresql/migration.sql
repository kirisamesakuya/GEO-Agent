-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "certStatus" TEXT NOT NULL DEFAULT 'uncertified',
    "legalName" TEXT,
    "uscc" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "certSubmittedAt" TIMESTAMP(3),
    "certReviewedAt" TIMESTAMP(3),
    "certRejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "website" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "industry" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL DEFAULT '',
    "storeCount" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "competitors" TEXT NOT NULL,
    "forbiddenWords" TEXT NOT NULL,
    "sourceMaterials" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordEntry" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'brand',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexQueryPlan" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platforms" TEXT NOT NULL,
    "keywordIds" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "taskId" TEXT,
    "verificationType" TEXT,
    "sourceContentItemId" TEXT,
    "sourcePublishRecordId" TEXT,
    "baselineResultIdsJson" TEXT,
    "queryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "scheduleFrequency" TEXT,
    "scheduleRunTime" TEXT,
    "scheduleWeekday" INTEGER,
    "scheduleMonthDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexQueryPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexResult" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "hit" BOOLEAN NOT NULL,
    "citedMerchant" BOOLEAN NOT NULL DEFAULT false,
    "citationSnippet" TEXT,
    "sampledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoContentProject" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceRef" TEXT,
    "targetQuestionsJson" TEXT NOT NULL DEFAULT '[]',
    "targetKeywordsJson" TEXT NOT NULL DEFAULT '[]',
    "targetAiPlatformsJson" TEXT NOT NULL DEFAULT '[]',
    "targetPublishPlatformsJson" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoContentProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishPlan" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT,
    "targetAccountIds" TEXT NOT NULL DEFAULT '[]',
    "firstPublishAt" TIMESTAMP(3),
    "frequency" TEXT NOT NULL DEFAULT 'once',
    "runCount" INTEGER NOT NULL DEFAULT 1,
    "autoComment" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduleMode" TEXT,
    "scheduleMetaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishJob" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "projectId" TEXT,
    "contentItemId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountBindingId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "agentTaskId" TEXT,
    "publishRecordId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishRecord" (
    "id" TEXT NOT NULL,
    "planId" TEXT,
    "brandId" TEXT NOT NULL,
    "contentItemId" TEXT,
    "platform" TEXT NOT NULL,
    "accountBindingId" TEXT,
    "status" TEXT NOT NULL,
    "publishedUrl" TEXT,
    "errorCode" TEXT,
    "reviewCategory" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetRechargeOrder" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "BudgetRechargeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountBinding" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "lastChecked" TEXT NOT NULL,
    "authMethod" TEXT NOT NULL DEFAULT 'browser',
    "bindSessionId" TEXT,
    "externalAccountId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountBindingLog" (
    "id" TEXT NOT NULL,
    "accountBindingId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountBindingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdAccount" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "authMethod" TEXT NOT NULL DEFAULT 'browser',
    "authStatus" TEXT NOT NULL DEFAULT 'unauthorized',
    "riskStatus" TEXT NOT NULL DEFAULT 'normal',
    "permissions" TEXT NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "legacyBindingId" TEXT,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdAccountAssignment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdAccountAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdAccountAuthSession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "loginUrl" TEXT,
    "bindSessionId" TEXT,
    "agentTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AdAccountAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdAccountUsageLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "businessRefType" TEXT,
    "businessRefId" TEXT,
    "operatorId" TEXT,
    "result" TEXT NOT NULL DEFAULT 'success',
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdAccountUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "executor" TEXT NOT NULL,
    "brandName" TEXT,
    "input" TEXT NOT NULL,
    "output" TEXT,
    "errorMessage" TEXT,
    "userErrorMessage" TEXT,
    "externalRunId" TEXT,
    "businessRef" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewCategory" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTaskLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTaskLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBatch" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "articleCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "targetQuestionsJson" TEXT,
    "publishStatus" TEXT NOT NULL DEFAULT 'not_scheduled',
    "previewText" TEXT NOT NULL,
    "fullContent" TEXT NOT NULL,
    "structure" TEXT NOT NULL,
    "generationMetaJson" TEXT,
    "qualityChecksJson" TEXT,
    "effectBaselineJson" TEXT,
    "effectVerificationJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCredits" (
    "brandName" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCredits_pkey" PRIMARY KEY ("brandName")
);

-- CreateTable
CREATE TABLE "AiCreditMirror" (
    "brandName" TEXT NOT NULL,
    "mirroredBalance" INTEGER NOT NULL DEFAULT 0,
    "externalUserId" TEXT,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "AiCreditMirror_pkey" PRIMARY KEY ("brandName")
);

-- CreateTable
CREATE TABLE "AiCreditSyncLog" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "balance" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCreditSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMemberPermission" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandMemberPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalAccountLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'agentsyun',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalAccountLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAccount" (
    "brandName" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "frozen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAccount_pkey" PRIMARY KEY ("brandName")
);

-- CreateTable
CREATE TABLE "BudgetLedger" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetDepositRequest" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "BudgetDepositRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoReport" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "taskId" TEXT,
    "reportType" TEXT NOT NULL DEFAULT 'analysis',
    "mentionRate" INTEGER,
    "rank" INTEGER,
    "gapsFound" INTEGER,
    "totalScore" INTEGER,
    "platformsJson" TEXT,
    "keywordsJson" TEXT,
    "prospectMode" BOOLEAN NOT NULL DEFAULT false,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "brandMentionSummary" TEXT NOT NULL,
    "competitorAnalysis" TEXT NOT NULL,
    "contentGap" TEXT NOT NULL,
    "optimizationSuggestions" TEXT NOT NULL,
    "scoresJson" TEXT,
    "findingsJson" TEXT,
    "artifactsJson" TEXT,
    "actionPlanJson" TEXT,
    "rawJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeoReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoActionConfirmation" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "payloadJson" TEXT,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeoActionConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPlan" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "platforms" TEXT NOT NULL,
    "budgetMin" DOUBLE PRECISION NOT NULL,
    "budgetMax" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskPackageDraft" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "payeeType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION,
    "budget" DOUBLE PRECISION NOT NULL,
    "deliverable" TEXT NOT NULL,
    "acceptance" TEXT NOT NULL,
    "publishToLobby" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending_confirm',

    CONSTRAINT "TaskPackageDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskOrder" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "deliverable" TEXT NOT NULL,
    "acceptance" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "city" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "providerId" TEXT,
    "providerName" TEXT,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOrderAssignment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderOrderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_platform',
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDelivery" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "link" TEXT,
    "attachments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "stage" TEXT NOT NULL DEFAULT 'final',
    "reviewStatus" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderRevision" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capabilities" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "applicationStatus" TEXT NOT NULL DEFAULT 'draft',
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "serviceTypes" TEXT,
    "platforms" TEXT,
    "industryTags" TEXT,
    "serviceAreas" TEXT,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "caseLinks" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderWithdrawalRequest" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "channel" TEXT NOT NULL,
    "channelLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "ProviderWithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderNotification" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublisherNotification" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "refId" TEXT,
    "actionView" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublisherNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderPricingRule" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "minBudget" DOUBLE PRECISION,
    "maxBudget" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderPricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAsset" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'case',
    "url" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderApplication" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderReviewLog" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "reviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskOrderApplication" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskOrderApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSkillRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT,
    "skillName" TEXT NOT NULL,
    "executor" TEXT,
    "status" TEXT NOT NULL,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "durationMs" INTEGER,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentSkillRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalAutomationRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'local',
    "hostName" TEXT,
    "automationType" TEXT,
    "status" TEXT NOT NULL,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "evidenceUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalAutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SystemConfigVersion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfigVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteRequest" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "referenceUrl" TEXT,
    "modules" TEXT NOT NULL,
    "attachments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "previewHtml" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteOrder" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assigneeId" TEXT,
    "assigneeName" TEXT,
    "previewUrl" TEXT,
    "deliveryNote" TEXT,
    "revisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "detail" TEXT,
    "source" TEXT NOT NULL DEFAULT 'web',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KeywordEntry_brandId_term_key" ON "KeywordEntry"("brandId", "term");

-- CreateIndex
CREATE UNIQUE INDEX "AdAccount_legacyBindingId_key" ON "AdAccount"("legacyBindingId");

-- CreateIndex
CREATE UNIQUE INDEX "AdAccountAssignment_accountId_targetType_targetId_key" ON "AdAccountAssignment"("accountId", "targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementRecord_orderId_key" ON "SettlementRecord"("orderId");

-- CreateIndex
CREATE INDEX "ProviderWithdrawalRequest_providerId_status_createdAt_idx" ON "ProviderWithdrawalRequest"("providerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PublisherNotification_brandName_read_createdAt_idx" ON "PublisherNotification"("brandName", "read", "createdAt");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordEntry" ADD CONSTRAINT "KeywordEntry_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexQueryPlan" ADD CONSTRAINT "IndexQueryPlan_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexResult" ADD CONSTRAINT "IndexResult_planId_fkey" FOREIGN KEY ("planId") REFERENCES "IndexQueryPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoContentProject" ADD CONSTRAINT "GeoContentProject_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishPlan" ADD CONSTRAINT "PublishPlan_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishJob" ADD CONSTRAINT "PublishJob_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PublishPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishJob" ADD CONSTRAINT "PublishJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "GeoContentProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishRecord" ADD CONSTRAINT "PublishRecord_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PublishPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountBinding" ADD CONSTRAINT "AccountBinding_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountBindingLog" ADD CONSTRAINT "AccountBindingLog_accountBindingId_fkey" FOREIGN KEY ("accountBindingId") REFERENCES "AccountBinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAccountAssignment" ADD CONSTRAINT "AdAccountAssignment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAccountAuthSession" ADD CONSTRAINT "AdAccountAuthSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAccountUsageLog" ADD CONSTRAINT "AdAccountUsageLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTaskLog" ADD CONSTRAINT "AgentTaskLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBatch" ADD CONSTRAINT "ContentBatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "GeoContentProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ContentBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "GeoContentProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCreditMirror" ADD CONSTRAINT "AiCreditMirror_brandName_fkey" FOREIGN KEY ("brandName") REFERENCES "AiCredits"("brandName") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMemberPermission" ADD CONSTRAINT "BrandMemberPermission_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAccountLink" ADD CONSTRAINT "ExternalAccountLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPackageDraft" ADD CONSTRAINT "TaskPackageDraft_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CampaignPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOrderAssignment" ADD CONSTRAINT "ProviderOrderAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TaskOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementRecord" ADD CONSTRAINT "SettlementRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TaskOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDelivery" ADD CONSTRAINT "OrderDelivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TaskOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRevision" ADD CONSTRAINT "OrderRevision_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TaskOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderWithdrawalRequest" ADD CONSTRAINT "ProviderWithdrawalRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderNotification" ADD CONSTRAINT "ProviderNotification_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPricingRule" ADD CONSTRAINT "ProviderPricingRule_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAsset" ADD CONSTRAINT "ProviderAsset_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderApplication" ADD CONSTRAINT "ProviderApplication_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReviewLog" ADD CONSTRAINT "ProviderReviewLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOrderApplication" ADD CONSTRAINT "TaskOrderApplication_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TaskOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOrderApplication" ADD CONSTRAINT "TaskOrderApplication_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteOrder" ADD CONSTRAINT "WebsiteOrder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "WebsiteRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Provider quote matching (PRD v2.2)

ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "hiddenBudgetMaxCents" INTEGER;
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "perTaskBudgetCapCents" INTEGER;
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "budgetVisibleToProvider" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CampaignPlan" ADD COLUMN IF NOT EXISTS "pricingMode" TEXT NOT NULL DEFAULT 'provider_quote';

ALTER TABLE "TaskPackageDraft" ADD COLUMN IF NOT EXISTS "suggestedMinCents" INTEGER;
ALTER TABLE "TaskPackageDraft" ADD COLUMN IF NOT EXISTS "suggestedMaxCents" INTEGER;
ALTER TABLE "TaskPackageDraft" ADD COLUMN IF NOT EXISTS "slotCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TaskPackageDraft" ADD COLUMN IF NOT EXISTS "contentDirection" TEXT;
ALTER TABLE "TaskPackageDraft" ADD COLUMN IF NOT EXISTS "mediaTypeHint" TEXT;
ALTER TABLE "TaskPackageDraft" ADD COLUMN IF NOT EXISTS "quoteRequired" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "planId" TEXT;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "pricingMode" TEXT NOT NULL DEFAULT 'provider_quote';
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "suggestedMinCents" INTEGER;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "suggestedMaxCents" INTEGER;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "hiddenBudgetMaxCents" INTEGER;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "perTaskBudgetCapCents" INTEGER;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "contentDirection" TEXT;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "mediaTypeHint" TEXT;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "slotCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "taskBriefJson" TEXT;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "selectedQuoteId" TEXT;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "serviceFeeRateBps" INTEGER NOT NULL DEFAULT 3000;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "feeChargeSide" TEXT NOT NULL DEFAULT 'provider';
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "publisherPayAmountCents" INTEGER;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "platformServiceFeeCents" INTEGER;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "providerIncomeCents" INTEGER;
ALTER TABLE "TaskOrder" ADD COLUMN IF NOT EXISTS "freezeRequestId" TEXT;

CREATE TABLE IF NOT EXISTS "TaskOrderQuote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerExpectedIncomeCents" INTEGER NOT NULL,
    "publisherPayAmountCents" INTEGER NOT NULL,
    "platformServiceFeeCents" INTEGER NOT NULL,
    "serviceFeeRateBps" INTEGER NOT NULL DEFAULT 3000,
    "mediaName" TEXT,
    "mediaType" TEXT,
    "publishPlatform" TEXT,
    "estimatedPublishAt" TIMESTAMP(3),
    "deliveryPromise" TEXT,
    "includeLink" BOOLEAN NOT NULL DEFAULT false,
    "includeScreenshot" BOOLEAN NOT NULL DEFAULT true,
    "includeIndexingProof" BOOLEAN NOT NULL DEFAULT false,
    "overRangeReason" TEXT,
    "quoteExpiresAt" TIMESTAMP(3),
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskOrderQuote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TaskOrderQuote_orderId_status_idx" ON "TaskOrderQuote"("orderId", "status");
CREATE INDEX IF NOT EXISTS "TaskOrderQuote_providerId_createdAt_idx" ON "TaskOrderQuote"("providerId", "createdAt");

ALTER TABLE "TaskOrderQuote" ADD CONSTRAINT "TaskOrderQuote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TaskOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "PlatformMediaPriceBand" (
    "id" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "contentDirection" TEXT,
    "publishPlatform" TEXT,
    "industry" TEXT,
    "city" TEXT,
    "suggestedMinCents" INTEGER NOT NULL,
    "suggestedMaxCents" INTEGER NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "sourceType" TEXT NOT NULL DEFAULT 'manual_seed',
    "status" TEXT NOT NULL DEFAULT 'active',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformMediaPriceBand_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SettlementRecord" ADD COLUMN IF NOT EXISTS "publisherPayAmountCents" INTEGER;
ALTER TABLE "SettlementRecord" ADD COLUMN IF NOT EXISTS "platformServiceFeeCents" INTEGER;
ALTER TABLE "SettlementRecord" ADD COLUMN IF NOT EXISTS "providerIncomeCents" INTEGER;
ALTER TABLE "SettlementRecord" ADD COLUMN IF NOT EXISTS "serviceFeeRateBps" INTEGER;
ALTER TABLE "SettlementRecord" ADD COLUMN IF NOT EXISTS "feeChargeSide" TEXT;
ALTER TABLE "SettlementRecord" ADD COLUMN IF NOT EXISTS "settlementBaseAmountCents" INTEGER;
ALTER TABLE "SettlementRecord" ADD COLUMN IF NOT EXISTS "isDemoSettlement" BOOLEAN NOT NULL DEFAULT false;

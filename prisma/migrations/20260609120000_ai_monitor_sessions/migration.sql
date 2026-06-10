-- CreateTable
CREATE TABLE "AiMonitorSession" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "accountLabel" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "verifyTaskId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMonitorSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiMonitorSession_brandId_idx" ON "AiMonitorSession"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "AiMonitorSession_brandId_platform_key" ON "AiMonitorSession"("brandId", "platform");

-- AddForeignKey
ALTER TABLE "AiMonitorSession" ADD CONSTRAINT "AiMonitorSession_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

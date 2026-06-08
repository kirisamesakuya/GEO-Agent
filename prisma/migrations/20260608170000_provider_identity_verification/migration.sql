-- AlterTable
ALTER TABLE "Provider" ADD COLUMN "identityRealName" TEXT,
ADD COLUMN "identityIdNumberMask" TEXT,
ADD COLUMN "identityVerifiedAt" TIMESTAMP(3);

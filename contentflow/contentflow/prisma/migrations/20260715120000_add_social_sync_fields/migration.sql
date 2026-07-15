-- AlterTable
ALTER TABLE "content" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalUrl" TEXT;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "social_accounts" ADD COLUMN     "externalAccountId" TEXT,
ADD COLUMN     "externalUsername" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "content_brandId_externalId_key" ON "content"("brandId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "messages_brandId_externalId_key" ON "messages"("brandId", "externalId");

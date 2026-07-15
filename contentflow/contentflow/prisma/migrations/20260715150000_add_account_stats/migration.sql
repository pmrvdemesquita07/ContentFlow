-- AlterTable
ALTER TABLE "social_accounts" ADD COLUMN     "followersCount" INTEGER,
ADD COLUMN     "followingCount" INTEGER,
ADD COLUMN     "mediaCount" INTEGER,
ADD COLUMN     "profilePictureUrl" TEXT;

-- CreateTable
CREATE TABLE "account_snapshots" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "followersCount" INTEGER NOT NULL,
    "followingCount" INTEGER NOT NULL,
    "mediaCount" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_snapshots_socialAccountId_capturedAt_idx" ON "account_snapshots"("socialAccountId", "capturedAt");

-- AddForeignKey
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

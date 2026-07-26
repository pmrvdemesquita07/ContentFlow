-- CreateEnum
CREATE TYPE "ReviewerRole" AS ENUM ('agency', 'creator');

-- AlterTable
ALTER TABLE "creators" ADD COLUMN     "sourceWorkspaceId" TEXT;

-- CreateTable
CREATE TABLE "match_threads" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "reviewerRole" "ReviewerRole" NOT NULL,
    "reviewerUserId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_threads_matchId_key" ON "match_threads"("matchId");

-- CreateIndex
CREATE INDEX "thread_messages_threadId_createdAt_idx" ON "thread_messages"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_contractId_reviewerRole_key" ON "reviews"("contractId", "reviewerRole");

-- CreateIndex
CREATE INDEX "creators_sourceWorkspaceId_idx" ON "creators"("sourceWorkspaceId");

-- AddForeignKey
ALTER TABLE "creators" ADD CONSTRAINT "creators_sourceWorkspaceId_fkey" FOREIGN KEY ("sourceWorkspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_threads" ADD CONSTRAINT "match_threads_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "match_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

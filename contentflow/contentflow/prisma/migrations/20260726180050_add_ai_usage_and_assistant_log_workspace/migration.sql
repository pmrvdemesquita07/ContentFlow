/*
  Warnings:

  - Added the required column `workspaceId` to the `assistant_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "AssistantType" ADD VALUE 'briefing';

-- AlterTable
ALTER TABLE "assistant_logs" ADD COLUMN     "workspaceId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_workspaceId_month_key" ON "ai_usage"("workspaceId", "month");

-- CreateIndex
CREATE INDEX "assistant_logs_workspaceId_createdAt_idx" ON "assistant_logs"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "assistant_logs" ADD CONSTRAINT "assistant_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

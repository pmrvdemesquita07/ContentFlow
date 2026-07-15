/*
  Warnings:

  - Added the required column `brandId` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "brandId" TEXT NOT NULL,
ADD COLUMN     "workspaceId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "messages_workspaceId_status_idx" ON "messages"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

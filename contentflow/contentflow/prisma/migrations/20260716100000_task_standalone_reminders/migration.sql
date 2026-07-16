-- Tasks become standalone reminders: contentId becomes optional, and
-- workspaceId/brandId are added directly (same pattern as Message/Media)
-- so a task doesn't have to be attached to a post to be brand-scoped.

-- AlterTable: add nullable columns first, backfill, then enforce NOT NULL
ALTER TABLE "tasks" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "tasks" ADD COLUMN "brandId" TEXT;

UPDATE "tasks" t
SET "workspaceId" = c."workspaceId",
    "brandId" = c."brandId"
FROM "content" c
WHERE t."contentId" = c."id";

ALTER TABLE "tasks" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "tasks" ALTER COLUMN "brandId" SET NOT NULL;
ALTER TABLE "tasks" ALTER COLUMN "contentId" DROP NOT NULL;

-- DropForeignKey (contentId FK was ON DELETE CASCADE - becomes SET NULL now
-- that a task can outlive the post it was about)
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_contentId_fkey";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Real comments synced from the platform - replying here calls the
-- platform's actual reply API, this isn't a local-only note.

CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "authorUsername" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'unread',
    "replyText" TEXT,
    "repliedAt" TIMESTAMP(3),
    "externalId" TEXT NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "comments_brandId_externalId_key" ON "comments"("brandId", "externalId");
CREATE INDEX "comments_workspaceId_status_idx" ON "comments"("workspaceId", "status");

ALTER TABLE "comments" ADD CONSTRAINT "comments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

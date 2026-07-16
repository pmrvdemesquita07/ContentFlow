-- Media can now attach to a Campaign (briefing docs: PDF/Excel/PowerPoint/etc)
-- in addition to Content, and carries the original filename so non-image
-- attachments can be shown/downloaded by name instead of just an icon.

ALTER TABLE "media" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "media" ADD COLUMN "fileName" TEXT;

ALTER TABLE "media" ADD CONSTRAINT "media_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

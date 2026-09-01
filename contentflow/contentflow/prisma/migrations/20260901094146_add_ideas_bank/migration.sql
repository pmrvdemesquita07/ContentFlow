-- AlterTable
ALTER TABLE "content" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "idea_sources" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "previewTitle" TEXT,
    "previewDescription" TEXT,
    "previewImageUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idea_sources_contentId_key" ON "idea_sources"("contentId");

-- AddForeignKey
ALTER TABLE "idea_sources" ADD CONSTRAINT "idea_sources_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

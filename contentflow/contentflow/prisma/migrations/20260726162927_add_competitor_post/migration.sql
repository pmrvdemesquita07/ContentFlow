-- CreateTable
CREATE TABLE "competitor_posts" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "competitor_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "competitor_posts_competitorId_observedAt_idx" ON "competitor_posts"("competitorId", "observedAt");

-- AddForeignKey
ALTER TABLE "competitor_posts" ADD CONSTRAINT "competitor_posts_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "content" ADD COLUMN     "thumbnailUrl" TEXT;

-- AlterTable
ALTER TABLE "metrics" ADD COLUMN     "saved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "videoViews" INTEGER NOT NULL DEFAULT 0;

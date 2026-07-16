-- AlterTable
ALTER TABLE "content" ADD COLUMN "mentions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "content" ADD COLUMN "locationName" TEXT;

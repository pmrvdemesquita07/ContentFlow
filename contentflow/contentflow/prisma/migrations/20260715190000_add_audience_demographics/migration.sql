-- CreateTable
CREATE TABLE "audience_demographics" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "genderData" JSONB NOT NULL,
    "ageData" JSONB NOT NULL,
    "countryData" JSONB NOT NULL,
    "cityData" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audience_demographics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audience_demographics_socialAccountId_key" ON "audience_demographics"("socialAccountId");

-- AddForeignKey
ALTER TABLE "audience_demographics" ADD CONSTRAINT "audience_demographics_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

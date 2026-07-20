-- Opportunities (briefs posted by brands/agencies) and Matches (creator applications).

CREATE TYPE "OpportunityStatus" AS ENUM ('open', 'closed');
CREATE TYPE "MatchStatus" AS ENUM ('applied', 'invited', 'accepted', 'rejected', 'withdrawn');

CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "niche" TEXT,
    "platform" "SocialPlatform",
    "budget" DECIMAL(10,2),
    "deadline" TIMESTAMP(3),
    "status" "OpportunityStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "opportunities_workspaceId_idx" ON "opportunities"("workspaceId");

ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "creatorWorkspaceId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'applied',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "matches_opportunityId_creatorWorkspaceId_key" ON "matches"("opportunityId", "creatorWorkspaceId");
CREATE INDEX "matches_opportunityId_idx" ON "matches"("opportunityId");
CREATE INDEX "matches_creatorWorkspaceId_idx" ON "matches"("creatorWorkspaceId");

ALTER TABLE "matches" ADD CONSTRAINT "matches_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_creatorWorkspaceId_fkey" FOREIGN KEY ("creatorWorkspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Opt-in marketplace visibility fields for creator-type workspaces.

ALTER TABLE "workspaces" ADD COLUMN "discoverable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "workspaces" ADD COLUMN "discoveryNiche" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "discoveryBio" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "discoveryContactEmail" TEXT;

-- Reversible archive for workspaces, separate from a hard delete.

ALTER TABLE "workspaces" ADD COLUMN "archivedAt" TIMESTAMP(3);

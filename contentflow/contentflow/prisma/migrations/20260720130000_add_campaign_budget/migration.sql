-- Real budget/cost for a campaign, so ROI can be computed against synced metrics.

ALTER TABLE "campaigns" ADD COLUMN "budget" DECIMAL(10,2);

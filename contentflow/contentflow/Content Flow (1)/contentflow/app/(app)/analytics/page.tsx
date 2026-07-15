import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getAnalyticsData } from "@/lib/analytics";
import { Card, CardContent } from "@/components/ui/card";

const STAT_LABELS = [
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "reach", label: "Reach" },
] as const;

export default async function AnalyticsPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const { totals, byCampaign, hasAnyMetrics } = await getAnalyticsData(ctx.brand.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Real performance only - nothing here is estimated.
        </p>
      </div>

      {!hasAnyMetrics ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              No metrics yet. Connect an account in Social Hub and metrics will start showing up
              here as your posts collect real likes, comments, shares, and reach.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STAT_LABELS.map(({ key, label }) => (
              <Card key={key}>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-semibold">{totals[key].toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="pt-5">
              <h2 className="mb-3 text-sm font-semibold">By campaign</h2>
              <div className="flex flex-col divide-y">
                {byCampaign.map((row) => (
                  <div key={row.campaignId} className="flex items-center justify-between py-2 text-sm">
                    <span>{row.campaignId === "uncategorized" ? "No campaign" : row.campaignId}</span>
                    <span className="text-muted-foreground">
                      {row.likes + row.comments + row.shares} interactions - {row.reach} reach
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

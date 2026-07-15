import { TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getDashboardData } from "@/lib/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentStatus } from "@/lib/generated/prisma/enums";

const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Ideas",
  draft: "Drafts",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const { counts, highEngagement, hasAnyMetrics } = await getDashboardData(ctx.brand.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {ctx.workspace.name} - {ctx.brand.name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {(Object.entries(STATUS_LABELS) as [ContentStatus, string][]).map(([status, label]) => (
          <Card key={status}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold">{counts[status] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" />
            Engagement alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnyMetrics ? (
            <p className="text-sm text-muted-foreground">
              No real metrics yet - connect a platform in Social Hub to start seeing engagement
              data here.
            </p>
          ) : highEngagement.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing over 500 interactions yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {highEngagement.map(({ content, interactions }) => (
                <li key={content.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium">{content.title}</span>
                  <Badge variant="success">{interactions.toLocaleString()} interactions</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

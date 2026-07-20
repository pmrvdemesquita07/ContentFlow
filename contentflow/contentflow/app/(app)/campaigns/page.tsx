import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getCampaignsForBrand } from "@/lib/campaigns";
import { Card, CardContent } from "@/components/ui/card";
import { NewCampaignForm } from "./new-campaign-form";

function formatDateRange(start: Date | null, end: Date | null) {
  if (!start && !end) return "No dates set";
  const fmt = (d: Date) => d.toLocaleDateString();
  if (start && end) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

export default async function CampaignsPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const campaigns = await getCampaignsForBrand(ctx.brand.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Group content into a campaign to plan and measure it together.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              No campaigns yet. Create one below, then add posts to it from the campaign page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardContent className="flex flex-col gap-2 pt-5">
                  <h2 className="font-medium">{c.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {formatDateRange(c.startDate, c.endDate)}
                  </p>
                  {c.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <span>
                      <span className="font-semibold">{c.contentCount}</span>{" "}
                      <span className="text-muted-foreground">posts</span>
                    </span>
                    <span>
                      <span className="font-semibold">{c.interactions.toLocaleString()}</span>{" "}
                      <span className="text-muted-foreground">interactions</span>
                    </span>
                    <span>
                      <span className="font-semibold">{c.reach.toLocaleString()}</span>{" "}
                      <span className="text-muted-foreground">reach</span>
                    </span>
                  </div>
                  {c.roi && (
                    <p className="text-xs text-muted-foreground">
                      {c.roi.costPerInteraction !== null
                        ? `${c.roi.costPerInteraction.toLocaleString(undefined, { style: "currency", currency: "EUR" })} / interaction`
                        : `${c.roi.budget.toLocaleString(undefined, { style: "currency", currency: "EUR" })} budget`}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card className="max-w-lg">
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">New campaign</h2>
          <NewCampaignForm />
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getCreatorsForWorkspace } from "@/lib/creators";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewCreatorForm } from "./new-creator-form";
import { DeleteCreatorButton } from "./delete-creator-button";

export default async function CreatorsPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;

  const creators = await getCreatorsForWorkspace(ctx.workspace.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Creators</h1>
        <p className="text-sm text-muted-foreground">
          Your roster of content creators - add them here, then attach them to a campaign from its
          page.
        </p>
      </div>

      {creators.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              No creators yet. Add one below, then assign them to a campaign.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {creators.map((creator) => (
            <div key={creator.id} className="flex items-center gap-3 p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="font-medium">{creator.name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {creator.contactEmail && <span>{creator.contactEmail}</span>}
                  {creator.contactPhone && <span>{creator.contactPhone}</span>}
                  {creator.instagramHandle && <span>IG @{creator.instagramHandle}</span>}
                  {creator.tiktokHandle && <span>TikTok @{creator.tiktokHandle}</span>}
                </div>
                {creator.campaigns.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {creator.campaigns.map((cc) => (
                      <Link key={cc.campaign.id} href={`/campaigns/${cc.campaign.id}`}>
                        <Badge variant="outline">{cc.campaign.name}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <DeleteCreatorButton creatorId={creator.id} />
            </div>
          ))}
        </div>
      )}

      <Card className="max-w-2xl">
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">New creator</h2>
          <NewCreatorForm />
        </CardContent>
      </Card>
    </div>
  );
}

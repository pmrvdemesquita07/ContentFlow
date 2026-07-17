import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getCampaignDetail, getUnassignedContent } from "@/lib/campaigns";
import { getCreatorsForCampaign, getUnassignedCreators } from "@/lib/creators";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditCampaignForm } from "./edit-campaign-form";
import { DeleteCampaignButton } from "./delete-campaign-button";
import { AssignContentForm } from "./assign-content-form";
import { RemoveContentButton } from "./remove-content-button";
import { CampaignFiles } from "./campaign-files";
import { AssignCreatorForm } from "./assign-creator-form";
import { RemoveCreatorButton } from "./remove-creator-button";

const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  reel: "Reel",
  carousel: "Carousel",
  video: "Video",
  story: "Story",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const campaign = await getCampaignDetail(id, ctx.brand.id);
  if (!campaign) notFound();

  const unassigned = await getUnassignedContent(ctx.brand.id);
  const [campaignCreators, unassignedCreators] = await Promise.all([
    getCreatorsForCampaign(campaign.id),
    getUnassignedCreators(ctx.workspace.id, campaign.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{campaign.name}</h1>
          {campaign.description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{campaign.description}</p>
          )}
        </div>
        <DeleteCampaignButton campaignId={campaign.id} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Posts</p>
            <p className="text-2xl font-semibold">{campaign.posts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Interactions</p>
            <p className="text-2xl font-semibold">{campaign.totals.interactions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Reach</p>
            <p className="text-2xl font-semibold">{campaign.totals.reach.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Likes + comments</p>
            <p className="text-2xl font-semibold">
              {(campaign.totals.likes + campaign.totals.comments).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Posts in this campaign</h2>
          {campaign.posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No posts yet - add some from the list below.
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              {campaign.posts.map((post) => (
                <div key={post.id} className="flex items-center gap-3 py-3">
                  {post.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnailUrl}
                      alt=""
                      className="size-12 shrink-0 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-12 shrink-0 rounded bg-muted" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-sm font-medium">{post.title}</p>
                    <Badge variant="outline" className="w-fit capitalize">
                      {TYPE_LABELS[post.type] ?? post.type}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{post.likes.toLocaleString()} likes</span>
                    <span>{post.comments.toLocaleString()} comments</span>
                    <span>{post.reach.toLocaleString()} reach</span>
                  </div>
                  <RemoveContentButton contentId={post.id} campaignId={campaign.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Add a post to this campaign</h2>
          <AssignContentForm campaignId={campaign.id} unassigned={unassigned} />
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Creators on this campaign</h2>
          {campaignCreators.length === 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">
              No creators added yet - add one from your{" "}
              <a href="/creators" className="underline">
                roster
              </a>{" "}
              or below.
            </p>
          ) : (
            <div className="mb-3 flex flex-col divide-y">
              {campaignCreators.map((cc) => (
                <div key={cc.creator.id} className="flex items-center justify-between py-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{cc.creator.name}</span>
                    {cc.creator.instagramHandle && (
                      <span className="text-xs text-muted-foreground">
                        @{cc.creator.instagramHandle}
                      </span>
                    )}
                  </div>
                  <RemoveCreatorButton creatorId={cc.creator.id} campaignId={campaign.id} />
                </div>
              ))}
            </div>
          )}
          <AssignCreatorForm campaignId={campaign.id} unassigned={unassignedCreators} />
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Briefing files</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            PDFs, Word, Excel, PowerPoint - anything the team needs for this campaign.
          </p>
          <CampaignFiles campaignId={campaign.id} files={campaign.files} />
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Edit campaign</h2>
          <EditCampaignForm
            campaignId={campaign.id}
            name={campaign.name}
            description={campaign.description ?? ""}
            startDate={campaign.startDate}
            endDate={campaign.endDate}
          />
        </CardContent>
      </Card>
    </div>
  );
}

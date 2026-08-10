import Link from "next/link";
import { MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getFilteredContent } from "@/lib/content";
import { getCampaignOptions } from "@/lib/campaigns";
import { planAtLeast } from "@/lib/plan";
import { NewContentDialog } from "@/components/content/new-content-dialog";
import { StatusBadge } from "@/components/content/status-badge";
import { ContentDetailDialog } from "@/components/content/content-detail-dialog";
import { ListFilters } from "@/components/content/list-filters";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContentStatus, ContentType } from "@/lib/generated/prisma/enums";

const POST_STATUSES: ContentStatus[] = ["draft", "scheduled", "published"];
const TYPES: ContentType[] = ["post", "story", "reel", "video", "carousel"];

const FILTERS: { label: string; value: "all" | ContentStatus }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Published", value: "published" },
];

function parseDateParam(value?: string) {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; campaignId?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;
  const isPro = planAtLeast(ctx.workspace.plan, "pro");

  const activeFilter = FILTERS.some((f) => f.value === params.status) ? params.status : "all";
  const statuses = activeFilter === "all" ? POST_STATUSES : [activeFilter as ContentStatus];
  const type = params.type && (TYPES as string[]).includes(params.type) ? (params.type as ContentType) : undefined;
  const to = parseDateParam(params.to);
  // Inclusive of the whole "to" day, matching the picker's own day-granularity intent.
  const toEndOfDay = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;

  const [posts, campaignOptions] = await Promise.all([
    getFilteredContent(ctx.brand.id, {
      statuses,
      type,
      campaignId: params.campaignId,
      from: parseDateParam(params.from),
      to: toEndOfDay,
    }),
    isPro ? getCampaignOptions(ctx.brand.id) : Promise.resolve(undefined),
  ]);

  // Preserve every other active filter while switching status tabs.
  const otherParams = new URLSearchParams();
  if (params.type) otherParams.set("type", params.type);
  if (params.campaignId) otherParams.set("campaignId", params.campaignId);
  if (params.from) otherParams.set("from", params.from);
  if (params.to) otherParams.set("to", params.to);
  const otherQs = otherParams.toString();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Posts</h1>
          <p className="text-sm text-muted-foreground">
            Everything drafted, queued, or already live.
          </p>
        </div>
        <NewContentDialog defaultStatus="draft" triggerLabel="New post" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex gap-1">
          {FILTERS.map((f) => {
            const qs = new URLSearchParams(otherQs);
            if (f.value !== "all") qs.set("status", f.value);
            const qsString = qs.toString();
            return (
              <Link
                key={f.value}
                href={qsString ? `/posts?${qsString}` : "/posts"}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm font-medium",
                  activeFilter === f.value
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <ListFilters campaigns={campaignOptions} />
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {posts.map((post) => (
            <ContentDetailDialog key={post.id} content={post}>
              <div className="flex w-full items-center justify-between gap-4 px-4 py-3 hover:bg-accent/50">
                <div className="flex min-w-0 items-center gap-3">
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
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="truncate text-sm font-medium">{post.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="capitalize">
                        {post.type}
                      </Badge>
                      {post.platforms.map((p) => (
                        <Badge key={p} variant="secondary" className="capitalize">
                          {p}
                        </Badge>
                      ))}
                      {post.locationName && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {post.locationName}
                        </span>
                      )}
                      {post.mentions.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {post.mentions.map((m) => `@${m}`).join(" ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {post.metrics[0] &&
                    (post.type === "story" ? (
                      <div className="hidden text-right text-xs text-muted-foreground sm:block">
                        <p>
                          {post.metrics[0].reach.toLocaleString()} reach ·{" "}
                          {post.metrics[0].replies.toLocaleString()} replies
                        </p>
                        <p>
                          {post.metrics[0].tapsForward.toLocaleString()} forward ·{" "}
                          {post.metrics[0].exits.toLocaleString()} exits
                        </p>
                      </div>
                    ) : (
                      <div className="hidden text-right text-xs text-muted-foreground sm:block">
                        <p>
                          {post.metrics[0].likes.toLocaleString()} likes ·{" "}
                          {post.metrics[0].comments.toLocaleString()} comments
                          {post.metrics[0].videoViews > 0 &&
                            ` · ${post.metrics[0].videoViews.toLocaleString()} views`}
                        </p>
                        <p>
                          {(
                            post.metrics[0].likes +
                            post.metrics[0].comments +
                            post.metrics[0].shares +
                            post.metrics[0].saved +
                            post.metrics[0].replies
                          ).toLocaleString()}{" "}
                          interactions
                        </p>
                      </div>
                    ))}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {post.scheduledAt && (
                      <span>{new Date(post.scheduledAt).toLocaleString()}</span>
                    )}
                    <StatusBadge status={post.status} />
                  </div>
                </div>
              </div>
            </ContentDetailDialog>
          ))}
        </div>
      )}
    </div>
  );
}

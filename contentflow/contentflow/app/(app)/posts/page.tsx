import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getContentByStatuses } from "@/lib/content";
import { NewContentDialog } from "@/components/content/new-content-dialog";
import { StatusBadge } from "@/components/content/status-badge";
import { ContentDetailDialog } from "@/components/content/content-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContentStatus } from "@/lib/generated/prisma/enums";

const POST_STATUSES: ContentStatus[] = ["draft", "scheduled", "published"];

const FILTERS: { label: string; value: "all" | ContentStatus }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Published", value: "published" },
];

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const activeFilter = FILTERS.some((f) => f.value === status) ? status : "all";
  const statuses = activeFilter === "all" ? POST_STATUSES : [activeFilter as ContentStatus];
  const posts = await getContentByStatuses(ctx.brand.id, statuses);

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

      <div className="flex gap-1 border-b">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/posts" : `/posts?status=${f.value}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              activeFilter === f.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </Link>
        ))}
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
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {post.metrics[0] && (
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
                  )}
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

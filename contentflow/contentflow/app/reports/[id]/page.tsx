import { notFound } from "next/navigation";
import { getPublicReportData } from "@/lib/reports";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";

const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  reel: "Reel",
  carousel: "Carousel",
  video: "Video",
  story: "Story",
};

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getPublicReportData(id);
  if (!report) notFound();

  const currencyFmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "EUR" });

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Logo size="sm" />
        <p className="text-xs text-muted-foreground">
          Generated {report.generatedAt.toLocaleDateString()}
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{report.campaignName}</h1>
        <p className="text-sm text-muted-foreground">{report.workspaceName}</p>
        {report.campaignDescription && (
          <p className="mt-2 text-sm text-muted-foreground">{report.campaignDescription}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Posts</p>
            <p className="text-2xl font-semibold">{report.posts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Interactions</p>
            <p className="text-2xl font-semibold">{report.totals.interactions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Reach</p>
            <p className="text-2xl font-semibold">{report.totals.reach.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Likes + comments</p>
            <p className="text-2xl font-semibold">
              {(report.totals.likes + report.totals.comments).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {report.roi && (
        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-3 text-sm font-semibold">ROI</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-xl font-semibold">{currencyFmt(report.roi.budget)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cost per interaction</p>
                <p className="text-xl font-semibold">
                  {report.roi.costPerInteraction !== null
                    ? currencyFmt(report.roi.costPerInteraction)
                    : "No interactions yet"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cost per reach</p>
                <p className="text-xl font-semibold">
                  {report.roi.costPerReach !== null ? currencyFmt(report.roi.costPerReach) : "No reach yet"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Top posts</h2>
          {report.posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts in this campaign yet.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {report.posts.map((post) => (
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{post.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABELS[post.type] ?? post.type}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{post.likes.toLocaleString()} likes</span>
                    <span>{post.comments.toLocaleString()} comments</span>
                    <span>{post.reach.toLocaleString()} reach</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Real performance data, synced directly from the connected platform.
      </p>
    </div>
  );
}

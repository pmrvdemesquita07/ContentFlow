import type { ContentWithRelations } from "@/lib/types";
import { parseMentions, parseHashtags } from "@/lib/text-parse";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  story: "Story",
  reel: "Reel",
  video: "Video",
  carousel: "Carousel",
};

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2.5 text-center">
      <p className="text-lg font-semibold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function ContentMetrics({ content }: { content: ContentWithRelations }) {
  const metric = content.metrics[0];
  const isStory = content.type === "story";
  const bodyMentions = parseMentions(content.body);
  const mentions = [...new Set([...content.mentions, ...bodyMentions])];
  const hashtags = parseHashtags(content.body);

  return (
    <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto text-sm">
      <div className="grid grid-cols-2 gap-3">
        <InfoTile label="Type" value={TYPE_LABELS[content.type] ?? content.type} />
        <InfoTile
          label="Published"
          value={
            content.publishedAt
              ? new Date(content.publishedAt).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Not published yet"
          }
        />
        <InfoTile label="Location" value={content.locationName ?? "Not tagged"} />
        <InfoTile
          label="Collab"
          value={
            content.collaborators.length > 0
              ? content.collaborators.map((c) => `@${c}`).join(", ")
              : "Solo post"
          }
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Metrics</p>
        {metric ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {isStory ? (
              <>
                <StatTile label="Reach" value={metric.reach} />
                <StatTile label="Replies" value={metric.replies} />
                <StatTile label="Forward taps" value={metric.tapsForward} />
                <StatTile label="Exits" value={metric.exits} />
              </>
            ) : (
              <>
                <StatTile label="Likes" value={metric.likes} />
                <StatTile label="Comments" value={metric.comments} />
                <StatTile label="Shares" value={metric.shares} />
                <StatTile label="Saved" value={metric.saved} />
                <StatTile label="Reach" value={metric.reach} />
                {metric.videoViews > 0 && <StatTile label="Views" value={metric.videoViews} />}
                {metric.impressions > 0 && (
                  <StatTile label="Impressions" value={metric.impressions} />
                )}
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No metrics captured yet.</p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
          Hashtags{hashtags.length > 0 && ` (${hashtags.length})`}
        </p>
        {hashtags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hashtags used.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((h) => (
              <Badge key={h} variant="secondary">
                #{h}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
          Mentions{mentions.length > 0 && ` (${mentions.length})`}
        </p>
        {mentions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts mentioned.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {mentions.map((m) => (
              <Badge key={m} variant="outline">
                @{m}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
          Full description
        </p>
        {content.body ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content.body}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No caption.</p>
        )}
      </div>
    </div>
  );
}

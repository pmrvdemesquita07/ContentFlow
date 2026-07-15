import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getSocialHubData } from "@/lib/social";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisconnectButton } from "./disconnect-button";
import { SyncButton } from "./sync-button";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

const PLATFORMS: { key: SocialPlatform; label: string; live: boolean }[] = [
  { key: "instagram", label: "Instagram", live: true },
  { key: "tiktok", label: "TikTok", live: false },
  { key: "x", label: "X", live: false },
  { key: "youtube", label: "YouTube", live: false },
  { key: "linkedin", label: "LinkedIn", live: false },
];

const TOTAL_STATS = [
  { key: "followers", label: "Total followers" },
  { key: "following", label: "Total following" },
  { key: "posts", label: "Posts synced" },
  { key: "interactions", label: "Total interactions" },
  { key: "comments", label: "Total comments" },
  { key: "videoViews", label: "Total video views" },
] as const;

export default async function SocialHubPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const { accounts, platformTotals, totals } = await getSocialHubData(ctx.brand.id);
  const accountsByPlatform = new Map(accounts.map((a) => [a.platform, a]));
  const platformTotalsByPlatform = new Map(platformTotals.map((p) => [p.platform, p]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Social Hub</h1>
        <p className="text-sm text-muted-foreground">
          Connect an account and its real metrics start flowing into Analytics and Dashboard.
        </p>
      </div>

      {connected && (
        <p className="text-sm text-success">Connected {connected} successfully.</p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          Something went wrong connecting that account ({error}). Try again.
        </p>
      )}

      {accounts.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {TOTAL_STATS.map(({ key, label }) => (
            <Card key={key}>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold">{totals[key].toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {PLATFORMS.map((platform) => {
          const account = accountsByPlatform.get(platform.key);
          const accountTotals = platformTotalsByPlatform.get(platform.key);
          return (
            <Card key={platform.key}>
              <CardContent className="flex flex-col gap-4 pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {account?.profilePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={account.profilePictureUrl}
                        alt=""
                        className="size-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-10 shrink-0 rounded-full bg-muted" />
                    )}
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{platform.label}</span>
                        {account ? (
                          <Badge variant="success">Connected</Badge>
                        ) : platform.live ? (
                          <Badge variant="outline">Not connected</Badge>
                        ) : (
                          <Badge variant="outline">Coming soon</Badge>
                        )}
                      </div>
                      {account && (
                        <p className="text-xs text-muted-foreground">
                          {account.externalUsername ? `@${account.externalUsername} - ` : ""}
                          {account.lastSyncedAt
                            ? `Last synced ${new Date(account.lastSyncedAt).toLocaleString()}`
                            : "Not synced yet"}
                        </p>
                      )}
                    </div>
                  </div>
                  {account ? (
                    <div className="flex items-center gap-2">
                      <SyncButton id={account.id} />
                      <DisconnectButton id={account.id} />
                    </div>
                  ) : platform.live ? (
                    <Button size="sm" asChild>
                      <a href="/auth/instagram/start">Connect</a>
                    </Button>
                  ) : (
                    <Button size="sm" disabled>
                      Connect
                    </Button>
                  )}
                </div>

                {account && (
                  <div className="grid grid-cols-3 gap-4 border-t pt-4 sm:grid-cols-6">
                    <Stat label="Followers" value={account.followersCount} />
                    <Stat label="Following" value={account.followingCount} />
                    <Stat label="Posts" value={account.mediaCount} />
                    <Stat label="Interactions" value={accountTotals?.interactions ?? 0} />
                    <Stat label="Comments" value={accountTotals?.comments ?? 0} />
                    <Stat label="Video views" value={accountTotals?.videoViews ?? 0} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{(value ?? 0).toLocaleString()}</p>
    </div>
  );
}

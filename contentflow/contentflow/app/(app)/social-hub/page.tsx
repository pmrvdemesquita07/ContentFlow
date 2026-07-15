import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getSocialAccountsForBrand } from "@/lib/social";
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

export default async function SocialHubPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const accounts = await getSocialAccountsForBrand(ctx.brand.id);
  const accountsByPlatform = new Map(accounts.map((a) => [a.platform, a]));

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

      <div className="flex flex-col gap-3">
        {PLATFORMS.map((platform) => {
          const account = accountsByPlatform.get(platform.key);
          return (
            <Card key={platform.key}>
              <CardContent className="flex items-center justify-between pt-5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
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
                      {account.lastSyncedAt
                        ? `Last synced ${new Date(account.lastSyncedAt).toLocaleString()}`
                        : "Not synced yet"}
                    </p>
                  )}
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { updateDiscoveryProfile } from "@/app/actions/discovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Account = { platform: string; externalUsername: string | null; followersCount: number | null };

export function DiscoveryProfileForm({
  profile,
  accounts,
}: {
  profile: {
    discoverable: boolean;
    discoveryNiche: string | null;
    discoveryBio: string | null;
    discoveryContactEmail: string | null;
  };
  accounts: Account[];
}) {
  const [state, formAction, pending] = useActionState(updateDiscoveryProfile, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Discovery profile</CardTitle>
        <CardDescription>
          Opt in to be found by brands and agencies searching for creators. When on, the fields
          below plus your connected accounts&apos; real handle and follower count become visible
          on their Discover page - nothing else about your workspace is shared. Contact happens
          outside the app, using the email you publish here.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="discoverable"
              defaultChecked={profile.discoverable}
              className="size-4"
            />
            Visible for discovery
          </label>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discoveryNiche">Niche</Label>
            <Input
              id="discoveryNiche"
              name="discoveryNiche"
              defaultValue={profile.discoveryNiche ?? ""}
              placeholder="e.g. Fitness, beauty, travel"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discoveryBio">Bio</Label>
            <Textarea
              id="discoveryBio"
              name="discoveryBio"
              rows={3}
              defaultValue={profile.discoveryBio ?? ""}
              placeholder="A couple of sentences about what you make and who for."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discoveryContactEmail">Contact email</Label>
            <Input
              id="discoveryContactEmail"
              name="discoveryContactEmail"
              type="email"
              defaultValue={profile.discoveryContactEmail ?? ""}
              placeholder="you@example.com"
            />
          </div>
          {accounts.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Connected accounts shown alongside your profile
              </p>
              <div className="flex flex-col gap-1">
                {accounts.map((a) => (
                  <p key={a.platform} className="text-xs text-muted-foreground">
                    {a.platform}: @{a.externalUsername ?? "-"} -{" "}
                    {(a.followersCount ?? 0).toLocaleString()} followers
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          {state && !state.error && <p className="text-sm text-success">Saved.</p>}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardFooter>
      </form>
    </Card>
  );
}

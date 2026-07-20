import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getDiscoverableCreators } from "@/lib/discovery";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchForm } from "./search-form";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ niche?: string }>;
}) {
  const params = await searchParams;

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;
  if (ctx.workspace.type === "creator") redirect("/dashboard");

  const creators = await getDiscoverableCreators(params.niche);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Discover creators</h1>
        <p className="text-sm text-muted-foreground">
          Creators who opted in to be found. Contact happens outside the app, using the email
          they published - there&apos;s no in-app messaging.
        </p>
      </div>

      <SearchForm defaultValue={params.niche ?? ""} />

      {creators.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              {params.niche
                ? "No creators match that niche yet."
                : "No creators have opted in to discovery yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-2 pt-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-medium">{c.name}</h2>
                  {c.niche && <Badge variant="outline">{c.niche}</Badge>}
                </div>
                {c.bio && <p className="text-sm text-muted-foreground">{c.bio}</p>}
                {c.accounts.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {c.accounts.map((a) => (
                      <p key={a.platform} className="text-xs text-muted-foreground">
                        {PLATFORM_LABELS[a.platform] ?? a.platform}: @{a.externalUsername ?? "-"} -{" "}
                        {(a.followersCount ?? 0).toLocaleString()} followers
                      </p>
                    ))}
                  </div>
                )}
                {c.contactEmail ? (
                  <a
                    href={`mailto:${c.contactEmail}`}
                    className="mt-2 text-sm font-medium text-primary hover:underline"
                  >
                    Contact {c.contactEmail}
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No contact email published.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getDiscoveryProfile } from "@/lib/discovery";
import { getSocialAccountsForBrand } from "@/lib/social";
import { SettingsForm } from "./settings-form";
import { DiscoveryProfileForm } from "./discovery-profile-form";

export default async function SettingsPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const isCreator = ctx.workspace.type === "creator";
  const [profile, accounts] = isCreator
    ? await Promise.all([
        getDiscoveryProfile(ctx.workspace.id),
        getSocialAccountsForBrand(ctx.brand.id),
      ])
    : [null, []];

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {ctx.workspace.name} - Brand Voice tunes every AI Assistant.
        </p>
      </div>
      <SettingsForm brand={ctx.brand} />
      {isCreator && profile && (
        <DiscoveryProfileForm
          profile={profile}
          accounts={accounts.filter((a) => a.status === "connected")}
        />
      )}
    </div>
  );
}

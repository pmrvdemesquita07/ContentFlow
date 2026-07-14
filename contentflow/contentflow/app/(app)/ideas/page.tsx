import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getContentByStatuses } from "@/lib/content";
import { ContentCard } from "@/components/content/content-card";
import { NewContentDialog } from "@/components/content/new-content-dialog";

export default async function IdeasBankPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const ideas = await getContentByStatuses(ctx.brand.id, ["idea"]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ideas Bank</h1>
          <p className="text-sm text-muted-foreground">
            Everything worth posting, before it&apos;s ready to schedule.
          </p>
        </div>
        <NewContentDialog defaultStatus="idea" triggerLabel="New idea" />
      </div>

      {ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No ideas yet. Add one to start filling the bank.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <ContentCard key={idea.id} content={idea} />
          ))}
        </div>
      )}
    </div>
  );
}

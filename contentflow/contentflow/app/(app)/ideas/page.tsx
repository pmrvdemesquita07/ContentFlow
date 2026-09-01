import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getIdeas } from "@/lib/content";
import { IdeaCard } from "@/components/content/idea-card";
import { IdeaQuickCapture } from "@/components/content/idea-quick-capture";
import { NewContentDialog } from "@/components/content/new-content-dialog";

export default async function IdeasBankPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const ideas = await getIdeas(ctx.brand.id);
  const drafts = ideas.filter((i) => !i.approved);
  const approved = ideas.filter((i) => i.approved);

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

      <IdeaQuickCapture />

      {ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No ideas yet. Add one above to start filling the bank.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Draft ideas ({drafts.length})
            </h2>
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing in draft right now.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {drafts.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Approved ({approved.length})
            </h2>
            {approved.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Approve an idea to move it here, ready to turn into a post.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {approved.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

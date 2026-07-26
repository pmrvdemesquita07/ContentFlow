import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getThreadForMatch } from "@/lib/threads";
import { planAtLeast } from "@/lib/plan";
import { Card, CardContent } from "@/components/ui/card";
import { MessageForm } from "./message-form";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;
  if (!planAtLeast(ctx.workspace.plan, "pro")) redirect("/settings?upgrade=1");

  const found = await getThreadForMatch(matchId, ctx.workspace.id);
  if (!found) notFound();

  const { match, isAgencySide } = found;
  const otherPartyName = isAgencySide ? match.creatorWorkspace.name : match.opportunity.workspace.name;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{match.opportunity.title}</h1>
        <p className="text-sm text-muted-foreground">Conversation with {otherPartyName}</p>
      </div>

      {!match.thread ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              No conversation yet - it opens automatically once this match is accepted.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 pt-5">
              {match.thread.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No messages yet - say hello below.
                </p>
              ) : (
                match.thread.messages.map((message) => {
                  const isMine = message.senderId === user.id;
                  return (
                    <div key={message.id} className={isMine ? "self-end text-right" : "self-start"}>
                      <div
                        className={
                          isMine
                            ? "inline-block max-w-md rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                            : "inline-block max-w-md rounded-lg bg-muted px-3 py-2 text-sm"
                        }
                      >
                        {message.body}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {message.sender.name ?? message.sender.email} -{" "}
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
          <MessageForm matchId={matchId} />
        </>
      )}
    </div>
  );
}

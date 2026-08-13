"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { sendThreadMessage } from "@/app/actions/threads";
import { suggestReply } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function MessageForm({ matchId }: { matchId: string }) {
  const action = sendThreadMessage.bind(null, matchId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [isAiSuggestion, setIsAiSuggestion] = useState(false);
  const [suggestError, setSuggestError] = useState<string | undefined>();
  const [isSuggesting, startSuggesting] = useTransition();

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
        setBody("");
        setIsAiSuggestion(false);
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSuggesting}
          onClick={() => {
            setSuggestError(undefined);
            startSuggesting(async () => {
              const result = await suggestReply(matchId);
              if (result.error) {
                setSuggestError(result.error);
              } else if (result.suggestion) {
                setBody(result.suggestion);
                setIsAiSuggestion(true);
              }
            });
          }}
        >
          <Sparkles className="size-3.5" />
          {isSuggesting ? "Thinking…" : "Suggest reply"}
        </Button>
        {isAiSuggestion && (
          <span className="text-xs font-medium text-muted-foreground">
            AI suggestion — review before sending
          </span>
        )}
      </div>
      {suggestError && <p className="text-sm text-destructive">{suggestError}</p>}
      <Textarea
        name="body"
        placeholder="Write a message…"
        rows={3}
        required
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setIsAiSuggestion(false);
        }}
        className={cn(isAiSuggestion && "bg-accent/40")}
      />
      <div className="flex items-center justify-between">
        {state?.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}

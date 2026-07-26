"use client";

import { useActionState, useRef } from "react";
import { sendThreadMessage } from "@/app/actions/threads";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MessageForm({ matchId }: { matchId: string }) {
  const action = sendThreadMessage.bind(null, matchId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2"
    >
      <Textarea name="body" placeholder="Write a message…" rows={3} required />
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

"use client";

import { useActionState } from "react";
import { Star } from "lucide-react";
import { submitReview } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ReviewerRole } from "@/lib/generated/prisma/enums";

type ReviewData = {
  reviewerRole: ReviewerRole;
  rating: number;
  comment: string | null;
  createdAt: Date;
};

const RATINGS = [1, 2, 3, 4, 5];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {RATINGS.map((n) => (
        <Star
          key={n}
          className={cn("size-4", n <= rating ? "fill-primary text-primary" : "text-muted-foreground")}
        />
      ))}
    </div>
  );
}

/**
 * One side's rating on a Contract - either the read-only submitted review,
 * a form to write it (only when `canReview` is true, i.e. the viewer is
 * that side), or a quiet "not yet" placeholder for the other side.
 */
export function ReviewSection({
  contractId,
  role,
  label,
  review,
  canReview,
}: {
  contractId: string;
  role: ReviewerRole;
  label: string;
  review: ReviewData | undefined;
  canReview: boolean;
}) {
  const action = submitReview.bind(null, contractId, role);
  const [state, formAction, pending] = useActionState(action, undefined);

  if (review) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Stars rating={review.rating} />
        {review.comment && <p className="text-sm text-muted-foreground">&ldquo;{review.comment}&rdquo;</p>}
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">No rating yet.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-3">
        <select
          name="rating"
          required
          defaultValue=""
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="" disabled>
            Rating
          </option>
          {RATINGS.map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "star" : "stars"}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Submit review"}
        </Button>
      </div>
      <Textarea name="comment" placeholder="A short comment (optional)" rows={2} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

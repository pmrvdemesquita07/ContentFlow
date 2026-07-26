import { prisma } from "@/lib/db";

/**
 * A creator's average rating from agencies they've worked with - only
 * counts reviewerRole "agency" (the agency rating the creator), computed on
 * the fly rather than cached, so it can never drift out of sync with the
 * underlying reviews. Null when nobody has rated this creator yet.
 */
export async function getAverageCreatorRating(creatorWorkspaceId: string) {
  const result = await prisma.review.aggregate({
    where: {
      reviewerRole: "agency",
      contract: { creator: { sourceWorkspaceId: creatorWorkspaceId } },
    },
    _avg: { rating: true },
    _count: true,
  });
  return { average: result._avg.rating, count: result._count };
}

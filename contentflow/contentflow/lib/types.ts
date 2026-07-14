import type { ContentGetPayload, BrandGetPayload } from "@/lib/generated/prisma/models";

export type ContentWithRelations = ContentGetPayload<{
  include: { tasks: true; media: true };
}>;

export type BrandWithVoice = BrandGetPayload<{
  include: { brandVoice: true };
}>;

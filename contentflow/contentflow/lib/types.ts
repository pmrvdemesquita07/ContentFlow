import type {
  ContentGetPayload,
  BrandGetPayload,
  MessageGetPayload,
} from "@/lib/generated/prisma/models";

export type ContentWithRelations = ContentGetPayload<{
  include: { tasks: true; media: true; metrics: true };
}>;

export type BrandWithVoice = BrandGetPayload<{
  include: { brandVoice: true };
}>;

export type MessageWithContent = MessageGetPayload<{
  include: { content: { select: { id: true; title: true } } };
}>;

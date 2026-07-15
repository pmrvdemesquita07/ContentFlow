import { Badge } from "@/components/ui/badge";
import type { ContentStatus } from "@/lib/generated/prisma/enums";

const STATUS_LABEL: Record<ContentStatus, string> = {
  idea: "Idea",
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

const STATUS_VARIANT: Record<ContentStatus, "secondary" | "default" | "success" | "outline"> = {
  idea: "secondary",
  draft: "outline",
  scheduled: "default",
  published: "success",
  archived: "outline",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

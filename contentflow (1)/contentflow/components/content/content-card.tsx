import { SquareCheck } from "lucide-react";
import type { ContentWithRelations } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { ContentDetailDialog } from "./content-detail-dialog";

export function ContentCard({ content }: { content: ContentWithRelations }) {
  const openTasks = content.tasks.filter((t) => t.status !== "done").length;
  return (
    <ContentDetailDialog content={content}>
      <Card className="w-full cursor-pointer transition-colors hover:border-primary/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{content.title}</CardTitle>
            <StatusBadge status={content.status} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {content.body && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{content.body}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="capitalize">
              {content.type}
            </Badge>
            {content.platforms.map((p) => (
              <Badge key={p} variant="secondary" className="capitalize">
                {p}
              </Badge>
            ))}
            {openTasks > 0 && (
              <Badge variant="outline" className="gap-1">
                <SquareCheck className="size-3" />
                {openTasks}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </ContentDetailDialog>
  );
}

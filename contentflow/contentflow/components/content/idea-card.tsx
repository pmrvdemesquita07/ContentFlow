"use client";

import { Link2 } from "lucide-react";
import type { IdeaWithSource } from "@/lib/types";
import { toggleIdeaApproved } from "@/app/actions/ideas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ContentDetailDialog } from "./content-detail-dialog";

export function IdeaCard({ idea }: { idea: IdeaWithSource }) {
  const image = idea.ideaSource?.previewImageUrl ?? idea.media[0]?.fileUrl;

  return (
    <Card className="w-full overflow-hidden">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URL (link preview or Storage)
        <img src={image} alt="" className="aspect-video w-full object-cover" />
      )}
      <ContentDetailDialog content={idea}>
        <div className="w-full cursor-pointer text-left transition-colors hover:bg-accent/30">
          <CardHeader>
            <CardTitle className="text-base leading-snug">{idea.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {idea.ideaSource ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link2 className="size-3.5 shrink-0" />
                <span className="truncate">
                  {idea.ideaSource.previewDescription ?? idea.ideaSource.sourceUrl}
                </span>
              </p>
            ) : (
              idea.body && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{idea.body}</p>
              )
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="capitalize">
                {idea.type}
              </Badge>
              {idea.platforms.map((p) => (
                <Badge key={p} variant="secondary" className="capitalize">
                  {p}
                </Badge>
              ))}
            </div>
          </CardContent>
        </div>
      </ContentDetailDialog>
      <div className="flex items-center gap-2 border-t px-6 py-3">
        <Checkbox
          id={`approve-${idea.id}`}
          checked={idea.approved}
          onCheckedChange={(checked) => toggleIdeaApproved(idea.id, checked === true)}
        />
        <label htmlFor={`approve-${idea.id}`} className="cursor-pointer text-sm text-muted-foreground">
          Approved
        </label>
      </div>
    </Card>
  );
}

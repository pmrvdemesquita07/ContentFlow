"use client";

import { useActionState } from "react";
import { Trash2, FileIcon } from "lucide-react";
import { uploadMedia, deleteMedia } from "@/app/actions/media";
import type { ContentWithRelations } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MediaSection({ content }: { content: ContentWithRelations }) {
  const uploadForContent = uploadMedia.bind(null, content.id);
  const [state, formAction, pending] = useActionState(uploadForContent, undefined);

  return (
    <div className="flex flex-col gap-4">
      {content.media.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files attached yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {content.media.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-md border">
              {item.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary external Storage URL
                <img src={item.fileUrl} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-muted p-1 text-center text-muted-foreground">
                  <FileIcon className="size-6" />
                  <span className="line-clamp-2 text-[10px] break-all">
                    {item.fileName ?? item.type}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => deleteMedia(item.id)}
                className="absolute top-1 right-1 rounded-md bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Delete file"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form action={formAction} className="flex items-end gap-2 border-t pt-3">
        <Input name="file" type="file" required className="flex-1" />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </form>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}

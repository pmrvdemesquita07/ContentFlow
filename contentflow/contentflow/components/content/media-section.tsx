"use client";

import { useActionState, startTransition, type FormEvent } from "react";
import { Trash2, FileIcon } from "lucide-react";
import { uploadMedia, deleteMedia } from "@/app/actions/media";
import type { ContentWithRelations } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAsciiSafe, asciiSafeFileName } from "@/lib/sanitize-filename";

export function MediaSection({ content }: { content: ContentWithRelations }) {
  const uploadForContent = uploadMedia.bind(null, content.id);
  const [state, formAction, pending] = useActionState(uploadForContent, undefined);

  // Builds the FormData by hand instead of relying on native form
  // submission - some browsers don't honor programmatically reassigning
  // input.files, so the rename-for-transport step below has to happen on a
  // FormData we control rather than by mutating the file input itself.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const safeFile = isAsciiSafe(file.name)
      ? file
      : new File([file], asciiSafeFileName(file.name), { type: file.type });
    const data = new FormData();
    data.append("file", safeFile);
    data.append("originalName", file.name);
    startTransition(() => formAction(data));
  }

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

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t pt-3">
        <Input name="file" type="file" required className="flex-1" />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </form>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}

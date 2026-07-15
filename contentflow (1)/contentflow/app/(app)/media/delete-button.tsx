"use client";

import { Trash2 } from "lucide-react";
import { deleteMedia } from "@/app/actions/media";

export function DeleteMediaButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      onClick={() => deleteMedia(id)}
      className="absolute top-1 right-1 rounded-md bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
      aria-label="Delete file"
    >
      <Trash2 className="size-3.5 text-destructive" />
    </button>
  );
}

"use client";

import { useActionState, startTransition, type FormEvent } from "react";
import { Trash2, FileIcon } from "lucide-react";
import { uploadCampaignFile, deleteMedia } from "@/app/actions/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAsciiSafe, asciiSafeFileName } from "@/lib/sanitize-filename";

type CampaignFile = {
  id: string;
  fileUrl: string;
  fileName: string | null;
  type: string;
  uploadedAt: Date;
};

export function CampaignFiles({
  campaignId,
  files,
}: {
  campaignId: string;
  files: CampaignFile[];
}) {
  const uploadForCampaign = uploadCampaignFile.bind(null, campaignId);
  const [state, formAction, pending] = useActionState(uploadForCampaign, undefined);

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
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No briefing files yet.</p>
      ) : (
        <div className="flex flex-col divide-y">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 py-2">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <a
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm hover:underline"
              >
                {file.fileName ?? "Untitled file"}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(file.uploadedAt).toLocaleDateString()}
              </span>
              <button
                type="button"
                onClick={() => deleteMedia(file.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Delete file"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t pt-3">
        <Input
          name="file"
          type="file"
          required
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Uploading…" : "Upload briefing"}
        </Button>
      </form>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}

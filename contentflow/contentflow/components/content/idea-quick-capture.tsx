"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Lightbulb, CheckCircle2, ImagePlus } from "lucide-react";
import { captureIdea } from "@/app/actions/ideas";
import { uploadMedia } from "@/app/actions/media";
import { isAsciiSafe, asciiSafeFileName } from "@/lib/sanitize-filename";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function IdeaQuickCapture() {
  const [state, formAction, pending] = useActionState(captureIdea, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePending, startImageTransition] = useTransition();
  const [imageError, setImageError] = useState<string | undefined>();
  const [imageDone, setImageDone] = useState(false);

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError(undefined);
    setImageDone(false);
    startImageTransition(async () => {
      const captureData = new FormData();
      captureData.append("text", file.name);
      const result = await captureIdea(undefined, captureData);
      if (result.error || !result.contentId) {
        setImageError(result.error ?? "Couldn't save the idea.");
        return;
      }

      const safeFile = isAsciiSafe(file.name)
        ? file
        : new File([file], asciiSafeFileName(file.name), { type: file.type });
      const uploadData = new FormData();
      uploadData.append("file", safeFile);
      uploadData.append("originalName", file.name);
      const uploadResult = await uploadMedia(result.contentId, undefined, uploadData);
      if (uploadResult.error) {
        setImageError(uploadResult.error);
        return;
      }
      setImageDone(true);
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="size-4 text-primary" />
          Quick capture
        </div>
        <form
          ref={formRef}
          action={async (formData) => {
            await formAction(formData);
            formRef.current?.reset();
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <Input
            name="text"
            placeholder="Type an idea, or paste a link…"
            required
            className="flex-1"
          />
          <div className="flex shrink-0 gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />
            <Button
              type="button"
              variant="outline"
              disabled={imagePending}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach an image"
            >
              <ImagePlus />
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add idea"}
            </Button>
          </div>
        </form>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.contentId && !state.error && (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            Idea added.
          </p>
        )}
        {imageError && <p className="text-sm text-destructive">{imageError}</p>}
        {imageDone && (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            Image added.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

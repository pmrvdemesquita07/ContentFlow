"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteWorkspace } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function DeleteWorkspaceDialog({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const canDelete = confirmText === workspaceName;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmText("");
      }}
    >
      <Button
        size="sm"
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &quot;{workspaceName}&quot;?</DialogTitle>
          <DialogDescription>
            This permanently deletes the workspace and everything in it - every brand, post,
            campaign, task, media file, and creator. This cannot be undone. If you just want to
            hide it for now, archive it instead.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmName">
            Type <span className="font-semibold">{workspaceName}</span> to confirm
          </Label>
          <Input
            id="confirmName"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canDelete || isPending}
            onClick={() =>
              startTransition(async () => {
                await deleteWorkspace(workspaceId);
                setOpen(false);
              })
            }
          >
            {isPending ? "Deleting…" : "Delete workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

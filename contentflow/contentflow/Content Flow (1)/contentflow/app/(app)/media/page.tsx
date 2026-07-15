import { FileIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getMediaForWorkspace } from "@/lib/media";
import { DeleteMediaButton } from "./delete-button";

export default async function MediaPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;

  const media = await getMediaForWorkspace(ctx.workspace.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Media</h1>
        <p className="text-sm text-muted-foreground">
          Every file uploaded to a piece of content, in one library.
        </p>
      </div>

      {media.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No files yet. Attach one from any content item&apos;s Media tab.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {media.map((item) => (
            <div key={item.id} className="flex flex-col gap-1.5">
              <div className="group relative overflow-hidden rounded-md border">
                {item.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary external Storage URL
                  <img src={item.fileUrl} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground">
                    <FileIcon className="size-6" />
                  </div>
                )}
                <DeleteMediaButton id={item.id} />
              </div>
              {item.content && (
                <p className="truncate text-xs text-muted-foreground">{item.content.title}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

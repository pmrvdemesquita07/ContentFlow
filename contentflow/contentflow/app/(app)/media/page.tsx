import Link from "next/link";
import { FileIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getMediaForWorkspace, getSyncedMediaForBrand } from "@/lib/media";
import { DeleteMediaButton } from "./delete-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/lib/generated/prisma/enums";

const FILTERS: { label: string; value: "all" | ContentType }[] = [
  { label: "All", value: "all" },
  { label: "Posts", value: "post" },
  { label: "Reels", value: "reel" },
  { label: "Carousels", value: "carousel" },
  { label: "Videos", value: "video" },
  { label: "Stories", value: "story" },
];

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const activeFilter = FILTERS.some((f) => f.value === type) ? type : "all";
  const syncedMedia = await getSyncedMediaForBrand(
    ctx.brand.id,
    activeFilter === "all" ? undefined : (activeFilter as ContentType)
  );
  const uploadedMedia = await getMediaForWorkspace(ctx.workspace.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Media</h1>
        <p className="text-sm text-muted-foreground">
          Everything your connected accounts have posted, plus files you&apos;ve uploaded.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Synced from social accounts</h2>
          <div className="flex gap-1 border-b">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={f.value === "all" ? "/media" : `/media?type=${f.value}`}
                className={cn(
                  "border-b-2 px-3 py-1.5 text-sm font-medium",
                  activeFilter === f.value
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {syncedMedia.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing synced yet. Connect an account in Social Hub to pull in real posts.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {syncedMedia.map((item) => (
              <a
                key={item.id}
                href={item.externalUrl ?? undefined}
                target={item.externalUrl ? "_blank" : undefined}
                rel={item.externalUrl ? "noreferrer" : undefined}
                className="group flex flex-col gap-1.5"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-md border">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="size-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                      <FileIcon className="size-6" />
                    </div>
                  )}
                  <Badge variant="secondary" className="absolute left-1.5 top-1.5 capitalize">
                    {item.type}
                  </Badge>
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white">
                    {item.interactions.toLocaleString()}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{item.title}</p>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Uploaded files</h2>
        {uploadedMedia.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No files yet. Attach one from any content item&apos;s Media tab.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {uploadedMedia.map((item) => (
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
    </div>
  );
}

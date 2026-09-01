"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

export function CalendarFilters({ creators }: { creators: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const platform = searchParams.get("platform") ?? "all";
  const creatorId = searchParams.get("creatorId") ?? "all";
  const hasActiveFilters = platform !== "all" || creatorId !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={platform} onValueChange={(v) => setParam("platform", v)}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All platforms</SelectItem>
          {(Object.entries(PLATFORM_LABELS) as [SocialPlatform, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={creatorId} onValueChange={(v) => setParam("creatorId", v)}>
        <SelectTrigger className="h-8 w-[160px]">
          <SelectValue placeholder="Creator" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All creators</SelectItem>
          {creators.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("platform");
            params.delete("creatorId");
            const qs = params.toString();
            router.push(qs ? `${pathname}?${qs}` : pathname);
          }}
          className="text-muted-foreground"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

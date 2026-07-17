"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, Megaphone, Users } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { switchBrand } from "@/app/actions/workspace";

type SearchIndex = {
  brands: { id: string; label: string }[];
  campaigns: { id: string; label: string; sublabel?: string }[];
  creators: { id: string; label: string; sublabel?: string }[];
};

export function CommandSearch({ index }: { index: SearchIndex }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const matches = (label: string) => q === "" || label.toLowerCase().includes(q);
    return {
      brands: index.brands.filter((b) => matches(b.label)).slice(0, 6),
      campaigns: index.campaigns.filter((c) => matches(c.label) || matches(c.sublabel ?? "")).slice(0, 6),
      creators: index.creators.filter((c) => matches(c.label) || matches(c.sublabel ?? "")).slice(0, 6),
    };
  }, [index, q]);

  const hasResults = results.brands.length + results.campaigns.length + results.creators.length > 0;

  function goToBrand(brandId: string) {
    startTransition(async () => {
      await switchBrand(brandId);
      router.push("/dashboard");
    });
    handleOpenChange(false);
  }

  function goToCampaign(campaignId: string) {
    router.push(`/campaigns/${campaignId}`);
    handleOpenChange(false);
  }

  function goToCreators() {
    router.push("/creators");
    handleOpenChange(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
      >
        <Search className="size-3.5" />
        Search…
        <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md gap-0 p-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Search brands, campaigns, and creators</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brands, campaigns, creators…"
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {!hasResults ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">No matches.</p>
            ) : (
              <>
                {results.brands.length > 0 && (
                  <div className="mb-1">
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Brands</p>
                    {results.brands.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => goToBrand(b.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                        {b.label}
                      </button>
                    ))}
                  </div>
                )}
                {results.campaigns.length > 0 && (
                  <div className="mb-1">
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Campaigns</p>
                    {results.campaigns.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => goToCampaign(c.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <Megaphone className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{c.label}</span>
                        {c.sublabel && (
                          <span className="text-xs text-muted-foreground">{c.sublabel}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {results.creators.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Creators</p>
                    {results.creators.map((c) => (
                      <button
                        key={c.id}
                        onClick={goToCreators}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <Users className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{c.label}</span>
                        {c.sublabel && (
                          <span className="text-xs text-muted-foreground">{c.sublabel}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

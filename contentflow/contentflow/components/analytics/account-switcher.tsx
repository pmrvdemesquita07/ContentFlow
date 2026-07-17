import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ResolvedRange } from "@/lib/date-range";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

type Account = { platform: SocialPlatform; label: string; username: string | null };

function rangeParams(range: ResolvedRange) {
  if (range.key === "custom") {
    return `range=custom&from=${range.start.toISOString().slice(0, 10)}&to=${range.end
      .toISOString()
      .slice(0, 10)}`;
  }
  return `range=${range.key}`;
}

export function AccountSwitcher({
  accounts,
  current,
  basePath,
  range,
}: {
  accounts: Account[];
  current: SocialPlatform | undefined;
  basePath: string;
  range: ResolvedRange;
}) {
  const base = rangeParams(range);

  return (
    <div className="flex items-center gap-1 rounded-md border p-1">
      <Link
        href={`${basePath}?${base}`}
        className={cn(
          "rounded px-2 py-1 text-xs font-medium",
          !current ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        All accounts
      </Link>
      {accounts.map((account) => (
        <Link
          key={account.platform}
          href={`${basePath}?${base}&account=${account.platform}`}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium",
            current === account.platform
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {account.label}
          {account.username ? ` (@${account.username})` : ""}
        </Link>
      ))}
    </div>
  );
}

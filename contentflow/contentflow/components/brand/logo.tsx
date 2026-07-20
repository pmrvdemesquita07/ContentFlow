import { cn } from "@/lib/utils";

/// The SocialFlow wordmark - a gradient-text treatment, see design.md.
/// Deliberately text-only (no image asset) so it renders crisply at any
/// size without needing a logo file shipped in the repo.
export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClass = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" }[size];

  return (
    <span
      className={cn("font-display font-extrabold tracking-tight text-gradient-brand", sizeClass, className)}
    >
      SocialFlow
    </span>
  );
}

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Excludes static assets and domain-verification files (TikTok/Google/etc.
    // drop .txt/.html/.xml files at the site root, which must stay reachable
    // by their unauthenticated verifier bots, not redirected to /login).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|xml|html|json)$).*)",
  ],
};

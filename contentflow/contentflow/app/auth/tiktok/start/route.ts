import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getConnectedSocialAccountCount } from "@/lib/social";
import { getTikTokAuthUrl } from "@/lib/tiktok";

export async function GET() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (ctx?.workspace.plan === "starter") {
    const otherConnected = await getConnectedSocialAccountCount(ctx.workspace.id, "tiktok");
    if (otherConnected > 0) {
      return NextResponse.redirect(`${siteUrl}/social-hub?error=starter_limit`);
    }
  }

  const state = randomUUID();
  const response = NextResponse.redirect(getTikTokAuthUrl(state));
  response.cookies.set("tt_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}

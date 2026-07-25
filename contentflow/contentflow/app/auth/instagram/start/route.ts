import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getConnectedSocialAccountCount } from "@/lib/social";
import { getInstagramAuthUrl } from "@/lib/instagram";

export async function GET() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (ctx?.workspace.plan === "starter") {
    const otherConnected = await getConnectedSocialAccountCount(ctx.workspace.id, "instagram");
    if (otherConnected > 0) {
      return NextResponse.redirect(`${siteUrl}/social-hub?error=starter_limit`);
    }
  }

  const state = randomUUID();
  const response = NextResponse.redirect(getInstagramAuthUrl(state));
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}

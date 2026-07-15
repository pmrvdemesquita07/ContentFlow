import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { exchangeCodeForToken, exchangeForLongLivedToken } from "@/lib/instagram";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get("ig_oauth_state")?.value;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(`${siteUrl}/social-hub?error=instagram_state`);
  }

  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) {
    return NextResponse.redirect(`${siteUrl}/social-hub?error=no_brand`);
  }

  try {
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    await prisma.socialAccount.upsert({
      where: { brandId_platform: { brandId: ctx.brand.id, platform: "instagram" } },
      update: {
        oauthAccessToken: longLived.access_token,
        status: "connected",
        connectedAt: new Date(),
      },
      create: {
        brandId: ctx.brand.id,
        platform: "instagram",
        oauthAccessToken: longLived.access_token,
        status: "connected",
        connectedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(`${siteUrl}/social-hub?error=instagram_exchange`);
  }

  const response = NextResponse.redirect(`${siteUrl}/social-hub?connected=instagram`);
  response.cookies.delete("ig_oauth_state");
  return response;
}

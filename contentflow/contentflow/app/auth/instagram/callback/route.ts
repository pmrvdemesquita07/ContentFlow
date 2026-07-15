import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getInstagramProfile,
} from "@/lib/instagram";
import { prisma } from "@/lib/db";
import { syncInstagramAccount } from "@/lib/social-sync";

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

  let accountId: string;
  try {
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const profile = await getInstagramProfile(longLived.access_token).catch(() => null);

    const tokenExpiresAt = new Date(Date.now() + longLived.expires_in * 1000);

    const account = await prisma.socialAccount.upsert({
      where: { brandId_platform: { brandId: ctx.brand.id, platform: "instagram" } },
      update: {
        oauthAccessToken: longLived.access_token,
        status: "connected",
        connectedAt: new Date(),
        externalAccountId: profile?.user_id,
        externalUsername: profile?.username,
        tokenExpiresAt,
      },
      create: {
        brandId: ctx.brand.id,
        platform: "instagram",
        oauthAccessToken: longLived.access_token,
        status: "connected",
        connectedAt: new Date(),
        externalAccountId: profile?.user_id,
        externalUsername: profile?.username,
        tokenExpiresAt,
      },
    });
    accountId = account.id;
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(`${siteUrl}/social-hub?error=instagram_exchange`);
  }

  // Best-effort: an initial sync failing shouldn't block a successful connect.
  // The user can always retry from the "Sync now" button on Social Hub.
  try {
    const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (account) await syncInstagramAccount(account);
  } catch (error) {
    console.error("Initial Instagram sync failed:", error);
  }

  const response = NextResponse.redirect(`${siteUrl}/social-hub?connected=instagram`);
  response.cookies.delete("ig_oauth_state");
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { exchangeTikTokCode, getTikTokUserInfo } from "@/lib/tiktok";
import { prisma } from "@/lib/db";
import { syncTikTokAccount } from "@/lib/social-sync";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get("tt_oauth_state")?.value;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (searchParams.get("error")) {
    return NextResponse.redirect(`${siteUrl}/social-hub?error=tiktok_denied`);
  }
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(`${siteUrl}/social-hub?error=tiktok_state`);
  }

  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) {
    return NextResponse.redirect(`${siteUrl}/social-hub?error=no_brand`);
  }

  let accountId: string;
  try {
    const token = await exchangeTikTokCode(code);
    const profile = await getTikTokUserInfo(token.access_token).catch(() => null);

    const tokenExpiresAt = new Date(Date.now() + token.expires_in * 1000);

    const account = await prisma.socialAccount.upsert({
      where: { brandId_platform: { brandId: ctx.brand.id, platform: "tiktok" } },
      update: {
        oauthAccessToken: token.access_token,
        oauthRefreshToken: token.refresh_token,
        status: "connected",
        connectedAt: new Date(),
        externalAccountId: token.open_id,
        externalUsername: profile?.displayName,
        tokenExpiresAt,
        followersCount: profile?.followerCount,
        followingCount: profile?.followingCount,
        mediaCount: profile?.videoCount,
        profilePictureUrl: profile?.avatarUrl,
      },
      create: {
        brandId: ctx.brand.id,
        platform: "tiktok",
        oauthAccessToken: token.access_token,
        oauthRefreshToken: token.refresh_token,
        status: "connected",
        connectedAt: new Date(),
        externalAccountId: token.open_id,
        externalUsername: profile?.displayName,
        tokenExpiresAt,
        followersCount: profile?.followerCount,
        followingCount: profile?.followingCount,
        mediaCount: profile?.videoCount,
        profilePictureUrl: profile?.avatarUrl,
      },
    });
    accountId = account.id;
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(`${siteUrl}/social-hub?error=tiktok_exchange`);
  }

  // Best-effort: an initial sync failing shouldn't block a successful connect.
  try {
    const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
    if (account) await syncTikTokAccount(account);
  } catch (error) {
    console.error("Initial TikTok sync failed:", error);
  }

  const response = NextResponse.redirect(`${siteUrl}/social-hub?connected=tiktok`);
  response.cookies.delete("tt_oauth_state");
  return response;
}

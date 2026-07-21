import { prisma } from "@/lib/db";
import {
  getInstagramMedia,
  getInstagramMediaInsights,
  getInstagramMediaLocation,
  getInstagramMediaCollaborators,
  getInstagramComments,
  getInstagramConversations,
  getInstagramAccountStats,
  getInstagramStories,
  getInstagramStoryInsights,
  getInstagramAudienceDemographics,
  type InstagramMedia,
} from "@/lib/instagram";
import {
  refreshTikTokToken,
  getTikTokUserInfo,
  getTikTokVideos,
} from "@/lib/tiktok";
import { parseMentions } from "@/lib/text-parse";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SocialAccountModel } from "@/lib/generated/prisma/models";
import type { ContentType } from "@/lib/generated/prisma/enums";

const STORAGE_MARKER = "/storage/v1/object/public/media/";

/**
 * Instagram's /stories endpoint only ever returns currently-active (<24h)
 * stories - once one ages out, this sync never sees it again, so its
 * thumbnailUrl can never be refreshed. But Instagram's own CDN URL for that
 * thumbnail is itself signed/time-limited and will eventually 404 on its
 * own, even though our Content/Metric rows are meant to last forever. The
 * fix: while a story is still live (this function only ever runs on live
 * ones), download its thumbnail once and re-host it in our own Storage
 * bucket, so the copy we keep doesn't depend on Instagram continuing to
 * serve it. Falls back to the live Instagram URL if the download fails,
 * which is still strictly better than leaving thumbnailUrl empty.
 */
async function pinStoryThumbnail(sourceUrl: string | null, brandId: string, storyId: string) {
  if (!sourceUrl) return null;
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return sourceUrl;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("video") ? "mp4" : "jpg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    const path = `${brandId}/story-thumbnails/${storyId}.${ext}`;

    const supabase = createAdminClient();
    const { error } = await supabase.storage
      .from("media")
      .upload(path, bytes, { contentType, upsert: true });
    if (error) return sourceUrl;

    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return sourceUrl;
  }
}

function mapInstagramContentType(media: InstagramMedia): ContentType {
  if (media.media_product_type === "REELS") return "reel";
  if (media.media_product_type === "STORY") return "story";
  if (media.media_type === "VIDEO") return "video";
  if (media.media_type === "CAROUSEL_ALBUM") return "carousel";
  return "post";
}

export async function syncInstagramAccount(account: SocialAccountModel) {
  if (!account.oauthAccessToken) return;

  const brand = await prisma.brand.findUnique({
    where: { id: account.brandId },
    select: { workspaceId: true },
  });
  if (!brand) return;

  const owner = await prisma.workspaceMember.findFirst({
    where: { workspaceId: brand.workspaceId },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  if (!owner) return;

  await syncInstagramPosts(account, brand.workspaceId, owner.userId);
  await syncInstagramStories(account, brand.workspaceId, owner.userId);
  await syncInstagramAccountStats(account);
  await syncInstagramAudienceDemographics(account);

  // Runs last and never throws past this point - conversations require a
  // permission (instagram_business_manage_messages) that isn't guaranteed to
  // be granted/approved, and a failure here shouldn't cost the account its
  // stats/demographics sync, which already succeeded above.
  await syncInstagramMessages(account, brand.workspaceId).catch((error) => {
    console.error(`Instagram messages sync failed for account ${account.id}:`, error);
  });

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { lastSyncedAt: new Date() },
  });
}

async function syncInstagramAccountStats(account: SocialAccountModel) {
  const stats = await getInstagramAccountStats(account.oauthAccessToken!).catch(() => null);
  if (!stats) return;

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      followersCount: stats.followersCount,
      followingCount: stats.followingCount,
      mediaCount: stats.mediaCount,
      profilePictureUrl: stats.profilePictureUrl,
    },
  });

  await prisma.accountSnapshot.create({
    data: {
      socialAccountId: account.id,
      followersCount: stats.followersCount,
      followingCount: stats.followingCount,
      mediaCount: stats.mediaCount,
    },
  });
}

async function syncInstagramAudienceDemographics(account: SocialAccountModel) {
  const demographics = await getInstagramAudienceDemographics(account.oauthAccessToken!).catch(
    () => null
  );
  if (!demographics) return;

  // Below the 100-follower threshold Meta just returns empty breakdowns for
  // everything - skip writing a row rather than overwriting real data with blanks.
  const hasAnyData =
    demographics.gender.length > 0 ||
    demographics.age.length > 0 ||
    demographics.country.length > 0 ||
    demographics.city.length > 0;
  if (!hasAnyData) return;

  await prisma.audienceDemographic.upsert({
    where: { socialAccountId: account.id },
    update: {
      genderData: demographics.gender,
      ageData: demographics.age,
      countryData: demographics.country,
      cityData: demographics.city,
      capturedAt: new Date(),
    },
    create: {
      socialAccountId: account.id,
      genderData: demographics.gender,
      ageData: demographics.age,
      countryData: demographics.country,
      cityData: demographics.city,
    },
  });
}

async function syncInstagramPosts(
  account: SocialAccountModel,
  workspaceId: string,
  userId: string
) {
  const media = await getInstagramMedia(account.oauthAccessToken!);

  for (const item of media) {
    const title = item.caption?.slice(0, 120) || "Instagram post";
    // Instagram's CDN links expire after a while, so the thumbnail is
    // refreshed on every sync rather than only set once on first import.
    const thumbnailUrl = item.thumbnail_url ?? item.media_url ?? null;
    const mentions = parseMentions(item.caption);
    const locationName = await getInstagramMediaLocation(item.id, account.oauthAccessToken!).catch(
      () => null
    );
    const collaborators = await getInstagramMediaCollaborators(
      item.id,
      account.oauthAccessToken!
    ).catch(() => []);
    const content = await prisma.content.upsert({
      where: { brandId_externalId: { brandId: account.brandId, externalId: item.id } },
      update: {
        title,
        body: item.caption ?? null,
        externalUrl: item.permalink ?? null,
        thumbnailUrl,
        mentions,
        locationName,
        collaborators,
      },
      create: {
        workspaceId,
        brandId: account.brandId,
        title,
        body: item.caption ?? null,
        type: mapInstagramContentType(item),
        status: "published",
        platforms: ["instagram"],
        publishedAt: new Date(item.timestamp),
        createdBy: userId,
        externalId: item.id,
        externalUrl: item.permalink ?? null,
        thumbnailUrl,
        mentions,
        locationName,
        collaborators,
      },
    });

    const insights = await getInstagramMediaInsights(
      item.id,
      item.media_product_type,
      account.oauthAccessToken!
    ).catch(() => ({ reach: 0, saved: 0, videoViews: 0, impressions: 0 }));

    await prisma.metric.create({
      data: {
        contentId: content.id,
        platform: "instagram",
        likes: item.like_count ?? 0,
        comments: item.comments_count ?? 0,
        shares: 0,
        reach: insights.reach,
        saved: insights.saved,
        videoViews: insights.videoViews,
        impressions: insights.impressions,
      },
    });

    await syncInstagramCommentsForContent(
      content.id,
      item.id,
      workspaceId,
      account.brandId,
      account.oauthAccessToken!
    ).catch((error) => {
      console.error(`Instagram comments sync failed for content ${content.id}:`, error);
    });
  }
}

async function syncInstagramCommentsForContent(
  contentId: string,
  mediaId: string,
  workspaceId: string,
  brandId: string,
  accessToken: string
) {
  const comments = await getInstagramComments(mediaId, accessToken);
  for (const comment of comments) {
    if (!comment.text || !comment.id) continue;
    await prisma.comment.upsert({
      where: { brandId_externalId: { brandId, externalId: comment.id } },
      update: { body: comment.text },
      create: {
        workspaceId,
        brandId,
        contentId,
        platform: "instagram",
        authorUsername: comment.username ?? "Instagram user",
        body: comment.text,
        publishedAt: comment.timestamp ? new Date(comment.timestamp) : new Date(),
        externalId: comment.id,
      },
    });
  }
}

async function syncInstagramStories(
  account: SocialAccountModel,
  workspaceId: string,
  userId: string
) {
  const stories = await getInstagramStories(account.oauthAccessToken!).catch(() => []);

  for (const story of stories) {
    const liveThumbnailUrl = story.thumbnail_url ?? story.media_url ?? null;
    // Stories don't expose caption text via this API (mentions are visual
    // stickers, not text), so only location is available here, not mentions.
    const locationName = await getInstagramMediaLocation(story.id, account.oauthAccessToken!).catch(
      () => null
    );

    const existing = await prisma.content.findUnique({
      where: { brandId_externalId: { brandId: account.brandId, externalId: story.id } },
      select: { thumbnailUrl: true },
    });
    const alreadyPinned = existing?.thumbnailUrl?.includes(STORAGE_MARKER) ?? false;
    const thumbnailUrl = alreadyPinned
      ? existing!.thumbnailUrl
      : await pinStoryThumbnail(liveThumbnailUrl, account.brandId, story.id);

    const content = await prisma.content.upsert({
      where: { brandId_externalId: { brandId: account.brandId, externalId: story.id } },
      update: {
        externalUrl: story.permalink ?? null,
        thumbnailUrl,
        locationName,
      },
      create: {
        workspaceId,
        brandId: account.brandId,
        title: "Instagram story",
        type: "story",
        status: "published",
        platforms: ["instagram"],
        publishedAt: new Date(story.timestamp),
        createdBy: userId,
        externalId: story.id,
        externalUrl: story.permalink ?? null,
        thumbnailUrl,
        locationName,
      },
    });

    // Stories don't support likes/saves in the API - only these navigation/reply metrics.
    const insights = await getInstagramStoryInsights(story.id, account.oauthAccessToken!).catch(
      () => ({ reach: 0, replies: 0, exits: 0, tapsForward: 0 })
    );

    await prisma.metric.create({
      data: {
        contentId: content.id,
        platform: "instagram",
        likes: 0,
        comments: 0,
        shares: 0,
        reach: insights.reach,
        saved: 0,
        videoViews: 0,
        replies: insights.replies,
        exits: insights.exits,
        tapsForward: insights.tapsForward,
      },
    });
  }
}

async function syncInstagramMessages(account: SocialAccountModel, workspaceId: string) {
  const conversations = await getInstagramConversations(account.oauthAccessToken!);

  for (const conversation of conversations) {
    for (const message of conversation.messages?.data ?? []) {
      if (!message.message) continue;
      await prisma.message.upsert({
        where: { brandId_externalId: { brandId: account.brandId, externalId: message.id } },
        update: {},
        create: {
          workspaceId,
          brandId: account.brandId,
          platform: "instagram",
          sender: message.from?.username ?? message.from?.id ?? "Instagram user",
          body: message.message,
          receivedAt: message.created_time ? new Date(message.created_time) : new Date(),
          externalId: message.id,
        },
      });
    }
  }
}

/**
 * TikTok access tokens last ~24h (far shorter than Instagram's 60-day
 * tokens), so every sync has to be ready to refresh first - reusing an
 * expired token would just fail the whole sync instead of self-healing.
 */
async function ensureFreshTikTokToken(account: SocialAccountModel): Promise<string> {
  const expiresSoon = !account.tokenExpiresAt || account.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000;
  if (!expiresSoon) return account.oauthAccessToken!;

  if (!account.oauthRefreshToken) {
    throw new Error(`TikTok account ${account.id} has no refresh token - reconnect required.`);
  }
  const refreshed = await refreshTikTokToken(account.oauthRefreshToken);
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      oauthAccessToken: refreshed.access_token,
      oauthRefreshToken: refreshed.refresh_token,
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });
  return refreshed.access_token;
}

function tikTokMentions(video: { video_description?: string }) {
  return parseMentions(video.video_description);
}

export async function syncTikTokAccount(account: SocialAccountModel) {
  if (!account.oauthAccessToken) return;

  const brand = await prisma.brand.findUnique({
    where: { id: account.brandId },
    select: { workspaceId: true },
  });
  if (!brand) return;

  const owner = await prisma.workspaceMember.findFirst({
    where: { workspaceId: brand.workspaceId },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  if (!owner) return;

  const accessToken = await ensureFreshTikTokToken(account);

  await syncTikTokProfile(account, accessToken);
  await syncTikTokVideos(account, accessToken, brand.workspaceId, owner.userId);

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { lastSyncedAt: new Date() },
  });
}

async function syncTikTokProfile(account: SocialAccountModel, accessToken: string) {
  const profile = await getTikTokUserInfo(accessToken).catch(() => null);
  if (!profile) return;

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      followersCount: profile.followerCount,
      followingCount: profile.followingCount,
      mediaCount: profile.videoCount,
      profilePictureUrl: profile.avatarUrl,
      externalUsername: profile.displayName,
    },
  });

  await prisma.accountSnapshot.create({
    data: {
      socialAccountId: account.id,
      followersCount: profile.followerCount,
      followingCount: profile.followingCount,
      mediaCount: profile.videoCount,
    },
  });
}

async function syncTikTokVideos(
  account: SocialAccountModel,
  accessToken: string,
  workspaceId: string,
  userId: string
) {
  const videos = await getTikTokVideos(accessToken);

  for (const video of videos) {
    const title = video.title?.slice(0, 120) || video.video_description?.slice(0, 120) || "TikTok video";

    const content = await prisma.content.upsert({
      where: { brandId_externalId: { brandId: account.brandId, externalId: video.id } },
      update: {
        title,
        body: video.video_description ?? null,
        externalUrl: video.share_url ?? null,
        thumbnailUrl: video.cover_image_url ?? null,
        mentions: tikTokMentions(video),
      },
      create: {
        workspaceId,
        brandId: account.brandId,
        title,
        body: video.video_description ?? null,
        type: "video",
        status: "published",
        platforms: ["tiktok"],
        publishedAt: new Date(video.create_time * 1000),
        createdBy: userId,
        externalId: video.id,
        externalUrl: video.share_url ?? null,
        thumbnailUrl: video.cover_image_url ?? null,
        mentions: tikTokMentions(video),
      },
    });

    await prisma.metric.create({
      data: {
        contentId: content.id,
        platform: "tiktok",
        likes: video.like_count ?? 0,
        comments: video.comment_count ?? 0,
        shares: video.share_count ?? 0,
        reach: 0,
        saved: 0,
        videoViews: video.view_count ?? 0,
      },
    });
  }
}

export async function syncSocialAccountById(id: string) {
  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account || account.status !== "connected") return;

  if (account.platform === "instagram") {
    await syncInstagramAccount(account);
  } else if (account.platform === "tiktok") {
    await syncTikTokAccount(account);
  }
}

export async function syncAllConnectedAccounts() {
  const accounts = await prisma.socialAccount.findMany({ where: { status: "connected" } });
  for (const account of accounts) {
    try {
      if (account.platform === "instagram") {
        await syncInstagramAccount(account);
      } else if (account.platform === "tiktok") {
        await syncTikTokAccount(account);
      }
    } catch (error) {
      console.error(`Sync failed for social account ${account.id}:`, error);
    }
  }
}

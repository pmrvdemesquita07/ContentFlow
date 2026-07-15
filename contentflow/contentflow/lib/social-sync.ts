import { prisma } from "@/lib/db";
import {
  getInstagramMedia,
  getInstagramMediaInsights,
  getInstagramConversations,
  getInstagramAccountStats,
  getInstagramStories,
  getInstagramStoryInsights,
  getInstagramAudienceDemographics,
  type InstagramMedia,
} from "@/lib/instagram";
import type { SocialAccountModel } from "@/lib/generated/prisma/models";
import type { ContentType } from "@/lib/generated/prisma/enums";

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
  await syncInstagramMessages(account, brand.workspaceId);
  await syncInstagramAccountStats(account);
  await syncInstagramAudienceDemographics(account);

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
    const content = await prisma.content.upsert({
      where: { brandId_externalId: { brandId: account.brandId, externalId: item.id } },
      update: {
        title,
        body: item.caption ?? null,
        externalUrl: item.permalink ?? null,
        thumbnailUrl,
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
  }
}

async function syncInstagramStories(
  account: SocialAccountModel,
  workspaceId: string,
  userId: string
) {
  const stories = await getInstagramStories(account.oauthAccessToken!).catch(() => []);

  for (const story of stories) {
    const thumbnailUrl = story.thumbnail_url ?? story.media_url ?? null;
    const content = await prisma.content.upsert({
      where: { brandId_externalId: { brandId: account.brandId, externalId: story.id } },
      update: {
        externalUrl: story.permalink ?? null,
        thumbnailUrl,
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

export async function syncSocialAccountById(id: string) {
  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account || account.status !== "connected") return;

  if (account.platform === "instagram") {
    await syncInstagramAccount(account);
  }
}

export async function syncAllConnectedAccounts() {
  const accounts = await prisma.socialAccount.findMany({ where: { status: "connected" } });
  for (const account of accounts) {
    try {
      if (account.platform === "instagram") {
        await syncInstagramAccount(account);
      }
    } catch (error) {
      console.error(`Sync failed for social account ${account.id}:`, error);
    }
  }
}

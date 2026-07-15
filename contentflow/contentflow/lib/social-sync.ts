import { prisma } from "@/lib/db";
import {
  getInstagramMedia,
  getInstagramMediaInsights,
  getInstagramConversations,
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
  await syncInstagramMessages(account, brand.workspaceId);

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { lastSyncedAt: new Date() },
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
    ).catch(() => ({ reach: 0, saved: 0, videoViews: 0 }));

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

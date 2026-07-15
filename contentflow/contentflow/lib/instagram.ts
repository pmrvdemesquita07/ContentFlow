const IG_AUTH_URL = "https://www.instagram.com/oauth/authorize";
const IG_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const IG_GRAPH_URL = "https://graph.instagram.com";

// Scopes for the standalone "Instagram API with Instagram Login" (no
// Facebook Page required) - double check these against whatever your Meta
// App dashboard actually offers, Meta renames/adds scopes over time.
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_manage_insights",
].join(",");

function redirectUri() {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/auth/instagram/callback`;
}

export function getInstagramAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${IG_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  const form = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
    code,
  });
  const res = await fetch(IG_TOKEN_URL, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Instagram token exchange failed: ${await res.text()}`);
  }
  return res.json() as Promise<{ access_token: string; user_id: string }>;
}

export async function exchangeForLongLivedToken(shortLivedToken: string) {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    access_token: shortLivedToken,
  });
  const res = await fetch(`${IG_GRAPH_URL}/access_token?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Instagram long-lived token exchange failed: ${await res.text()}`);
  }
  return res.json() as Promise<{ access_token: string; token_type: string; expires_in: number }>;
}

export async function getInstagramProfile(accessToken: string) {
  const params = new URLSearchParams({ fields: "user_id,username", access_token: accessToken });
  const res = await fetch(`${IG_GRAPH_URL}/me?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Instagram profile fetch failed: ${await res.text()}`);
  }
  return res.json() as Promise<{ user_id: string; username: string }>;
}

export type InstagramAccountStats = {
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  profilePictureUrl: string | null;
};

export async function getInstagramAccountStats(
  accessToken: string
): Promise<InstagramAccountStats> {
  const params = new URLSearchParams({
    fields: "followers_count,follows_count,media_count,profile_picture_url",
    access_token: accessToken,
  });
  const res = await fetch(`${IG_GRAPH_URL}/me?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Instagram account stats fetch failed: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
    profile_picture_url?: string;
  };
  return {
    followersCount: json.followers_count ?? 0,
    followingCount: json.follows_count ?? 0,
    mediaCount: json.media_count ?? 0,
    profilePictureUrl: json.profile_picture_url ?? null,
  };
}

export type InstagramMedia = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_product_type?: "FEED" | "REELS" | "STORY";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

export async function getInstagramMedia(accessToken: string) {
  const params = new URLSearchParams({
    fields:
      "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
    limit: "50",
    access_token: accessToken,
  });
  const res = await fetch(`${IG_GRAPH_URL}/me/media?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Instagram media fetch failed: ${await res.text()}`);
  }
  const json = (await res.json()) as { data: InstagramMedia[] };
  return json.data;
}

/**
 * Instagram only exposes currently-active stories (posted in the last 24h) -
 * there is no API for historical stories. Once synced here, the record
 * persists in our own database even after Instagram's copy expires, so
 * syncing regularly is what builds up a story archive over time.
 */
export type InstagramStory = {
  id: string;
  media_type: "IMAGE" | "VIDEO";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
};

export async function getInstagramStories(accessToken: string) {
  const params = new URLSearchParams({
    fields: "id,media_type,media_url,thumbnail_url,permalink,timestamp",
    access_token: accessToken,
  });
  const res = await fetch(`${IG_GRAPH_URL}/me/stories?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Instagram stories fetch failed: ${await res.text()}`);
  }
  const json = (await res.json()) as { data: InstagramStory[] };
  return json.data;
}

export type InstagramStoryInsights = {
  reach: number;
  replies: number;
  exits: number;
  tapsForward: number;
};

/** Stories don't support likes/comments/saves in the API - only these navigation/reply metrics. */
export async function getInstagramStoryInsights(
  storyId: string,
  accessToken: string
): Promise<InstagramStoryInsights> {
  const params = new URLSearchParams({
    metric: "reach,replies,exits,taps_forward",
    access_token: accessToken,
  });
  const res = await fetch(`${IG_GRAPH_URL}/${storyId}/insights?${params.toString()}`);
  const empty = { reach: 0, replies: 0, exits: 0, tapsForward: 0 };
  if (!res.ok) return empty;
  const json = (await res.json()) as { data?: { name: string; values: { value: number }[] }[] };
  const valueFor = (name: string) =>
    json.data?.find((m) => m.name === name)?.values?.[0]?.value ?? 0;
  return {
    reach: valueFor("reach"),
    replies: valueFor("replies"),
    exits: valueFor("exits"),
    tapsForward: valueFor("taps_forward"),
  };
}

export type InstagramMediaInsights = {
  reach: number;
  saved: number;
  videoViews: number;
  impressions: number;
};

/**
 * Best-effort: not every media type/permission combo supports insights, and
 * the valid metric set differs by media_product_type, so request only what
 * that type supports and default anything missing to 0 rather than failing.
 * (Meta has deprecated "impressions" for some API versions/media types -
 * when that happens it just comes back as 0 rather than breaking the sync.)
 */
export async function getInstagramMediaInsights(
  mediaId: string,
  mediaProductType: string | undefined,
  accessToken: string
): Promise<InstagramMediaInsights> {
  const metrics =
    mediaProductType === "REELS" ? "reach,saved,plays,impressions" : "reach,saved,impressions";
  const params = new URLSearchParams({ metric: metrics, access_token: accessToken });
  const res = await fetch(`${IG_GRAPH_URL}/${mediaId}/insights?${params.toString()}`);
  const empty = { reach: 0, saved: 0, videoViews: 0, impressions: 0 };
  if (!res.ok) return empty;
  const json = (await res.json()) as { data?: { name: string; values: { value: number }[] }[] };
  const valueFor = (name: string) =>
    json.data?.find((m) => m.name === name)?.values?.[0]?.value ?? 0;
  return {
    reach: valueFor("reach"),
    saved: valueFor("saved"),
    videoViews: valueFor("plays"),
    impressions: valueFor("impressions"),
  };
}

export type InstagramMessage = {
  id: string;
  from?: { username?: string; id?: string };
  message?: string;
  created_time?: string;
};

export type InstagramConversation = {
  id: string;
  messages?: { data: InstagramMessage[] };
};

export async function getInstagramConversations(accessToken: string) {
  const params = new URLSearchParams({
    platform: "instagram",
    fields: "messages.limit(20){id,from,message,created_time}",
    access_token: accessToken,
  });
  const res = await fetch(`${IG_GRAPH_URL}/me/conversations?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Instagram conversations fetch failed: ${await res.text()}`);
  }
  const json = (await res.json()) as { data: InstagramConversation[] };
  return json.data;
}

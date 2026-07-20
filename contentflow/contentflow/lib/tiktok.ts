const TT_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TT_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TT_API_URL = "https://open.tiktokapis.com/v2";

// Available even before app review, as long as the connecting account is
// added as a "Target User" in the TikTok Developer dashboard - broader
// access (any public user) requires TikTok's app review process.
const SCOPES = ["user.info.basic", "user.info.profile", "user.info.stats", "video.list"].join(",");

function redirectUri() {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/auth/tiktok/callback`;
}

export function getTikTokAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${TT_AUTH_URL}?${params.toString()}`;
}

export type TikTokTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
};

async function requestToken(body: URLSearchParams): Promise<TikTokTokenResponse> {
  const res = await fetch(TT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body,
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`TikTok token request failed: ${JSON.stringify(json)}`);
  }
  return json as TikTokTokenResponse;
}

export function exchangeTikTokCode(code: string) {
  return requestToken(
    new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
    })
  );
}

export function refreshTikTokToken(refreshToken: string) {
  return requestToken(
    new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  );
}

export type TikTokUserInfo = {
  openId: string;
  displayName: string;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
};

export async function getTikTokUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const fields = "open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count";
  const res = await fetch(`${TT_API_URL}/user/info/?fields=${fields}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok || json.error?.code !== "ok") {
    throw new Error(`TikTok user info fetch failed: ${JSON.stringify(json)}`);
  }
  const u = json.data.user;
  return {
    openId: u.open_id,
    displayName: u.display_name,
    avatarUrl: u.avatar_url ?? null,
    followerCount: u.follower_count ?? 0,
    followingCount: u.following_count ?? 0,
    likesCount: u.likes_count ?? 0,
    videoCount: u.video_count ?? 0,
  };
}

export type TikTokVideo = {
  id: string;
  title?: string;
  video_description?: string;
  duration?: number;
  cover_image_url?: string;
  share_url?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  create_time: number;
};

/** Real per-video counts only - the public API doesn't expose comment text or a reply endpoint. */
export async function getTikTokVideos(accessToken: string): Promise<TikTokVideo[]> {
  const fields = [
    "id",
    "title",
    "video_description",
    "duration",
    "cover_image_url",
    "share_url",
    "view_count",
    "like_count",
    "comment_count",
    "share_count",
    "create_time",
  ].join(",");

  const videos: TikTokVideo[] = [];
  let cursor: number | undefined;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`${TT_API_URL}/video/list/?fields=${fields}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
    });
    const json = await res.json();
    if (!res.ok || json.error?.code !== "ok") {
      throw new Error(`TikTok video list fetch failed: ${JSON.stringify(json)}`);
    }
    videos.push(...(json.data.videos ?? []));
    hasMore = Boolean(json.data.has_more) && videos.length < 200;
    cursor = json.data.cursor;
  }

  return videos;
}

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
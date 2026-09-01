const URL_PATTERN = /^https?:\/\/\S+$/i;

export function isUrl(text: string): boolean {
  return URL_PATTERN.test(text.trim());
}

export type LinkPreview = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
};

function metaContent(html: string, ...keys: string[]): string | null {
  for (const key of keys) {
    const match = html.match(
      new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i")
    ) ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, "i"));
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

/**
 * A basic Open Graph scrape for the Ideas Bank's "paste a link" capture -
 * no headless browser, no scraping library, just the meta tags a page
 * already ships for link unfurling everywhere else (Slack, X, etc.).
 * Returns null on any failure - a missing preview isn't worth blocking the
 * idea capture over, the raw URL is saved either way.
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SocialFlowBot/1.0)" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const html = await res.text();
    const title = metaContent(html, "og:title", "twitter:title") ?? titleTag(html);
    const description = metaContent(html, "og:description", "twitter:description", "description");
    const imageUrl = metaContent(html, "og:image", "twitter:image");

    if (!title && !description && !imageUrl) return null;
    return { title, description, imageUrl };
  } catch {
    return null;
  }
}

function titleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

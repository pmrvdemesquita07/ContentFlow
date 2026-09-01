"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { anthropic, AI_MODEL } from "@/lib/ai/client";
import { buildBrandContext, brandContextToPromptSection } from "@/lib/ai/buildBrandContext";
import { checkAiUsage, incrementAiUsage } from "@/lib/ai/usage";
import { logAssistantCall } from "@/lib/ai/log";
import { canAccessAiReply, canAccessAiBriefing } from "@/lib/ai/access";
import { getInternalTrends } from "@/lib/trends-internal";
import { resolveDateRange } from "@/lib/date-range";
import { getThreadForMatch } from "@/lib/threads";
import { getSocialAccountsForBrand } from "@/lib/social";
import { getAnalyticsData } from "@/lib/analytics";
import type { ContentType, SocialPlatform } from "@/lib/generated/prisma/enums";

export type CaptionSuggestion = { text: string; label: string };

function usageLimitError(limit: number) {
  return `You've reached this month's AI assistant limit (${limit}). It resets on the 1st.`;
}

export async function suggestCaptions(
  _prevState: { error?: string; suggestions?: CaptionSuggestion[] } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return { error: "Finish onboarding first." };

  const topic = String(formData.get("topic") ?? "").trim();
  if (!topic) return { error: "Describe the topic of the post first." };
  const contentType = String(formData.get("contentType") ?? "post").trim();
  const hashtags = String(formData.get("hashtags") ?? "").trim();
  const campaignId = String(formData.get("campaignId") ?? "").trim() || null;
  const platforms = formData.getAll("platforms").map((p) => String(p)).filter(Boolean);

  const usage = await checkAiUsage(ctx.workspace.id, ctx.workspace.plan);
  if (!usage.allowed) return { error: usageLimitError(usage.limit) };

  const [brandContext, trends, campaign] = await Promise.all([
    buildBrandContext(ctx.brand.id),
    getInternalTrends(ctx.brand.id, resolveDateRange({})),
    campaignId
      ? prisma.campaign.findFirst({
          where: { id: campaignId, brandId: ctx.brand.id },
          select: { name: true, description: true },
        })
      : null,
  ]);

  const topTrends = [...trends.byHashtag, ...trends.byFormat]
    .sort((a, b) => (b.growthPercent ?? -Infinity) - (a.growthPercent ?? -Infinity))
    .slice(0, 3)
    .map((t) => {
      const growth =
        t.growthPercent === null
          ? "new"
          : `${t.growthPercent > 0 ? "+" : ""}${Math.round(t.growthPercent)}%`;
      return `${t.key} (${growth})`;
    });

  const systemParts = [
    "You are a copywriter who writes social media captions and hooks in European Portuguese (Portugal).",
  ];
  const brandSection = brandContextToPromptSection(brandContext);
  if (brandSection) systemParts.push(brandSection);
  if (topTrends.length > 0) {
    systemParts.push(`Relevant internal trends for this brand right now: ${topTrends.join(", ")}`);
  }
  if (campaign) {
    systemParts.push(
      `This post is part of the campaign "${campaign.name}"${campaign.description ? `: ${campaign.description}` : ""}. Keep the caption consistent with that campaign's angle.`
    );
  }
  if (platforms.length > 0) {
    systemParts.push(
      `Target platform(s): ${platforms.join(", ")}. Match each platform's usual caption length and tone (e.g. TikTok/Reels casual and short, LinkedIn more professional, X terse).`
    );
  }
  systemParts.push(
    "Given the post topic and format provided by the user, suggest exactly 3 different captions or hooks, each at most 2 sentences, each with a short label naming the approach (e.g. \"Question hook\", \"Contradiction hook\", \"Direct storytelling\")."
  );

  let suggestions: CaptionSuggestion[];
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemParts.join("\n\n"),
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: { text: { type: "string" }, label: { type: "string" } },
                  required: ["text", "label"],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: `Post format: ${contentType}\nTopic: ${topic}${hashtags ? `\nHashtags already chosen: ${hashtags}` : ""}`,
        },
      ],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("no text block");
    const parsed = JSON.parse(textBlock.text) as { suggestions: CaptionSuggestion[] };
    suggestions = parsed.suggestions.slice(0, 3);
  } catch (err) {
    console.error("suggestCaptions failed", err);
    return { error: "Couldn't generate suggestions right now. Please try again." };
  }

  await incrementAiUsage(ctx.workspace.id);
  await logAssistantCall(
    ctx.workspace.id,
    "captions",
    JSON.stringify({ contentType, topic, hashtags, campaign: campaign?.name ?? null, platforms }),
    JSON.stringify(suggestions)
  );

  return { error: undefined, suggestions };
}

const MAX_THREAD_CONTEXT_MESSAGES = 10;

export async function suggestReply(
  matchId: string
): Promise<{ error?: string; suggestion?: string }> {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return { error: "Finish onboarding first." };
  if (!canAccessAiReply(ctx.workspace.plan)) {
    return { error: "The reply-suggestion assistant is available on the Studio plan." };
  }

  const usage = await checkAiUsage(ctx.workspace.id, ctx.workspace.plan);
  if (!usage.allowed) return { error: usageLimitError(usage.limit) };

  const threadData = await getThreadForMatch(matchId, ctx.workspace.id);
  if (!threadData) return { error: "Conversation not found." };
  const { match, isAgencySide } = threadData;
  if (!match.thread) return { error: "Conversation not found." };

  const counterpartyName = isAgencySide ? match.creatorWorkspace.name : match.opportunity.workspace.name;
  const recentMessages = match.thread.messages.slice(-MAX_THREAD_CONTEXT_MESSAGES);
  if (recentMessages.length === 0) return { error: "There's nothing to reply to yet." };

  const transcript = recentMessages
    .map((m) => `${m.senderId === user.id ? "You" : counterpartyName}: ${m.body}`)
    .join("\n");

  const brandContext = await buildBrandContext(ctx.brand.id);
  const systemParts = [
    "You are drafting a reply to a business conversation on behalf of the user, in European Portuguese (Portugal).",
  ];
  const brandSection = brandContextToPromptSection(brandContext);
  if (brandSection) systemParts.push(brandSection);
  systemParts.push(
    "Given the recent conversation history below, suggest exactly one reply for the user to send next. Reply with just the message text, no preamble, no quotes."
  );

  let suggestion: string;
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: systemParts.join("\n\n"),
      output_config: { effort: "low" },
      messages: [{ role: "user", content: `Conversation so far:\n${transcript}` }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("no text block");
    suggestion = textBlock.text.trim();
  } catch (err) {
    console.error("suggestReply failed", err);
    return { error: "Couldn't generate a suggestion right now. Please try again." };
  }

  await incrementAiUsage(ctx.workspace.id);
  await logAssistantCall(ctx.workspace.id, "comment_reply", transcript, suggestion);

  return { error: undefined, suggestion };
}

export async function suggestBriefingDraft(
  _prevState: { error?: string; draft?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return { error: "Finish onboarding first." };
  if (!canAccessAiBriefing(ctx.workspace.plan)) {
    return { error: "The briefing assistant is available on the Studio plan." };
  }

  const objective = String(formData.get("objective") ?? "").trim();
  if (!objective) return { error: "Describe the objective first." };
  const tone = String(formData.get("tone") ?? "").trim();
  const budget = String(formData.get("budget") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();

  const usage = await checkAiUsage(ctx.workspace.id, ctx.workspace.plan);
  if (!usage.allowed) return { error: usageLimitError(usage.limit) };

  const brandContext = await buildBrandContext(ctx.brand.id);
  const systemParts = [
    "You are writing a clear, direct brief description for a brand's marketing campaign or creator opportunity, in European Portuguese (Portugal). No empty marketing jargon.",
  ];
  const brandSection = brandContextToPromptSection(brandContext);
  if (brandSection) systemParts.push(brandSection);
  systemParts.push(
    "Given the objective, approximate budget, deadline, and desired tone provided by the user, write a description of 3 to 5 sentences. Reply with just the description text, no preamble, no quotes."
  );

  const inputSummary = [
    `Objective: ${objective}`,
    budget && `Approximate budget: ${budget}`,
    deadline && `Deadline: ${deadline}`,
    tone && `Desired tone: ${tone}`,
  ]
    .filter(Boolean)
    .join("\n");

  let draft: string;
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: systemParts.join("\n\n"),
      output_config: { effort: "low" },
      messages: [{ role: "user", content: inputSummary }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("no text block");
    draft = textBlock.text.trim();
  } catch (err) {
    console.error("suggestBriefingDraft failed", err);
    return { error: "Couldn't generate a draft right now. Please try again." };
  }

  await incrementAiUsage(ctx.workspace.id);
  await logAssistantCall(ctx.workspace.id, "briefing", inputSummary, draft);

  return { error: undefined, draft };
}

const CONTENT_TYPES: ContentType[] = ["post", "story", "reel", "video", "carousel"];
const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "x", "youtube", "linkedin"];

export type QuickScheduleResult = {
  error?: string;
  created?: { title: string; type: ContentType; scheduledAt: string };
};

/**
 * Turns a free-text note ("Reel sobre café gelado amanhã às 18h") straight
 * into a scheduled Content row on the Calendar - no form fields to fill in.
 * The model resolves relative dates against the server's current time and
 * flags back (via needsClarification) when it can't find a date at all,
 * rather than guessing one.
 */
export async function quickScheduleContent(
  _prevState: QuickScheduleResult | undefined,
  formData: FormData
): Promise<QuickScheduleResult> {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return { error: "Finish onboarding first." };

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Write what you want to schedule first." };

  const usage = await checkAiUsage(ctx.workspace.id, ctx.workspace.plan);
  if (!usage.allowed) return { error: usageLimitError(usage.limit) };

  const now = new Date();
  const systemParts = [
    "You turn a short, informal note about a piece of content into structured calendar data, in European Portuguese context.",
    `The current date and time is ${now.toISOString()} (UTC). Resolve relative dates and times in the note ("amanhã", "sexta-feira", "às 18h", "daqui a 2 dias") against this.`,
    "Extract: title (a short, clean title for the post - strip out the date/time phrases, keep the substance of what to post about), contentType (post, story, reel, video, or carousel - default \"post\" if unclear), platforms (an array from instagram, tiktok, x, youtube, linkedin - only ones explicitly mentioned, empty array if none), scheduledAt (an ISO 8601 datetime resolved from the note - empty string if the note truly gives no day or time at all), needsClarification (empty string when scheduledAt was resolved; otherwise a short, friendly European Portuguese question asking for a day/time).",
  ];

  let parsed: {
    title: string;
    contentType: string;
    platforms: string[];
    scheduledAt: string;
    needsClarification: string;
  };
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: systemParts.join("\n\n"),
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              contentType: { type: "string" },
              platforms: { type: "array", items: { type: "string" } },
              scheduledAt: { type: "string" },
              needsClarification: { type: "string" },
            },
            required: ["title", "contentType", "platforms", "scheduledAt", "needsClarification"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: text }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("no text block");
    parsed = JSON.parse(textBlock.text);
  } catch (err) {
    console.error("quickScheduleContent failed", err);
    return { error: "Couldn't understand that right now. Please try again." };
  }

  const scheduledAt = parsed.scheduledAt ? new Date(parsed.scheduledAt) : null;
  if (parsed.needsClarification || !scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return {
      error:
        parsed.needsClarification ||
        "Não percebi a data. Escreve, por exemplo: \"amanhã às 18h\" ou \"sexta-feira de manhã\".",
    };
  }

  const type = CONTENT_TYPES.includes(parsed.contentType as ContentType)
    ? (parsed.contentType as ContentType)
    : "post";
  const platforms = parsed.platforms.filter((p): p is SocialPlatform =>
    PLATFORMS.includes(p as SocialPlatform)
  );

  await prisma.content.create({
    data: {
      workspaceId: ctx.workspace.id,
      brandId: ctx.brand.id,
      createdBy: user.id,
      title: parsed.title || text,
      type,
      status: "scheduled",
      platforms,
      scheduledAt,
    },
  });

  await incrementAiUsage(ctx.workspace.id);
  await logAssistantCall(ctx.workspace.id, "quick_schedule", text, JSON.stringify(parsed));

  ["/ideas", "/posts", "/calendar"].forEach((path) => revalidatePath(path));

  return { error: undefined, created: { title: parsed.title || text, type, scheduledAt: scheduledAt.toISOString() } };
}

/**
 * A short pitch/bio blurb built from the brand's own real, already-synced
 * numbers (followers, engagement rate, best-performing format) plus its
 * voice - never invented figures. Purely a suggestion: it's shown for the
 * user to copy wherever they need it (a proposal, an email, their Discover
 * bio) rather than written straight into any field, since discoveryBio is
 * specifically the creator-marketplace profile and Media Kit works for
 * every workspace type.
 */
export async function suggestMediaKitPitch(): Promise<{ error?: string; pitch?: string }> {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return { error: "Finish onboarding first." };

  const usage = await checkAiUsage(ctx.workspace.id, ctx.workspace.plan);
  if (!usage.allowed) return { error: usageLimitError(usage.limit) };

  const [accounts, analytics, brandContext] = await Promise.all([
    getSocialAccountsForBrand(ctx.brand.id),
    getAnalyticsData(ctx.brand.id, resolveDateRange({ range: "90d" })),
    buildBrandContext(ctx.brand.id),
  ]);
  const connected = accounts.filter((a) => a.status === "connected");
  if (connected.length === 0) return { error: "Connect a social account first." };

  const totalFollowers = connected.reduce((sum, a) => sum + (a.followersCount ?? 0), 0);
  const byFormat = new Map<string, { total: number; count: number }>();
  for (const p of analytics.perPost) {
    const row = byFormat.get(p.type) ?? { total: 0, count: 0 };
    row.total += p.interactions;
    row.count += 1;
    byFormat.set(p.type, row);
  }
  const bestFormat = [...byFormat.entries()].sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)[0];

  const facts = [
    `Brand: ${ctx.brand.name}`,
    `Total followers across connected accounts: ${totalFollowers.toLocaleString()}`,
    `Engagement rate (last 90 days): ${analytics.engagementRates.byFollowers?.toFixed(1) ?? "unknown"}%`,
    `Platforms: ${connected.map((a) => a.platform).join(", ")}`,
    bestFormat && `Best-performing format: ${bestFormat[0]}`,
  ]
    .filter(Boolean)
    .join("\n");

  const systemParts = [
    "You write a short media-kit pitch (2-3 sentences) for a brand to send to potential partners, in European Portuguese (Portugal). Use only the real numbers given below - never invent a figure. Confident, direct, no empty marketing jargon.",
  ];
  const brandSection = brandContextToPromptSection(brandContext);
  if (brandSection) systemParts.push(brandSection);

  let pitch: string;
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: systemParts.join("\n\n"),
      output_config: { effort: "low" },
      messages: [{ role: "user", content: facts }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("no text block");
    pitch = textBlock.text.trim();
  } catch (err) {
    console.error("suggestMediaKitPitch failed", err);
    return { error: "Couldn't generate a pitch right now. Please try again." };
  }

  await incrementAiUsage(ctx.workspace.id);
  await logAssistantCall(ctx.workspace.id, "media_kit_pitch", facts, pitch);

  return { error: undefined, pitch };
}

export type PricingSuggestion = { min: number; max: number; currency: string; reasoning: string };

/**
 * A starting price range for a new contract with this creator, grounded in
 * their own past Contract.amount history in this workspace when there is
 * any - the model is told explicitly when there's none, so it doesn't
 * quietly pretend to know more than it does.
 */
export async function suggestPricingSuggestion(
  creatorId: string
): Promise<{ error?: string; suggestion?: PricingSuggestion }> {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return { error: "Finish onboarding first." };

  const usage = await checkAiUsage(ctx.workspace.id, ctx.workspace.plan);
  if (!usage.allowed) return { error: usageLimitError(usage.limit) };

  const creator = await prisma.creator.findFirst({
    where: { id: creatorId, workspaceId: ctx.workspace.id },
    select: { name: true },
  });
  if (!creator) return { error: "Creator not found." };

  const pastContracts = await prisma.contract.findMany({
    where: { creatorId, workspaceId: ctx.workspace.id },
    select: { title: true, amount: true, currency: true, status: true, startDate: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const history =
    pastContracts.length === 0
      ? "No past contracts with this creator in this workspace."
      : pastContracts
          .map((c) => `- "${c.title}": ${c.amount} ${c.currency} (${c.status})`)
          .join("\n");

  const systemParts = [
    "You suggest a fair starting price range (in EUR) for a new content-creator partnership contract, based only on the creator's own past contract history given below. If there is no history, say so explicitly in the reasoning and give a cautious, general estimate instead of pretending to have data.",
  ];

  let suggestion: PricingSuggestion;
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      system: systemParts.join("\n\n"),
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              min: { type: "number" },
              max: { type: "number" },
              reasoning: { type: "string" },
            },
            required: ["min", "max", "reasoning"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: `Creator: ${creator.name}\n\nPast contracts:\n${history}` }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("no text block");
    const parsed = JSON.parse(textBlock.text) as { min: number; max: number; reasoning: string };
    suggestion = { min: parsed.min, max: parsed.max, currency: "EUR", reasoning: parsed.reasoning };
  } catch (err) {
    console.error("suggestPricingSuggestion failed", err);
    return { error: "Couldn't generate a suggestion right now. Please try again." };
  }

  await incrementAiUsage(ctx.workspace.id);
  await logAssistantCall(ctx.workspace.id, "pricing_suggestion", history, JSON.stringify(suggestion));

  return { error: undefined, suggestion };
}

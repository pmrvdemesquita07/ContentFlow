import { prisma } from "@/lib/db";

export type BrandContext = {
  tone: string | null;
  wordsToAvoid: string[];
  examples: string[];
};

/** Always inject this into the assistants' system prompt, even when the brand hasn't filled in a Brand Voice yet (empty arrays/null tone just mean that section is omitted from the prompt). */
export async function buildBrandContext(brandId: string): Promise<BrandContext> {
  const brandVoice = await prisma.brandVoice.findUnique({ where: { brandId } });
  return {
    tone: brandVoice?.tone ?? null,
    wordsToAvoid: brandVoice?.wordsToAvoid ?? [],
    examples: brandVoice?.examplePosts ?? [],
  };
}

export function brandContextToPromptSection(context: BrandContext): string {
  const lines: string[] = [];
  if (context.tone) lines.push(`Tone of voice to follow: ${context.tone}`);
  if (context.wordsToAvoid.length > 0) {
    lines.push(`Words to avoid: ${context.wordsToAvoid.join(", ")}`);
  }
  if (context.examples.length > 0) {
    lines.push(`Examples of posts that worked well for this brand:\n${context.examples.map((e) => `- ${e}`).join("\n")}`);
  }
  return lines.join("\n");
}

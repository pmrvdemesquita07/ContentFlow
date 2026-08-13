import { prisma } from "@/lib/db";
import type { AssistantType } from "@/lib/generated/prisma/enums";

export async function logAssistantCall(
  workspaceId: string,
  assistantType: AssistantType,
  input: string,
  output: string
): Promise<void> {
  await prisma.assistantLog.create({
    data: { workspaceId, assistantType, input, output },
  });
}

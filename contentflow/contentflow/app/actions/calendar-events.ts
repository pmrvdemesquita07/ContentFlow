"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/authz";
import { prisma } from "@/lib/db";
import type { CalendarEventStatus, CalendarEventType } from "@/lib/generated/prisma/enums";

export async function createCalendarEvent(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const ctx = await requireWorkspace();
  if (!ctx?.brand) return { error: "Finish onboarding first." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const type = String(formData.get("type") ?? "") as CalendarEventType;
  if (!type) return { error: "Pick an event type." };

  const startAtRaw = String(formData.get("startAt") ?? "");
  const startAt = startAtRaw ? new Date(startAtRaw) : null;
  if (!startAt || Number.isNaN(startAt.getTime())) return { error: "Pick a valid date." };

  const endAtRaw = String(formData.get("endAt") ?? "");
  const endAt = endAtRaw ? new Date(endAtRaw) : null;

  await prisma.calendarEvent.create({
    data: {
      workspaceId: ctx.workspace.id,
      brandId: ctx.brand.id,
      type,
      title,
      startAt,
      endAt,
      allDay: formData.get("allDay") === "on",
      notes: String(formData.get("notes") ?? "").trim() || null,
      campaignId: String(formData.get("campaignId") ?? "").trim() || null,
      contractId: String(formData.get("contractId") ?? "").trim() || null,
      creatorId: String(formData.get("creatorId") ?? "").trim() || null,
      contentId: String(formData.get("contentId") ?? "").trim() || null,
      createdBy: ctx.user.id,
    },
  });

  revalidatePath("/calendar");
  return { error: undefined };
}

export async function updateCalendarEvent(
  id: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const ctx = await requireWorkspace();
  if (!ctx) return { error: "No workspace selected." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const type = String(formData.get("type") ?? "") as CalendarEventType;
  const startAtRaw = String(formData.get("startAt") ?? "");
  const startAt = startAtRaw ? new Date(startAtRaw) : null;
  if (!startAt || Number.isNaN(startAt.getTime())) return { error: "Pick a valid date." };

  const endAtRaw = String(formData.get("endAt") ?? "");
  const endAt = endAtRaw ? new Date(endAtRaw) : null;

  await prisma.calendarEvent.updateMany({
    where: { id, workspaceId: ctx.workspace.id },
    data: {
      title,
      type,
      startAt,
      endAt,
      allDay: formData.get("allDay") === "on",
      notes: String(formData.get("notes") ?? "").trim() || null,
      campaignId: String(formData.get("campaignId") ?? "").trim() || null,
      contractId: String(formData.get("contractId") ?? "").trim() || null,
      creatorId: String(formData.get("creatorId") ?? "").trim() || null,
    },
  });

  revalidatePath("/calendar");
  return { error: undefined };
}

/** Drag-and-drop: move an event to a different day/time, nothing else changes. */
export async function moveCalendarEvent(id: string, startAt: Date, endAt: Date | null) {
  const ctx = await requireWorkspace();
  if (!ctx) return;
  await prisma.calendarEvent.updateMany({
    where: { id, workspaceId: ctx.workspace.id },
    data: { startAt, endAt },
  });
  revalidatePath("/calendar");
}

export async function updateCalendarEventStatus(id: string, status: CalendarEventStatus) {
  const ctx = await requireWorkspace();
  if (!ctx) return;
  await prisma.calendarEvent.updateMany({
    where: { id, workspaceId: ctx.workspace.id },
    data: { status },
  });
  revalidatePath("/calendar");
}

export async function deleteCalendarEvent(id: string) {
  const ctx = await requireWorkspace();
  if (!ctx) return;
  await prisma.calendarEvent.deleteMany({ where: { id, workspaceId: ctx.workspace.id } });
  revalidatePath("/calendar");
}

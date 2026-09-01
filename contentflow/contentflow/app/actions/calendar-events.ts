"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import type { CalendarEventStatus, CalendarEventType } from "@/lib/generated/prisma/enums";

export async function createCalendarEvent(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
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
      createdBy: user.id,
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
  await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const type = String(formData.get("type") ?? "") as CalendarEventType;
  const startAtRaw = String(formData.get("startAt") ?? "");
  const startAt = startAtRaw ? new Date(startAtRaw) : null;
  if (!startAt || Number.isNaN(startAt.getTime())) return { error: "Pick a valid date." };

  const endAtRaw = String(formData.get("endAt") ?? "");
  const endAt = endAtRaw ? new Date(endAtRaw) : null;

  await prisma.calendarEvent.update({
    where: { id },
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
  await requireUser();
  await prisma.calendarEvent.update({ where: { id }, data: { startAt, endAt } });
  revalidatePath("/calendar");
}

export async function updateCalendarEventStatus(id: string, status: CalendarEventStatus) {
  await requireUser();
  await prisma.calendarEvent.update({ where: { id }, data: { status } });
  revalidatePath("/calendar");
}

export async function deleteCalendarEvent(id: string) {
  await requireUser();
  await prisma.calendarEvent.delete({ where: { id } });
  revalidatePath("/calendar");
}

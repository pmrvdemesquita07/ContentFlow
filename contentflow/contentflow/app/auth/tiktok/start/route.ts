import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getTikTokAuthUrl } from "@/lib/tiktok";

export async function GET() {
  await requireUser();

  const state = randomUUID();
  const response = NextResponse.redirect(getTikTokAuthUrl(state));
  response.cookies.set("tt_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}

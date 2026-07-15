import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getInstagramAuthUrl } from "@/lib/instagram";

export async function GET() {
  await requireUser();

  const state = randomUUID();
  const response = NextResponse.redirect(getInstagramAuthUrl(state));
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}

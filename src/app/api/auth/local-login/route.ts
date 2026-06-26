import { NextResponse } from "next/server";
import {
  createSessionToken,
  isLocalAuthEnabled,
  LOCAL_SESSION_COOKIE,
  verifyCredentials
} from "@/shared/lib/auth/localAuth";

// Auth locale temporaire : valide les identifiants contre admin-credentials.json
// et pose un cookie de session signé (HMAC).
export async function POST(request: Request) {
  if (!isLocalAuthEnabled()) {
    return NextResponse.json({ error: "local_auth_disabled" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; password?: unknown }
    | null;
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!verifyCredentials(email, password)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOCAL_SESSION_COOKIE, createSessionToken(email.toLowerCase()), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}

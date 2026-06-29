import { NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE } from "@/shared/lib/auth/clientAuth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/connexion", request.url), { status: 303 });
  response.cookies.delete(CLIENT_SESSION_COOKIE);
  return response;
}

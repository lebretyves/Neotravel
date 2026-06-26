import { NextResponse } from "next/server";
import { isLocalAuthEnabled, LOCAL_SESSION_COOKIE } from "@/shared/lib/auth/localAuth";
import { ADMIN_LOGIN_PATH } from "@/shared/lib/auth/requireAdmin";
import { isDemoMode } from "@/shared/lib/demo/demoMode";
import { createAuthServerClient } from "@/shared/lib/supabase/auth-server";

export async function POST(request: Request) {
  // 303 forces a GET on the redirect target after the POST.
  const response = NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url), { status: 303 });

  if (isLocalAuthEnabled()) {
    response.cookies.delete(LOCAL_SESSION_COOKIE);
    return response;
  }

  if (!isDemoMode()) {
    const supabase = await createAuthServerClient();
    await supabase.auth.signOut();
  }

  return response;
}

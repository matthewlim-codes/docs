import { NextResponse, type NextRequest } from "next/server";

import { getSiteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirect(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/app";
  }

  return path;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirect(requestUrl.searchParams.get("next"));
  const origin = getSiteUrl(requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.redirect(`${origin}${profile ? next : "/onboarding"}`);
}

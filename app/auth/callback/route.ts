import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/serverClient";

// Email 確認連結、之後的 Google 登入都會導回這裡,用 code 換成正式的 session。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("exchangeCodeForSession failed:", error.message);
      return NextResponse.redirect(`${origin}/login?error=confirm_failed`);
    }
  }

  return NextResponse.redirect(`${origin}/projects`);
}

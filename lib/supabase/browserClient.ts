import { createBrowserClient } from "@supabase/ssr";

// 給瀏覽器端(Client Component)用,只處理登入/登出等 Auth 呼叫。
// 用的是 anon public key,本來就設計成可以公開。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

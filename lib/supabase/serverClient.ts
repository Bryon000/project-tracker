import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// 給 Server Component / Server Action / Route Handler 用,讀取目前登入的 session。
// 只用 anon key,不是拿來讀寫資料的(那是 lib/supabase/adminClient.ts 的工作)。
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在 Server Component 裡呼叫時無法寫入 cookie(Next.js 限制),
            // session 的更新交給 middleware.ts 處理就好,這裡忽略即可。
          }
        },
      },
    }
  );
}

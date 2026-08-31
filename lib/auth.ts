import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/serverClient";

// cache() 讓同一次請求裡(例如 layout.tsx 跟 page.tsx 都呼叫 requireUser())只真的打一次
// Supabase Auth API,不會每個元件各自重複驗證一次。
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** 取得目前登入的使用者,沒登入就導去 /login。給頁面和 Server Action 開頭用。 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

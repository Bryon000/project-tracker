import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/serverClient";

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** 取得目前登入的使用者,沒登入就導去 /login。給頁面和 Server Action 開頭用。 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

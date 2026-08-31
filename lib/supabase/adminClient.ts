import "server-only";
import { createClient } from "@supabase/supabase-js";

// 只在伺服器端使用(Server Components / Server Actions)。用 service role key 集中存取資料,
// 金鑰不會出現在瀏覽器端。授權(誰能看/改哪個專案)由 lib/queries.ts 裡的 member 檢查負責,
// 而不是 RLS —— 因為所有資料存取都只透過我們自己的伺服器端程式碼,從來不曾直接暴露給瀏覽器。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 環境變數,請參考 .env.local.example 設定。"
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

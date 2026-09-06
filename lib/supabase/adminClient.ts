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

// Next.js 會全域 patch fetch() 並預設把回應放進它自己的 Data Cache——即使頁面/路由設了
// dynamic = "force-dynamic",這個快取有時還是會套用到「第三方套件內部呼叫的 fetch」
// (例如這裡的 supabase-js),導致讀到舊資料(實測發生在 /api/cron/reminders:小項目
// 明明已經在資料庫改成未完成,route handler 讀到的還是改之前的內容)。這裡強制每個
// 請求都帶 cache: "no-store",確保絕對讀到當下的資料庫狀態,不會被 Next 的快取層蓋掉。
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});

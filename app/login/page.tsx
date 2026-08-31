import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/serverClient";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/projects");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-surface p-6">
        <div>
          <h1 className="text-lg font-semibold">專案進度管理</h1>
          <p className="mt-1 text-sm text-muted">登入以繼續</p>
        </div>
        {searchParams.error === "confirm_failed" && (
          <p className="text-sm text-red-500">
            確認連結已失效或過期,請重新註冊,或直接登入(如果帳號已經完成過驗證)。
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}

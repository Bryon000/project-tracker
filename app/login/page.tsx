import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/serverClient";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
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
        <LoginForm />
      </div>
    </main>
  );
}

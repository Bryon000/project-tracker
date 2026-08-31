import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "./actions";

export default async function ProjectsLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <span className="text-sm text-muted">{user.email}</span>
        <form action={signOutAction}>
          <button type="submit" className="text-sm text-muted hover:text-accent">
            登出
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}

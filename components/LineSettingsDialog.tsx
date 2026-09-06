"use client";

import { useState, useTransition } from "react";
import type { Project } from "@/lib/types";
import {
  generateLineLinkCodeAction,
  unbindLineGroupAction,
} from "@/app/projects/[projectId]/actions";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "操作失敗,請重新整理再試一次";
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function LineSettingsDialog({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isBound = !!project.line_group_id;
  const hasActiveCode =
    !!project.line_link_code &&
    !!project.line_link_code_expires_at &&
    new Date(project.line_link_code_expires_at).getTime() > Date.now();

  function generate() {
    setError(null);
    startTransition(() => {
      generateLineLinkCodeAction(project.id).catch((err) => setError(errorMessage(err)));
    });
  }

  function unbind() {
    if (!confirm("確定要解除這個專案的 LINE 群組綁定嗎?原本的群組會收到一則通知,之後就不會再收到提醒了。")) {
      return;
    }
    setError(null);
    startTransition(() => {
      unbindLineGroupAction(project.id).catch((err) => setError(errorMessage(err)));
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
      >
        LINE 提醒設定
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold">LINE 提醒設定</h2>

            {isBound ? (
              <div className="space-y-3">
                <div className="rounded border border-border bg-bg p-3 text-sm">
                  <p className="text-accent">✅ 已綁定 LINE 群組</p>
                  {project.line_bound_at && (
                    <p className="mt-1 text-xs text-muted">
                      綁定時間:{formatDateTime(project.line_bound_at)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    每天早上 9 點,已逾期/即將到期的任務會發到這個群組。
                  </p>
                </div>
                <button
                  onClick={unbind}
                  disabled={isPending}
                  className="w-full rounded border border-border px-3 py-1.5 text-sm text-muted hover:border-red-500 hover:text-red-500 disabled:opacity-50"
                >
                  解除綁定
                </button>
              </div>
            ) : hasActiveCode ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  把 LINE 官方帳號加為好友、邀進你要接收提醒的群組,官方帳號會在群組裡問你要綁定的代碼,把下面這組貼過去就完成了:
                </p>
                <div className="rounded border border-border bg-bg p-4 text-center">
                  <p className="font-mono text-2xl tracking-widest text-accent">
                    {project.line_link_code}
                  </p>
                  {project.line_link_code_expires_at && (
                    <p className="mt-2 text-xs text-muted">
                      15 分鐘內有效(到 {formatDateTime(project.line_link_code_expires_at)})
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted">
                  這組代碼等於密碼,請不要截圖分享給不相關的人。
                </p>
                <button
                  onClick={generate}
                  disabled={isPending}
                  className="w-full rounded border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  重新產生(讓這組代碼失效)
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  這個專案還沒有綁定 LINE 群組,產生一組連結代碼開始設定。
                </p>
                <button
                  onClick={generate}
                  disabled={isPending}
                  className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  產生連結代碼
                </button>
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded px-3 py-1.5 text-sm text-muted hover:bg-bg"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

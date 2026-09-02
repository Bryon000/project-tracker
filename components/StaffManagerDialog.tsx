"use client";

import { useRef, useState, useTransition } from "react";
import type { Staff } from "@/lib/types";
import { addStaffAction, deleteStaffAction } from "@/app/projects/[projectId]/actions";

const STAFF_LIMIT = 30;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "操作失敗,請重新整理再試一次";
}

export function StaffManagerDialog({
  projectId,
  staff,
}: {
  projectId: string;
  staff: Staff[];
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const atLimit = staff.length >= STAFF_LIMIT;

  function remove(staffId: string) {
    startTransition(() => {
      deleteStaffAction(projectId, staffId).catch((err) => setError(errorMessage(err)));
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
      >
        員工管理
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
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">員工管理</h2>
              <span className="text-xs text-muted">
                {staff.length} / {STAFF_LIMIT}
              </span>
            </div>

            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {staff.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate">{s.name}</p>
                    {s.email && <p className="truncate text-xs text-muted">{s.email}</p>}
                  </div>
                  <button
                    onClick={() => remove(s.id)}
                    className="shrink-0 text-xs text-muted hover:text-red-500"
                    aria-label={`刪除 ${s.name}`}
                  >
                    刪除
                  </button>
                </li>
              ))}
              {staff.length === 0 && (
                <p className="text-sm text-muted">還沒有任何員工,新增一位吧。</p>
              )}
            </ul>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <form
              ref={formRef}
              action={async (formData: FormData) => {
                try {
                  await addStaffAction(projectId, formData);
                  formRef.current?.reset();
                } catch (err) {
                  setError(errorMessage(err));
                }
              }}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <input
                  name="name"
                  placeholder="姓名"
                  disabled={atLimit}
                  className="w-24 rounded border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent disabled:opacity-50"
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Email(選填,之後 Google 登入綁定用)"
                  disabled={atLimit}
                  className="flex-1 rounded border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={atLimit}
                className="w-full rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {atLimit ? "已達人數上限" : "新增員工"}
              </button>
            </form>

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

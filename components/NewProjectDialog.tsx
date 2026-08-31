"use client";

import { useState } from "react";
import { createProjectAction } from "@/app/projects/actions";

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        + 新增專案
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-base font-semibold">新增專案</h2>
            <form action={createProjectAction} className="space-y-3">
              <input
                name="name"
                required
                autoFocus
                placeholder="專案名稱"
                className="w-full rounded border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded px-3 py-1.5 text-sm text-muted hover:bg-bg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  建立
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";

// Phase 2 用:共享專案的彈窗。目前只有 UI,邏輯會在接上 Supabase Auth 後補上。
export function ShareDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
      >
        共享
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
            <h2 className="mb-2 text-base font-semibold">共享此專案</h2>
            <p className="text-sm text-muted">
              共享功能將在接上 Supabase Auth 的 Google 登入後開放,敬請期待。
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent hover:opacity-80"
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

"use client";

import { useState, type ReactNode } from "react";

/** 清單底部的「已完成 N 項 ▸」收合區,預設收起;沒有已完成的項目就整個不顯示。 */
export function CompletedSection({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 px-1.5 py-1 text-xs text-muted hover:text-accent"
      >
        <span>{open ? "▾" : "▸"}</span>
        已完成 {count} 項
      </button>
      {open && <div className="space-y-1 opacity-70">{children}</div>}
    </div>
  );
}

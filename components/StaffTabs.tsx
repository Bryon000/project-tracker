"use client";

import { useRef } from "react";
import type { Staff } from "@/lib/types";

export function StaffTabs({
  staff,
  selected,
  onSelect,
}: {
  staff: Staff[];
  selected: string | null;
  onSelect: (staffId: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (staff.length === 0) return null;

  function scroll(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  }

  function tabClass(active: boolean) {
    return `shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-sm transition-colors ${
      active ? "bg-accent text-white" : "text-muted hover:bg-bg"
    }`;
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => scroll(-1)}
        className="shrink-0 rounded px-1 py-1 text-muted hover:text-accent"
        aria-label="往左捲動"
      >
        ◀
      </button>
      <div ref={scrollRef} className="no-scrollbar flex gap-1 overflow-x-auto">
        <button type="button" onClick={() => onSelect(null)} className={tabClass(selected === null)}>
          總覽
        </button>
        {staff.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={tabClass(selected === s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => scroll(1)}
        className="shrink-0 rounded px-1 py-1 text-muted hover:text-accent"
        aria-label="往右捲動"
      >
        ▶
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/types";
import type { UrgentSubtask } from "@/lib/progress";
import { ProgressBar } from "./ProgressBar";
import { ReminderBadge } from "./ReminderBadge";

export function ProjectCard({
  project,
  progress,
  urgentItems,
}: {
  project: Project;
  progress: number;
  urgentItems: UrgentSubtask[];
}) {
  const [open, setOpen] = useState(false);

  const overdueCount = urgentItems.filter((i) => i.status === "overdue").length;
  const soonCount = urgentItems.length - overdueCount;

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="shrink-0 text-muted">{open ? "▾" : "▸"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-semibold">{project.name}</h3>
            {overdueCount > 0 ? (
              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                {overdueCount} 項逾期
              </span>
            ) : (
              soonCount > 0 && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {soonCount} 項即將到期
                </span>
              )
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar percent={progress} size="sm" />
            <span className="shrink-0 text-xs text-muted">{progress}%</span>
          </div>
        </div>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          {urgentItems.length === 0 ? (
            <p className="text-xs text-muted">目前沒有逾期或即將到期的項目</p>
          ) : (
            <ul className="space-y-1.5">
              {urgentItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate text-muted">
                    {item.categoryName} · {item.name}
                  </span>
                  <ReminderBadge deadline={item.deadline} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted">
            建立於 {new Date(project.created_at).toLocaleDateString("zh-TW")}
          </p>
          <Link
            href={`/projects/${project.id}`}
            className="inline-block text-xs text-accent hover:underline"
          >
            查看完整看板 →
          </Link>
        </div>
      )}
    </div>
  );
}

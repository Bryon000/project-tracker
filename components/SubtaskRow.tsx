"use client";

import { useState, useTransition } from "react";
import { ReminderBadge } from "./ReminderBadge";
import type { Subtask } from "@/lib/types";
import {
  deleteSubtaskAction,
  toggleSubtaskDoneAction,
  updateSubtaskDeadlineAction,
  updateSubtaskNameAction,
} from "@/app/projects/[projectId]/actions";

export function SubtaskRow({
  projectId,
  subtask,
}: {
  projectId: string;
  subtask: Subtask;
}) {
  const [, startTransition] = useTransition();
  const [name, setName] = useState(subtask.name);

  function commitName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === subtask.name) {
      setName(subtask.name);
      return;
    }
    startTransition(() => {
      updateSubtaskNameAction(projectId, subtask.id, trimmed);
    });
  }

  function toggleDone() {
    startTransition(() => {
      toggleSubtaskDoneAction(projectId, subtask.id, !subtask.done);
    });
  }

  function changeDeadline(e: React.ChangeEvent<HTMLInputElement>) {
    startTransition(() => {
      updateSubtaskDeadlineAction(projectId, subtask.id, e.target.value);
    });
  }

  function remove() {
    startTransition(() => {
      deleteSubtaskAction(projectId, subtask.id);
    });
  }

  return (
    <div className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-bg">
      <input
        type="checkbox"
        checked={subtask.done}
        onChange={toggleDone}
        className="h-3.5 w-3.5 shrink-0 accent-accent"
        aria-label="標記小項目完成"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        className={`min-w-0 flex-1 bg-transparent outline-none focus:underline decoration-accent ${
          subtask.done ? "text-muted line-through" : ""
        }`}
      />
      <input
        type="date"
        value={subtask.deadline ?? ""}
        onChange={changeDeadline}
        className="shrink-0 rounded border border-border bg-bg px-1.5 py-0.5 text-xs text-muted outline-none focus:border-accent"
      />
      <ReminderBadge deadline={subtask.deadline} />
      <button
        onClick={remove}
        className="shrink-0 text-xs text-muted hover:text-red-500"
        aria-label="刪除小項目"
      >
        ✕
      </button>
    </div>
  );
}

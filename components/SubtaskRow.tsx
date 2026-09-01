"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReminderBadge } from "./ReminderBadge";
import { useSyncedField } from "@/lib/useSyncedField";
import { useOptimisticValue } from "@/lib/useOptimisticValue";
import type { Subtask } from "@/lib/types";
import {
  deleteSubtaskAction,
  toggleSubtaskDoneAction,
  updateSubtaskDeadlineAction,
  updateSubtaskNameAction,
  updateSubtaskNoteAction,
} from "@/app/projects/[projectId]/actions";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "操作失敗,請重新整理再試一次";
}

export function SubtaskRow({ subtask }: { subtask: Subtask }) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nameField = useSyncedField(subtask.name);
  const deadlineField = useSyncedField(subtask.deadline ?? "");
  const noteField = useSyncedField(subtask.note ?? "");
  const [optimisticDone, setOptimisticDone] = useOptimisticValue(subtask.done);
  const [noteOpen, setNoteOpen] = useState(!!subtask.note);

  // 拖曳的 ref/style 掛在最外層(下面那個 <div>),備註展開的文字框跟這一列都在同一個
  // 外層容器裡,拖曳小項目時備註會一起移動,不會被拆開。
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subtask.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function commitName() {
    const trimmed = nameField.value.trim();
    if (!trimmed || trimmed === subtask.name) {
      nameField.setValue(subtask.name);
      return;
    }
    startTransition(() => {
      updateSubtaskNameAction(subtask.id, trimmed).catch((err) => setError(errorMessage(err)));
    });
  }

  function toggleDone() {
    const next = !optimisticDone;
    setOptimisticDone(next);
    startTransition(() => {
      toggleSubtaskDoneAction(subtask.id, next).catch((err) => {
        setOptimisticDone(subtask.done);
        setError(errorMessage(err));
      });
    });
  }

  function changeDeadline(e: React.ChangeEvent<HTMLInputElement>) {
    const deadline = e.target.value;
    deadlineField.setValue(deadline);
    startTransition(() => {
      updateSubtaskDeadlineAction(subtask.id, deadline).catch((err) =>
        setError(errorMessage(err))
      );
    });
  }

  function remove() {
    startTransition(() => {
      deleteSubtaskAction(subtask.id).catch((err) => setError(errorMessage(err)));
    });
  }

  function commitNote() {
    const trimmed = noteField.value.trim();
    if (trimmed === (subtask.note ?? "")) return;
    startTransition(() => {
      updateSubtaskNoteAction(subtask.id, trimmed).catch((err) => setError(errorMessage(err)));
    });
  }

  return (
    <div ref={setNodeRef} style={style} className="space-y-1">
      <div className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-bg">
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none text-muted hover:text-accent active:cursor-grabbing"
          aria-label="拖曳排序小項目"
        >
          ⠿
        </button>
        <input
          type="checkbox"
          checked={optimisticDone}
          onChange={toggleDone}
          className="h-3.5 w-3.5 shrink-0 accent-accent"
          aria-label="標記小項目完成"
        />
        <input
          value={nameField.value}
          onChange={(e) => nameField.setValue(e.target.value)}
          onFocus={nameField.onFocus}
          onBlur={() => {
            nameField.onBlur();
            commitName();
          }}
          className={`min-w-0 flex-1 bg-transparent outline-none focus:underline decoration-accent ${
            optimisticDone ? "text-muted line-through" : ""
          }`}
        />
        <input
          type="date"
          value={deadlineField.value}
          onChange={changeDeadline}
          onFocus={deadlineField.onFocus}
          onBlur={deadlineField.onBlur}
          className="shrink-0 rounded border border-border bg-bg px-1.5 py-0.5 text-xs text-muted outline-none focus:border-accent"
        />
        <ReminderBadge deadline={subtask.deadline} />
        <button
          onClick={() => setNoteOpen((v) => !v)}
          className={`shrink-0 text-xs hover:text-accent ${
            subtask.note ? "text-accent" : "text-muted"
          }`}
          aria-label="備註"
        >
          備註
        </button>
        <button
          onClick={remove}
          className="shrink-0 text-xs text-muted hover:text-red-500"
          aria-label="刪除小項目"
        >
          ✕
        </button>
      </div>
      {noteOpen && (
        <textarea
          value={noteField.value}
          onChange={(e) => noteField.setValue(e.target.value)}
          onFocus={noteField.onFocus}
          onBlur={() => {
            noteField.onBlur();
            commitNote();
          }}
          placeholder="備註..."
          rows={2}
          className="ml-9 w-[calc(100%-2.25rem)] resize-y rounded border border-border bg-bg px-2 py-1 text-xs text-ink outline-none focus:border-accent"
        />
      )}
      {error && <p className="pl-9 text-xs text-red-500">{error}</p>}
    </div>
  );
}

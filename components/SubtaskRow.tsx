"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CompletedBadge, ReminderBadge } from "./ReminderBadge";
import { useSyncedField } from "@/lib/useSyncedField";
import { useOptimisticValue } from "@/lib/useOptimisticValue";
import type { Staff, Subtask } from "@/lib/types";
import {
  deleteSubtaskAction,
  toggleSubtaskDoneAction,
  updateSubtaskAssigneeAction,
  updateSubtaskDeadlineAction,
  updateSubtaskNameAction,
  updateSubtaskNoteAction,
} from "@/app/projects/[projectId]/actions";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "操作失敗,請重新整理再試一次";
}

export function SubtaskRow({
  subtask,
  staff,
  sortable = true,
  onDoneChange,
  onError,
}: {
  subtask: Subtask;
  staff: Staff[];
  sortable?: boolean;
  /** 讓外層清單在勾選當下就把這一列搬進/搬出「已完成」區,不用等伺服器回應。 */
  onDoneChange?: (subtaskId: string, done: boolean) => void;
  /** 這一列可能在伺服器回應前就被搬到另一區(元件被卸載),錯誤要交給不會被卸載的外層顯示。 */
  onError?: (message: string) => void;
}) {
  const [, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const setError = onError ?? setLocalError;
  const nameField = useSyncedField(subtask.name);
  const deadlineField = useSyncedField(subtask.deadline ?? "");
  const noteField = useSyncedField(subtask.note ?? "");
  const [optimisticDone, setOptimisticDone] = useOptimisticValue(subtask.done);
  const [noteOpen, setNoteOpen] = useState(!!subtask.note);

  // 拖曳的 ref/style 掛在最外層(下面那個 <div>),備註展開的文字框跟這一列都在同一個
  // 外層容器裡,拖曳小項目時備註會一起移動,不會被拆開。sortable=false(例如員工的個人任務
  // 篩選畫面)時用 disabled 關掉拖曳互動,但還是要呼叫這個 hook,因為外層一定有包 DndContext。
  // disabled 只給 true 的話,dnd-kit 只會關掉「拖曳」,這一列仍然是放置目標——拖曳別的項目經過
  // 已完成區時會被判定成放到這裡,結果彈回原位什麼都沒做。所以兩邊都要明確關掉。
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subtask.id,
    disabled: sortable ? false : { draggable: true, droppable: true },
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
    const previous = subtask.done;
    setOptimisticDone(next);
    onDoneChange?.(subtask.id, next);
    startTransition(() => {
      toggleSubtaskDoneAction(subtask.id, next).catch((err) => {
        setOptimisticDone(previous);
        onDoneChange?.(subtask.id, previous);
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

  function changeAssignee(e: React.ChangeEvent<HTMLSelectElement>) {
    const staffId = e.target.value || null;
    startTransition(() => {
      updateSubtaskAssigneeAction(subtask.id, staffId).catch((err) =>
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
        {sortable && (
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab touch-none text-muted hover:text-accent active:cursor-grabbing"
            aria-label="拖曳排序小項目"
          >
            ⠿
          </button>
        )}
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
        <select
          value={subtask.assignee_staff_id ?? ""}
          onChange={changeAssignee}
          className="shrink-0 rounded border border-border bg-bg px-1.5 py-0.5 text-xs text-muted outline-none focus:border-accent"
        >
          <option value="">未指派</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={deadlineField.value}
          onChange={changeDeadline}
          onFocus={deadlineField.onFocus}
          onBlur={deadlineField.onBlur}
          className="shrink-0 rounded border border-border bg-bg px-1.5 py-0.5 text-xs text-muted outline-none focus:border-accent"
        />
        {optimisticDone ? (
          <CompletedBadge completedAt={subtask.done ? subtask.completed_at : null} />
        ) : (
          <ReminderBadge deadline={subtask.deadline} />
        )}
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
      {localError && <p className="pl-9 text-xs text-red-500">{localError}</p>}
    </div>
  );
}

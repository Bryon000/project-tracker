"use client";

import { useTransition } from "react";
import { useOptimisticValue } from "@/lib/useOptimisticValue";
import type { Todo } from "@/lib/types";
import { deleteTodoAction, toggleTodoAction } from "@/app/projects/[projectId]/actions";

export function TodoItem({
  todo,
  onError,
}: {
  todo: Todo;
  onError: (message: string) => void;
}) {
  const [, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useOptimisticValue(todo.done);

  function toggleDone() {
    const next = !optimisticDone;
    setOptimisticDone(next);
    startTransition(() => {
      toggleTodoAction(todo.id, next).catch((err) => {
        setOptimisticDone(todo.done);
        onError(err instanceof Error ? err.message : "操作失敗,請重新整理再試一次");
      });
    });
  }

  function remove() {
    startTransition(() => {
      deleteTodoAction(todo.id).catch((err) =>
        onError(err instanceof Error ? err.message : "操作失敗,請重新整理再試一次")
      );
    });
  }

  return (
    <li className="group flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={optimisticDone}
        onChange={toggleDone}
        className="h-3.5 w-3.5 shrink-0 accent-accent"
      />
      <span className={`flex-1 ${optimisticDone ? "text-muted line-through" : ""}`}>
        {todo.text}
      </span>
      <button
        onClick={remove}
        className="shrink-0 text-xs text-muted opacity-0 hover:text-red-500 group-hover:opacity-100"
        aria-label="刪除待辦事項"
      >
        ✕
      </button>
    </li>
  );
}

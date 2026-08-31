"use client";

import { useRef, useTransition } from "react";
import type { Todo } from "@/lib/types";
import {
  addTodoAction,
  deleteTodoAction,
  toggleTodoAction,
} from "@/app/projects/[projectId]/actions";

export function TodoList({
  projectId,
  todos,
}: {
  projectId: string;
  todos: Todo[];
}) {
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-muted">待辦事項</h2>

      <ul className="space-y-1.5">
        {todos.map((todo) => (
          <li key={todo.id} className="group flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() =>
                startTransition(() => {
                  toggleTodoAction(projectId, todo.id, !todo.done);
                })
              }
              className="h-3.5 w-3.5 shrink-0 accent-accent"
            />
            <span className={`flex-1 ${todo.done ? "text-muted line-through" : ""}`}>
              {todo.text}
            </span>
            <button
              onClick={() =>
                startTransition(() => {
                  deleteTodoAction(projectId, todo.id);
                })
              }
              className="shrink-0 text-xs text-muted opacity-0 hover:text-red-500 group-hover:opacity-100"
              aria-label="刪除待辦事項"
            >
              ✕
            </button>
          </li>
        ))}
        {todos.length === 0 && <p className="text-sm text-muted">目前沒有待辦事項</p>}
      </ul>

      <form
        ref={formRef}
        action={async (formData: FormData) => {
          await addTodoAction(projectId, formData);
          formRef.current?.reset();
        }}
        className="flex gap-2"
      >
        <input
          name="text"
          placeholder="新增待辦事項..."
          className="flex-1 rounded border border-border bg-bg px-2 py-1 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded bg-accent-soft px-3 py-1 text-sm font-medium text-accent hover:opacity-80"
        >
          新增
        </button>
      </form>
    </div>
  );
}

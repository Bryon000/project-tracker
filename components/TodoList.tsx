"use client";

import { useRef, useState } from "react";
import type { Todo } from "@/lib/types";
import { addTodoAction } from "@/app/projects/[projectId]/actions";
import { TodoItem } from "./TodoItem";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "操作失敗,請重新整理再試一次";
}

export function TodoList({
  projectId,
  todos,
}: {
  projectId: string;
  todos: Todo[];
}) {
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-muted">待辦事項</h2>

      <ul className="space-y-1.5">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onError={setError} />
        ))}
        {todos.length === 0 && <p className="text-sm text-muted">目前沒有待辦事項</p>}
      </ul>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <form
        ref={formRef}
        action={async (formData: FormData) => {
          try {
            await addTodoAction(projectId, formData);
            formRef.current?.reset();
          } catch (err) {
            setError(errorMessage(err));
          }
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

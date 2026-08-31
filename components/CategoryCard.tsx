"use client";

import { useRef, useState, useTransition } from "react";
import { ProgressBar } from "./ProgressBar";
import { SubtaskRow } from "./SubtaskRow";
import { categoryProgress } from "@/lib/progress";
import { useSyncedField } from "@/lib/useSyncedField";
import type { CategoryWithSubtasks } from "@/lib/types";
import {
  addSubtaskAction,
  deleteCategoryAction,
  toggleCategoryDoneAction,
  updateCategoryDriAction,
  updateCategoryNameAction,
} from "@/app/projects/[projectId]/actions";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "操作失敗,請重新整理再試一次";
}

export function CategoryCard({ category }: { category: CategoryWithSubtasks }) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const addSubtaskFormRef = useRef<HTMLFormElement>(null);
  const nameField = useSyncedField(category.name);
  const driNameField = useSyncedField(category.dri_name ?? "");
  const driUrlField = useSyncedField(category.dri_url ?? "");

  const progress = categoryProgress(category);

  function commitName() {
    const trimmed = nameField.value.trim();
    if (!trimmed || trimmed === category.name) {
      nameField.setValue(category.name);
      return;
    }
    startTransition(() => {
      updateCategoryNameAction(category.id, trimmed).catch((err) => setError(errorMessage(err)));
    });
  }

  function commitDri() {
    if (
      driNameField.value === (category.dri_name ?? "") &&
      driUrlField.value === (category.dri_url ?? "")
    ) {
      return;
    }
    startTransition(() => {
      updateCategoryDriAction(category.id, driNameField.value, driUrlField.value).catch((err) =>
        setError(errorMessage(err))
      );
    });
  }

  function toggleDone() {
    startTransition(() => {
      toggleCategoryDoneAction(category.id, !category.done).catch((err) =>
        setError(errorMessage(err))
      );
    });
  }

  function remove() {
    if (
      !confirm(`確定要刪除「${category.name}」這個類別嗎?底下的小項目也會一併刪除。`)
    ) {
      return;
    }
    startTransition(() => {
      deleteCategoryAction(category.id).catch((err) => setError(errorMessage(err)));
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <input
            type="checkbox"
            checked={category.done}
            onChange={toggleDone}
            className="mt-1.5 h-4 w-4 shrink-0 accent-accent"
            aria-label="標記大類別完成"
          />
          <input
            value={nameField.value}
            onChange={(e) => nameField.setValue(e.target.value)}
            onFocus={nameField.onFocus}
            onBlur={() => {
              nameField.onBlur();
              commitName();
            }}
            className="w-full bg-transparent text-base font-semibold outline-none focus:underline decoration-accent"
          />
        </div>
        <button
          onClick={remove}
          className="shrink-0 text-xs text-muted hover:text-red-500"
        >
          刪除類別
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input
          placeholder="負責人姓名"
          value={driNameField.value}
          onChange={(e) => driNameField.setValue(e.target.value)}
          onFocus={driNameField.onFocus}
          onBlur={() => {
            driNameField.onBlur();
            commitDri();
          }}
          className="w-28 rounded border border-border bg-bg px-2 py-1 outline-none focus:border-accent"
        />
        <input
          placeholder="貼上 Google Docs / 雲端資料夾連結"
          value={driUrlField.value}
          onChange={(e) => driUrlField.setValue(e.target.value)}
          onFocus={driUrlField.onFocus}
          onBlur={() => {
            driUrlField.onBlur();
            commitDri();
          }}
          className="min-w-[10rem] flex-1 rounded border border-border bg-bg px-2 py-1 outline-none focus:border-accent"
        />
        {category.dri_url && (
          <a
            href={category.dri_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-accent hover:underline"
          >
            開啟 ↗
          </a>
        )}
      </div>

      <ProgressBar percent={progress} />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="space-y-1">
        {category.subtasks.map((subtask) => (
          <SubtaskRow key={subtask.id} subtask={subtask} />
        ))}
        {category.subtasks.length === 0 && (
          <p className="px-1.5 py-1 text-xs text-muted">還沒有小項目</p>
        )}
      </div>

      <form
        ref={addSubtaskFormRef}
        action={async (formData: FormData) => {
          try {
            await addSubtaskAction(category.id, formData);
            addSubtaskFormRef.current?.reset();
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
        className="flex gap-2"
      >
        <input
          name="name"
          placeholder="新增小項目..."
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

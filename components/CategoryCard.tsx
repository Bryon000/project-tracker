"use client";

import { useRef, useState, useTransition } from "react";
import { ProgressBar } from "./ProgressBar";
import { SubtaskRow } from "./SubtaskRow";
import { categoryProgress } from "@/lib/progress";
import type { CategoryWithSubtasks } from "@/lib/types";
import {
  addSubtaskAction,
  deleteCategoryAction,
  toggleCategoryDoneAction,
  updateCategoryDriAction,
  updateCategoryNameAction,
} from "@/app/projects/[projectId]/actions";

export function CategoryCard({
  projectId,
  category,
}: {
  projectId: string;
  category: CategoryWithSubtasks;
}) {
  const [, startTransition] = useTransition();
  const addSubtaskFormRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(category.name);
  const [driName, setDriName] = useState(category.dri_name ?? "");
  const [driUrl, setDriUrl] = useState(category.dri_url ?? "");

  const progress = categoryProgress(category);

  function commitName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === category.name) {
      setName(category.name);
      return;
    }
    startTransition(() => {
      updateCategoryNameAction(projectId, category.id, trimmed);
    });
  }

  function commitDri() {
    if (driName === (category.dri_name ?? "") && driUrl === (category.dri_url ?? "")) {
      return;
    }
    startTransition(() => {
      updateCategoryDriAction(projectId, category.id, driName, driUrl);
    });
  }

  function toggleDone() {
    startTransition(() => {
      toggleCategoryDoneAction(projectId, category.id, !category.done);
    });
  }

  function remove() {
    if (
      !confirm(`確定要刪除「${category.name}」這個類別嗎?底下的小項目也會一併刪除。`)
    ) {
      return;
    }
    startTransition(() => {
      deleteCategoryAction(projectId, category.id);
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
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
          value={driName}
          onChange={(e) => setDriName(e.target.value)}
          onBlur={commitDri}
          className="w-28 rounded border border-border bg-bg px-2 py-1 outline-none focus:border-accent"
        />
        <input
          placeholder="貼上 Google Docs / 雲端資料夾連結"
          value={driUrl}
          onChange={(e) => setDriUrl(e.target.value)}
          onBlur={commitDri}
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

      <div className="space-y-1">
        {category.subtasks.map((subtask) => (
          <SubtaskRow key={subtask.id} projectId={projectId} subtask={subtask} />
        ))}
        {category.subtasks.length === 0 && (
          <p className="px-1.5 py-1 text-xs text-muted">還沒有小項目</p>
        )}
      </div>

      <form
        ref={addSubtaskFormRef}
        action={async (formData: FormData) => {
          await addSubtaskAction(projectId, category.id, formData);
          addSubtaskFormRef.current?.reset();
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

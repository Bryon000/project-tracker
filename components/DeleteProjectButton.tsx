"use client";

import { useState, useTransition } from "react";
import { deleteProjectAction } from "@/app/projects/[projectId]/actions";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (
      !confirm(
        `確定要刪除「${projectName}」這個專案嗎?底下所有類別、小項目、待辦事項都會一併刪除,無法復原。`
      )
    ) {
      return;
    }
    startTransition(() => {
      deleteProjectAction(projectId).catch((err) => {
        setError(err instanceof Error ? err.message : "刪除失敗,請重新整理再試一次");
      });
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="rounded border border-border px-3 py-1.5 text-sm text-muted hover:border-red-500 hover:text-red-500 disabled:opacity-50"
      >
        刪除專案
      </button>
    </div>
  );
}

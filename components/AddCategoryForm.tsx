"use client";

import { useRef, useState } from "react";
import { addCategoryAction } from "@/app/projects/[projectId]/actions";

export function AddCategoryForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <form
        ref={formRef}
        action={async (formData: FormData) => {
          try {
            await addCategoryAction(projectId, formData);
            formRef.current?.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "操作失敗,請重新整理再試一次");
          }
        }}
        className="flex gap-2"
      >
        <input
          name="name"
          placeholder="新增大類別..."
          className="flex-1 rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          新增類別
        </button>
      </form>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

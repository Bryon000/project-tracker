"use client";

import { useRef } from "react";
import { addCategoryAction } from "@/app/projects/[projectId]/actions";

export function AddCategoryForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await addCategoryAction(projectId, formData);
        formRef.current?.reset();
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
  );
}

"use client";

import { useState } from "react";
import { StaffTabs } from "./StaffTabs";
import { CategoryList } from "./CategoryList";
import { AddCategoryForm } from "./AddCategoryForm";
import { StaffTaskView } from "./StaffTaskView";
import type { CategoryWithSubtasks, Staff } from "@/lib/types";

export function BoardSection({
  projectId,
  categories,
  staff,
}: {
  projectId: string;
  categories: CategoryWithSubtasks[];
  staff: Staff[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <StaffTabs staff={staff} selected={selected} onSelect={setSelected} />

      {selected === null ? (
        <>
          <CategoryList projectId={projectId} categories={categories} staff={staff} />
          <AddCategoryForm projectId={projectId} />
        </>
      ) : (
        <StaffTaskView categories={categories} staff={staff} staffId={selected} />
      )}
    </div>
  );
}

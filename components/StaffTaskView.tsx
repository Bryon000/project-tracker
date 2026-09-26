"use client";

import { useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SubtaskRow } from "./SubtaskRow";
import { CompletedSection } from "./CompletedSection";
import { useOptimisticValue } from "@/lib/useOptimisticValue";
import { useDelayedRegroup } from "@/lib/useDelayedRegroup";
import type { CategoryWithSubtasks, Staff } from "@/lib/types";

// 這個畫面只是「篩選出指派給某個人的小項目」,不支援拖曳排序 —— 拖曳排序是針對整個類別
// 底下完整的小項目清單算 sort_order,在這種只看到一部分的篩選畫面裡排序沒有意義,硬做的話
// 送出去的 reorderSubtasksAction 只會拿到篩選後的子集,反而會打亂其他人任務的真實順序。
export function StaffTaskView({
  categories,
  staff,
  staffId,
}: {
  categories: CategoryWithSubtasks[];
  staff: Staff[];
  staffId: string;
}) {
  const [localCategories, setLocalCategories] = useOptimisticValue(categories);
  const [error, setError] = useState<string | null>(null);
  const { pin, groupOf } = useDelayedRegroup();
  const staffName = staff.find((s) => s.id === staffId)?.name ?? "";

  function handleSubtaskDoneChange(subtaskId: string, done: boolean) {
    const current = localCategories
      .flatMap((category) => category.subtasks)
      .find((s) => s.id === subtaskId);
    if (current) pin(subtaskId, groupOf(subtaskId, current.done));
    setLocalCategories((prev) =>
      prev.map((category) => ({
        ...category,
        subtasks: category.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, done, completed_at: null } : s
        ),
      }))
    );
  }

  const grouped = localCategories
    .map((category) => ({
      category,
      subtasks: category.subtasks.filter((s) => s.assignee_staff_id === staffId),
    }))
    .filter((group) => group.subtasks.length > 0);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-muted">{staffName} 的任務</h3>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {grouped.length === 0 ? (
        <p className="text-sm text-muted">目前沒有指派給 {staffName} 的小項目。</p>
      ) : (
        grouped.map(({ category, subtasks }) => {
          const active = subtasks.filter((s) => groupOf(s.id, s.done) === "active");
          const completed = subtasks.filter((s) => groupOf(s.id, s.done) === "completed");
          return (
            <div key={category.id} className="space-y-1">
              <p className="text-xs font-medium text-muted">{category.name}</p>
              <DndContext id={`staff-${staffId}-${category.id}`} onDragEnd={() => {}}>
                <SortableContext
                  items={subtasks.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {active.map((subtask) => (
                    <SubtaskRow
                      key={subtask.id}
                      subtask={subtask}
                      staff={staff}
                      sortable={false}
                      onDoneChange={handleSubtaskDoneChange}
                      onError={setError}
                    />
                  ))}
                  {active.length === 0 && (
                    <p className="px-1.5 py-1 text-xs text-muted">這個類別的任務都完成了</p>
                  )}
                  <CompletedSection count={completed.length}>
                    {completed.map((subtask) => (
                      <SubtaskRow
                        key={subtask.id}
                        subtask={subtask}
                        staff={staff}
                        sortable={false}
                        onDoneChange={handleSubtaskDoneChange}
                        onError={setError}
                      />
                    ))}
                  </CompletedSection>
                </SortableContext>
              </DndContext>
            </div>
          );
        })
      )}
    </div>
  );
}

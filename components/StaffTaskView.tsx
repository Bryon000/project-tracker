"use client";

import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SubtaskRow } from "./SubtaskRow";
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
  const staffName = staff.find((s) => s.id === staffId)?.name ?? "";

  const grouped = categories
    .map((category) => ({
      category,
      subtasks: category.subtasks.filter((s) => s.assignee_staff_id === staffId),
    }))
    .filter((group) => group.subtasks.length > 0);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-muted">{staffName} 的任務</h3>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted">目前沒有指派給 {staffName} 的小項目。</p>
      ) : (
        grouped.map(({ category, subtasks }) => (
          <div key={category.id} className="space-y-1">
            <p className="text-xs font-medium text-muted">{category.name}</p>
            <DndContext onDragEnd={() => {}}>
              <SortableContext
                items={subtasks.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {subtasks.map((subtask) => (
                  <SubtaskRow key={subtask.id} subtask={subtask} staff={staff} sortable={false} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        ))
      )}
    </div>
  );
}

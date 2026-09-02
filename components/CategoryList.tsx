"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CategoryCard } from "./CategoryCard";
import { useOptimisticValue } from "@/lib/useOptimisticValue";
import { reorderCategoriesAction } from "@/app/projects/[projectId]/actions";
import type { CategoryWithSubtasks, Staff } from "@/lib/types";

export function CategoryList({
  projectId,
  categories,
  staff,
}: {
  projectId: string;
  categories: CategoryWithSubtasks[];
  staff: Staff[];
}) {
  const [ordered, setOrdered] = useOptimisticValue(categories);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordered.findIndex((c) => c.id === active.id);
    const newIndex = ordered.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);

    reorderCategoriesAction(
      projectId,
      next.map((c) => c.id)
    ).catch((err) => {
      setOrdered(categories);
      setError(err instanceof Error ? err.message : "排序失敗,請重新整理再試一次");
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={ordered.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {ordered.map((category) => (
              <CategoryCard key={category.id} category={category} staff={staff} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {ordered.length === 0 && (
        <p className="text-sm text-muted">還沒有任何大類別,先新增一個吧。</p>
      )}
    </div>
  );
}

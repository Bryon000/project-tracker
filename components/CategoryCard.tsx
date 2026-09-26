"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ProgressBar } from "./ProgressBar";
import { SubtaskRow } from "./SubtaskRow";
import { CompletedSection } from "./CompletedSection";
import { CompletedBadge } from "./ReminderBadge";
import { categoryProgress } from "@/lib/progress";
import { useSyncedField } from "@/lib/useSyncedField";
import { useOptimisticValue } from "@/lib/useOptimisticValue";
import { useDelayedRegroup } from "@/lib/useDelayedRegroup";
import type { CategoryWithSubtasks, Staff } from "@/lib/types";
import {
  addSubtaskAction,
  deleteCategoryAction,
  reorderSubtasksAction,
  toggleCategoryDoneAction,
  updateCategoryDriAction,
  updateCategoryNameAction,
} from "@/app/projects/[projectId]/actions";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "操作失敗,請重新整理再試一次";
}

export function CategoryCard({
  category,
  staff,
}: {
  category: CategoryWithSubtasks;
  staff: Staff[];
}) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const addSubtaskFormRef = useRef<HTMLFormElement>(null);
  const nameField = useSyncedField(category.name);
  const driNameField = useSyncedField(category.dri_name ?? "");
  const driUrlField = useSyncedField(category.dri_url ?? "");
  const [optimisticDone, setOptimisticDone] = useOptimisticValue(category.done);
  const [orderedSubtasks, setOrderedSubtasks] = useOptimisticValue(category.subtasks);
  const { pin, groupOf } = useDelayedRegroup();
  // 大類別勾選完成後預設收成一行標題;使用者手動展開才看完整內容。
  const [expanded, setExpanded] = useState(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const collapseButtonRef = useRef<HTMLButtonElement>(null);
  // 按「展開」/「收起」後,被按的按鈕會消失,焦點要交給對面那顆按鈕,不然鍵盤使用者會被丟回頁首。
  const focusAfterToggle = useRef<"expand" | "collapse" | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const subtaskSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeSubtasks = orderedSubtasks.filter((s) => groupOf(s.id, s.done) === "active");
  const completedSubtasks = orderedSubtasks.filter((s) => groupOf(s.id, s.done) === "completed");
  const unfinishedCount = orderedSubtasks.filter((s) => !s.done).length;
  const progress = categoryProgress({ ...category, done: optimisticDone, subtasks: orderedSubtasks });
  const collapsed = optimisticDone && !expanded;

  useEffect(() => {
    if (focusAfterToggle.current === "collapse") collapseButtonRef.current?.focus();
    if (focusAfterToggle.current === "expand") expandButtonRef.current?.focus();
    focusAfterToggle.current = null;
  }, [collapsed]);

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
    const next = !optimisticDone;
    setOptimisticDone(next);
    if (next) setExpanded(false);
    startTransition(() => {
      toggleCategoryDoneAction(category.id, next).catch((err) => {
        setOptimisticDone(category.done);
        setError(errorMessage(err));
      });
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

  function handleSubtaskDoneChange(subtaskId: string, done: boolean) {
    const current = orderedSubtasks.find((s) => s.id === subtaskId);
    if (current) pin(subtaskId, groupOf(subtaskId, current.done));
    setOrderedSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, done, completed_at: null } : s))
    );
  }

  // 只有未完成區的小項目可以拖曳。送出排序時把已完成的接在後面一起送,
  // 才不會只更新到一部分、讓已完成項目的 sort_order 跟未完成的撞在一起。
  function handleSubtaskDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeSubtasks.findIndex((s) => s.id === active.id);
    const newIndex = activeSubtasks.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...arrayMove(activeSubtasks, oldIndex, newIndex), ...completedSubtasks];
    setOrderedSubtasks(next);

    reorderSubtasksAction(
      category.id,
      next.map((s) => s.id)
    ).catch((err) => {
      setOrderedSubtasks(category.subtasks);
      setError(errorMessage(err));
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-border bg-surface ${
        collapsed ? "px-4 py-2.5" : "space-y-3 p-4"
      }`}
    >
      {/* 收合/展開共用同一個標題列結構,拖曳鈕跟勾選框才會是同一個 DOM 節點——勾選大類別時卡片
          會收合,結構不同的話 React 會重建勾選框,鍵盤焦點就跟著不見。 */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 shrink-0 cursor-grab touch-none text-muted hover:text-accent active:cursor-grabbing"
          aria-label="拖曳排序類別"
        >
          ⠿
        </button>
        <input
          type="checkbox"
          checked={optimisticDone}
          onChange={toggleDone}
          className="mt-1.5 h-4 w-4 shrink-0 accent-accent"
          aria-label="標記大類別完成"
        />
        {collapsed ? (
          <button
            ref={expandButtonRef}
            type="button"
            onClick={() => {
              focusAfterToggle.current = "collapse";
              setExpanded(true);
            }}
            aria-expanded={false}
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pt-0.5 text-left"
          >
            <span className="truncate font-semibold text-muted">{category.name}</span>
            <CompletedBadge completedAt={category.done ? category.completed_at : null} />
            {unfinishedCount > 0 && (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                還有 {unfinishedCount} 項未完成
              </span>
            )}
            <span className="ml-auto text-xs text-muted">展開 ▸</span>
          </button>
        ) : (
          <>
            <input
              value={nameField.value}
              onChange={(e) => nameField.setValue(e.target.value)}
              onFocus={nameField.onFocus}
              onBlur={() => {
                nameField.onBlur();
                commitName();
              }}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none focus:underline decoration-accent"
            />
            <div className="flex shrink-0 items-center gap-3">
              {optimisticDone && (
                <button
                  ref={collapseButtonRef}
                  type="button"
                  onClick={() => {
                    focusAfterToggle.current = "expand";
                    setExpanded(false);
                  }}
                  aria-expanded={true}
                  className="text-xs text-muted hover:text-accent"
                >
                  收起
                </button>
              )}
              <button onClick={remove} className="text-xs text-muted hover:text-red-500">
                刪除類別
              </button>
            </div>
          </>
        )}
      </div>

      {collapsed ? (
        error && <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : (
        <>
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

          {/* id 固定下來,伺服器跟瀏覽器產生的 aria-describedby 才會一致,不會 hydration mismatch。 */}
          <DndContext
            id={`subtasks-${category.id}`}
            sensors={subtaskSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSubtaskDragEnd}
          >
            <SortableContext
              items={activeSubtasks.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {activeSubtasks.map((subtask) => (
                  <SubtaskRow
                    key={subtask.id}
                    subtask={subtask}
                    staff={staff}
                    onDoneChange={handleSubtaskDoneChange}
                    onError={setError}
                  />
                ))}
                {orderedSubtasks.length === 0 && (
                  <p className="px-1.5 py-1 text-xs text-muted">還沒有小項目</p>
                )}
                {orderedSubtasks.length > 0 && activeSubtasks.length === 0 && (
                  <p className="px-1.5 py-1 text-xs text-muted">小項目都完成了</p>
                )}
              </div>
            </SortableContext>

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

            <CompletedSection count={completedSubtasks.length}>
              <SortableContext
                items={completedSubtasks.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {completedSubtasks.map((subtask) => (
                  <SubtaskRow
                    key={subtask.id}
                    subtask={subtask}
                    staff={staff}
                    sortable={false}
                    onDoneChange={handleSubtaskDoneChange}
                    onError={setError}
                  />
                ))}
              </SortableContext>
            </CompletedSection>
          </DndContext>
        </>
      )}
    </div>
  );
}

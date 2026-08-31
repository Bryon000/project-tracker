import type { CategoryWithSubtasks, DeadlineStatus, Subtask } from "./types";

/** 單一大類別的進度(依底下小項目完成比例計算)。沒有小項目時,以類別自己的完成勾選框為準。 */
export function categoryProgress(category: {
  done: boolean;
  subtasks: Subtask[];
}): number {
  const { subtasks } = category;
  if (subtasks.length === 0) {
    return category.done ? 100 : 0;
  }
  const completed = subtasks.filter((s) => s.done).length;
  return Math.round((completed / subtasks.length) * 100);
}

/** 專案總進度:所有大類別完成比例的平均值。 */
export function overallProgress(categories: CategoryWithSubtasks[]): number {
  if (categories.length === 0) return 0;
  const total = categories.reduce((sum, c) => sum + categoryProgress(c), 0);
  return Math.round(total / categories.length);
}

// 團隊在台灣,固定用 UTC+8 算「今天」是幾號 —— 不能用 new Date() 的系統時區,
// 不然伺服器(通常是 UTC)跟瀏覽器(使用者本地時區)會算出不同的日期,
// 導致 SSR 算好的徽章文字跟瀏覽器 hydrate 後重算的對不起來(hydration mismatch)。
const TEAM_TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

function todayInTeamTimezone(): string {
  const shifted = new Date(Date.now() + TEAM_TZ_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

/** 以「今天」(固定 UTC+8)為基準,算出 deadline 距離今天的天數。 */
function daysUntil(deadline: string): number {
  const today = new Date(`${todayInTeamTimezone()}T00:00:00Z`);
  const target = new Date(`${deadline}T00:00:00Z`);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function deadlineStatus(deadline: string | null): DeadlineStatus {
  if (!deadline) return "none";
  const days = daysUntil(deadline);
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "ok";
}

export function deadlineDaysLeft(deadline: string): number {
  return daysUntil(deadline);
}

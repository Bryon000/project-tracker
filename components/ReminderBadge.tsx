import { deadlineDaysLeft, deadlineStatus, formatTeamMonthDay } from "@/lib/progress";
import type { DeadlineStatus } from "@/lib/types";

const STYLES: Record<Exclude<DeadlineStatus, "none">, string> = {
  overdue: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  soon: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export function ReminderBadge({ deadline }: { deadline: string | null }) {
  const status = deadlineStatus(deadline);
  if (status === "none" || !deadline) return null;

  const label =
    status === "overdue"
      ? "已逾期"
      : status === "soon"
      ? "即將到期"
      : `尚有 ${deadlineDaysLeft(deadline)} 天`;

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {label}
    </span>
  );
}

/** 已完成的項目不再看截止日,改顯示完成狀態;勾選剛送出、伺服器還沒回傳時間前,先只顯示「已完成」。 */
export function CompletedBadge({ completedAt }: { completedAt: string | null }) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700/80 dark:bg-emerald-950/60 dark:text-emerald-400/80">
      ✓ {completedAt ? `${formatTeamMonthDay(completedAt)} 完成` : "已完成"}
    </span>
  );
}

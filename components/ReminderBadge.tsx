import { deadlineDaysLeft, deadlineStatus } from "@/lib/progress";
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

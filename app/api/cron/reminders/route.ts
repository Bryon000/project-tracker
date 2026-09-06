import { NextResponse } from "next/server";
import {
  getCategoriesWithSubtasks,
  getProjectsWithLineGroup,
  getStaffForOwner,
  hasReminderBeenSentToday,
  markReminderSent,
} from "@/lib/queries";
import { deadlineStatus, todayInTeamTimezone } from "@/lib/progress";
import { sendLineMessage } from "@/lib/line";
import { secureCompare } from "@/lib/secureCompare";

export const dynamic = "force-dynamic";

// LINE 文字訊息上限是 5000 字元,留一點餘裕避免剛好卡在邊界。
const LINE_MESSAGE_LIMIT = 4500;

interface ReminderItem {
  name: string;
  deadline: string;
  assigneeName: string | null;
}

function formatDeadline(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${year}/${month}/${day}`;
}

function taskLine(item: ReminderItem): string {
  const who = item.assigneeName ? `(${item.assigneeName})` : "";
  return `・${item.name}${who} - ${formatDeadline(item.deadline)} 到期`;
}

function formatMessage(projectName: string, overdue: ReminderItem[], soon: ReminderItem[]): string {
  const header = `📋 每日任務提醒(${formatDate(todayInTeamTimezone())})— ${projectName}`;
  const lines: string[] = [];
  if (overdue.length > 0) lines.push("🔴 已逾期", ...overdue.map(taskLine));
  if (soon.length > 0) lines.push("🟡 即將到期", ...soon.map(taskLine));

  const full = [header, "", ...lines].join("\n");
  if (full.length <= LINE_MESSAGE_LIMIT) return full;
  return `${full.slice(0, LINE_MESSAGE_LIMIT)}\n\n...(訊息過長,已截斷,請到系統查看完整清單)`;
}

// Vercel Cron 觸發時會自動帶上 Authorization: Bearer $CRON_SECRET(要先在 Vercel 專案設定
// 裡加一個 CRON_SECRET 環境變數,Vercel 才會知道要帶這個 header)。沒對上就直接拒絕,
// 不然這個網址任何人都能打,會被拿來亂發訊息洗團隊的 LINE 群組、或白白消耗 LINE 的訊息額度。
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const provided = request.headers.get("authorization") ?? "";
  return secureCompare(provided, `Bearer ${cronSecret}`);
}

async function sendReminderForProject(
  project: { id: string; name: string; created_by: string; line_group_id: string },
  today: string
) {
  if (await hasReminderBeenSentToday(project.id, today)) {
    return { projectId: project.id, sent: false, reason: "今天已經執行過了" };
  }

  const [categories, staff] = await Promise.all([
    getCategoriesWithSubtasks(project.id),
    getStaffForOwner(project.created_by),
  ]);
  const staffNameById = new Map(staff.map((s) => [s.id, s.name]));

  const overdue: ReminderItem[] = [];
  const soon: ReminderItem[] = [];
  for (const category of categories) {
    for (const subtask of category.subtasks) {
      if (subtask.done || !subtask.deadline) continue;
      const status = deadlineStatus(subtask.deadline);
      if (status !== "overdue" && status !== "soon") continue;

      const item: ReminderItem = {
        name: subtask.name,
        deadline: subtask.deadline,
        assigneeName: subtask.assignee_staff_id
          ? staffNameById.get(subtask.assignee_staff_id) ?? null
          : null,
      };
      (status === "overdue" ? overdue : soon).push(item);
    }
  }

  if (overdue.length === 0 && soon.length === 0) {
    return { projectId: project.id, sent: false, reason: "沒有需要提醒的項目" };
  }

  await sendLineMessage(formatMessage(project.name, overdue, soon), project.line_group_id);
  await markReminderSent(project.id, today);

  return { projectId: project.id, sent: true, overdueCount: overdue.length, soonCount: soon.length };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = todayInTeamTimezone();

  try {
    const projects = await getProjectsWithLineGroup();

    // 每個專案各自 try/catch——一個專案發送失敗(例如群組已經失效)不該連累
    // 其他專案的提醒也發不出去。
    const results = await Promise.all(
      projects.map(async (project) => {
        try {
          return await sendReminderForProject(project, today);
        } catch (err) {
          console.error(`Reminder failed for project ${project.id}:`, err);
          return { projectId: project.id, sent: false, error: "發送失敗,詳情看 server log" };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Reminder cron failed:", err);
    return NextResponse.json({ error: "發送提醒時發生錯誤,詳情看 server log" }, { status: 500 });
  }
}

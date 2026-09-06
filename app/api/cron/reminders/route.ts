import { NextResponse } from "next/server";
import {
  getCategoriesWithSubtasks,
  getProjectsWithLineGroup,
  getStaffForOwner,
  hasReminderBeenSentToday,
  markReminderSent,
} from "@/lib/queries";
import { todayInTeamTimezone } from "@/lib/progress";
import { collectReminderItems, formatDailyReminderMessage } from "@/lib/reminderMessage";
import { sendLineMessage } from "@/lib/line";
import { secureCompare } from "@/lib/secureCompare";

export const dynamic = "force-dynamic";

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
  const { overdue, soon } = collectReminderItems(categories, staff);

  if (overdue.length === 0 && soon.length === 0) {
    return { projectId: project.id, sent: false, reason: "沒有需要提醒的項目" };
  }

  await sendLineMessage(formatDailyReminderMessage(project.name, overdue, soon), project.line_group_id);
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

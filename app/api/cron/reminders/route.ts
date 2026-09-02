import { NextResponse } from "next/server";
import {
  getSubtasksNeedingReminder,
  tryClaimReminderSlot,
  type ReminderSubtask,
} from "@/lib/queries";
import { deadlineStatus, todayInTeamTimezone } from "@/lib/progress";
import { sendLineMessage } from "@/lib/line";
import { secureCompare } from "@/lib/secureCompare";

export const dynamic = "force-dynamic";

// LINE 文字訊息上限是 5000 字元,留一點餘裕避免剛好卡在邊界。
// 超過的話用截斷而不是讓 LINE API 直接拒絕整則訊息 —— 不然那天的提醒會整個發不出去。
const LINE_MESSAGE_LIMIT = 4500;

interface ProjectGroup {
  projectName: string;
  overdue: ReminderSubtask[];
  soon: ReminderSubtask[];
}

function formatDeadline(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${year}/${month}/${day}`;
}

function taskLine(s: ReminderSubtask): string {
  const who = s.assigneeName ? `(${s.assigneeName})` : "";
  return `・${s.name}${who} - ${formatDeadline(s.deadline)} 到期`;
}

function formatMessage(byProject: Map<string, ProjectGroup>): string {
  const header = `📋 每日任務提醒(${formatDate(todayInTeamTimezone())})`;

  const sections = Array.from(byProject.values()).map(({ projectName, overdue, soon }) => {
    const lines = [`【${projectName}】`];
    if (overdue.length > 0) {
      lines.push("🔴 已逾期", ...overdue.map(taskLine));
    }
    if (soon.length > 0) {
      lines.push("🟡 即將到期", ...soon.map(taskLine));
    }
    return lines.join("\n");
  });

  const full = [header, "", ...sections].join("\n\n");
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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // 先搶今天的發送名額,搶不到代表今天已經發過了(不管是 Vercel Cron 自己重試,
    // 還是 CRON_SECRET 萬一外洩被重複觸發),直接跳過,一天最多只會真的發一次。
    const claimed = await tryClaimReminderSlot(todayInTeamTimezone());
    if (!claimed) {
      return NextResponse.json({ sent: false, reason: "今天已經執行過了" });
    }

    const subtasks = await getSubtasksNeedingReminder();

    const byProject = new Map<string, ProjectGroup>();
    for (const s of subtasks) {
      const status = deadlineStatus(s.deadline);
      if (status !== "overdue" && status !== "soon") continue;

      if (!byProject.has(s.projectId)) {
        byProject.set(s.projectId, { projectName: s.projectName, overdue: [], soon: [] });
      }
      byProject.get(s.projectId)![status].push(s);
    }

    if (byProject.size === 0) {
      return NextResponse.json({ sent: false, reason: "沒有需要提醒的項目" });
    }

    await sendLineMessage(formatMessage(byProject));

    let overdueCount = 0;
    let soonCount = 0;
    for (const group of Array.from(byProject.values())) {
      overdueCount += group.overdue.length;
      soonCount += group.soon.length;
    }

    return NextResponse.json({ sent: true, overdueCount, soonCount });
  } catch (err) {
    console.error("Reminder cron failed:", err);
    return NextResponse.json({ error: "發送提醒時發生錯誤,詳情看 server log" }, { status: 500 });
  }
}

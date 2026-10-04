import type { CategoryWithSubtasks, Staff, Todo } from "./types";
import { deadlineStatus, todayInTeamTimezone } from "./progress";

// LINE 文字訊息上限是 5000 字元,留一點餘裕避免剛好卡在邊界。
const LINE_MESSAGE_LIMIT = 4500;

export interface ReminderItem {
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

function truncateForLine(text: string): string {
  if (text.length <= LINE_MESSAGE_LIMIT) return text;
  return `${text.slice(0, LINE_MESSAGE_LIMIT)}\n\n...(訊息過長,已截斷,請到系統查看完整清單)`;
}

function formatBody(header: string, overdue: ReminderItem[], soon: ReminderItem[]): string {
  const lines: string[] = [];
  if (overdue.length > 0) lines.push("🔴 已逾期", ...overdue.map(taskLine));
  if (soon.length > 0) lines.push("🟡 即將到期", ...soon.map(taskLine));
  return [header, "", ...lines].join("\n");
}

/** 從類別/小項目資料裡篩出「已逾期」跟「即將到期」的項目——每日提醒、即時查詢共用同一套判斷邏輯。 */
export function collectReminderItems(
  categories: CategoryWithSubtasks[],
  staff: Staff[]
): { overdue: ReminderItem[]; soon: ReminderItem[] } {
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

  return { overdue, soon };
}

export function formatDailyReminderMessage(
  projectName: string,
  overdue: ReminderItem[],
  soon: ReminderItem[]
): string {
  const header = `📋 每日任務提醒(${formatDate(todayInTeamTimezone())})— ${projectName}`;
  return truncateForLine(formatBody(header, overdue, soon));
}

interface OpenItem {
  name: string;
  deadline: string | null;
  assigneeName: string | null;
}

export interface AllOpenItems {
  overdue: OpenItem[];
  soon: OpenItem[];
  later: OpenItem[];
  noDeadline: OpenItem[];
}

/** 「@機器人 所有進度」用:所有還沒完成的小項目,不管多久之後才到期、有沒有設截止日。 */
export function collectAllOpenItems(
  categories: CategoryWithSubtasks[],
  staff: Staff[]
): AllOpenItems {
  const staffNameById = new Map(staff.map((s) => [s.id, s.name]));
  const result: AllOpenItems = { overdue: [], soon: [], later: [], noDeadline: [] };

  for (const category of categories) {
    for (const subtask of category.subtasks) {
      if (subtask.done) continue;
      const item: OpenItem = {
        name: subtask.name,
        deadline: subtask.deadline,
        assigneeName: subtask.assignee_staff_id
          ? staffNameById.get(subtask.assignee_staff_id) ?? null
          : null,
      };
      const status = deadlineStatus(subtask.deadline);
      if (status === "overdue") result.overdue.push(item);
      else if (status === "soon") result.soon.push(item);
      else if (status === "ok") result.later.push(item);
      else result.noDeadline.push(item);
    }
  }

  const byDeadline = (a: OpenItem, b: OpenItem) => (a.deadline ?? "").localeCompare(b.deadline ?? "");
  result.overdue.sort(byDeadline);
  result.soon.sort(byDeadline);
  result.later.sort(byDeadline);
  return result;
}

function openItemLine(item: OpenItem): string {
  const who = item.assigneeName ? `(${item.assigneeName})` : "";
  const due = item.deadline ? ` - ${formatDeadline(item.deadline)} 到期` : "";
  return `・${item.name}${who}${due}`;
}

export function formatAllProgressMessage(
  projectName: string,
  items: AllOpenItems,
  todos: Todo[]
): string {
  const header = `📋 所有未完成項目(${formatDate(todayInTeamTimezone())})— ${projectName}`;
  const openTodos = todos.filter((t) => !t.done);

  const sections: [string, string[]][] = [
    ["🔴 已逾期", items.overdue.map(openItemLine)],
    ["🟡 3 天內到期", items.soon.map(openItemLine)],
    ["📅 之後到期", items.later.map(openItemLine)],
    ["⚪ 未設定截止日", items.noDeadline.map(openItemLine)],
    ["📝 待辦事項", openTodos.map((t) => `・${t.text}`)],
  ];
  const lines = sections
    .filter(([, rows]) => rows.length > 0)
    .flatMap(([title, rows]) => ["", title, ...rows]);

  if (lines.length === 0) {
    return `${header}\n\n所有項目都完成了,做得很好!`;
  }
  return truncateForLine([header, ...lines].join("\n"));
}

/** 群組裡 @機器人 + 「進度」關鍵字觸發的即時查詢——跟每日提醒同一份判斷邏輯,差別只在
 * 沒有東西要回報時要給個正面的答覆,而不是回傳一句只有標題的空白訊息。 */
export function formatOnDemandProgressMessage(
  projectName: string,
  overdue: ReminderItem[],
  soon: ReminderItem[]
): string {
  const header = `📋 目前任務清單(${formatDate(todayInTeamTimezone())})— ${projectName}`;
  if (overdue.length === 0 && soon.length === 0) {
    return `${header}\n\n目前沒有已逾期或即將到期的項目,做得很好!`;
  }
  return truncateForLine(formatBody(header, overdue, soon));
}

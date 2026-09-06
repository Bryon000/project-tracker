import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { secureCompare } from "@/lib/secureCompare";
import { replyLineMessage } from "@/lib/line";
import {
  clearProjectByGroupId,
  getCategoriesWithSubtasks,
  getProjectByGroupId,
  getStaffForOwner,
  tryBindProjectByLinkCode,
} from "@/lib/queries";
import { looksLikeLineLinkCode, normalizeLineLinkCode } from "@/lib/lineLinkCode";
import { collectReminderItems, formatOnDemandProgressMessage } from "@/lib/reminderMessage";
import type { Project } from "@/lib/types";

// 群組裡 @機器人 時,LINE 只有在使用者真的用 @ 選單點選機器人(而不是自己打字打出一樣的
// 名字)才會帶這個關鍵字——所以不用擔心有人打字冒充。搭配「進度」關鍵字才觸發,單純
// @機器人問別的事情不會有反應,避免每次被 @ 都跳出來插話。
const PROGRESS_KEYWORD = "進度";

// LINE 平台要求 webhook 一定要驗證 x-line-signature,不然任何人都可以偽造事件打這個網址。
// 驗法:用 channel secret 對「原始 request body」算 HMAC-SHA256,base64 編碼後比對。
function isValidSignature(rawBody: string, signature: string | null): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!signature || !channelSecret) return false;

  const expected = createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  return secureCompare(expected, signature);
}

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { type: string; groupId?: string };
  message?: {
    type: string;
    text?: string;
    mention?: { mentionees?: Array<{ type: string; isSelf?: boolean }> };
  };
}

function isBotMentioned(event: LineEvent): boolean {
  const mentionees = event.message?.mention?.mentionees ?? [];
  return mentionees.some((m) => m.isSelf === true);
}

async function replyWithProgressList(replyToken: string, project: Project) {
  const [categories, staff] = await Promise.all([
    getCategoriesWithSubtasks(project.id),
    getStaffForOwner(project.created_by),
  ]);
  const { overdue, soon } = collectReminderItems(categories, staff);
  await replyLineMessage(replyToken, formatOnDemandProgressMessage(project.name, overdue, soon));
}

async function handleJoin(event: LineEvent) {
  const groupId = event.source?.groupId;
  if (!groupId || !event.replyToken) return;

  const existing = await getProjectByGroupId(groupId);
  if (existing) {
    await replyLineMessage(event.replyToken, `此群組已經綁定「${existing.name}」專案的每日提醒。`);
    return;
  }
  await replyLineMessage(event.replyToken, "哈囉!請貼上要綁定的專案連結代碼,完成綁定後這裡就會收到每日任務提醒。");
}

async function handleLeave(event: LineEvent) {
  const groupId = event.source?.groupId;
  if (!groupId) return;
  // bot 被踢出/離開群組,清掉對應專案的綁定,不然排程會一直對一個進不去的群組推播、
  // 而且永遠沒人知道這個綁定其實已經失效。
  await clearProjectByGroupId(groupId);
}

async function handleMessage(event: LineEvent) {
  const groupId = event.source?.groupId;
  const text = event.message?.text;
  if (!groupId || !text || event.message?.type !== "text" || !event.replyToken) return;

  // 群組已經綁定專案的話,不要再把裡面的日常聊天當成代碼去比對——不然團隊在群組裡
  // 正常聊天,剛好打出符合代碼格式的字串,會被誤判成想換綁。唯一的例外是「@機器人 進度」,
  // 這是使用者特地要求的即時查詢功能,其他訊息(包含單純 @機器人問別的事)一律不回應。
  const existing = await getProjectByGroupId(groupId);
  if (existing) {
    if (isBotMentioned(event) && text.includes(PROGRESS_KEYWORD)) {
      await replyWithProgressList(event.replyToken, existing);
    }
    return;
  }

  const code = normalizeLineLinkCode(text);
  const bound = await tryBindProjectByLinkCode(code, groupId);
  if (bound) {
    await replyLineMessage(
      event.replyToken,
      `✅ 已連結到專案:${bound.name}\n之後這裡會收到這個專案的每日任務提醒。`
    );
    return;
  }

  // 綁定失敗:只有在「這則訊息長得像是有人在嘗試貼代碼」時才回覆提示,
  // 不要對群組裡每一句不相關的閒聊都做出反應。
  if (looksLikeLineLinkCode(text)) {
    await replyLineMessage(
      event.replyToken,
      "找不到對應的專案代碼,請確認代碼是否正確、是否已過期,或回到專案頁面重新產生一組。"
    );
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events: LineEvent[] = body.events ?? [];

  for (const event of events) {
    try {
      if (event.type === "join") await handleJoin(event);
      else if (event.type === "leave") await handleLeave(event);
      else if (event.type === "message") await handleMessage(event);
    } catch (err) {
      // 一個事件處理失敗不該讓同一批送來的其他事件也處理不到,記錄下來繼續下一個。
      console.error("LINE webhook event handling failed:", event.type, err);
    }
  }

  return NextResponse.json({ ok: true });
}

import "server-only";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

function getChannelAccessToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("缺少 LINE_CHANNEL_ACCESS_TOKEN 環境變數");
  return token;
}

/** 主動推播一則文字訊息到指定群組(排程提醒用)。groupId 現在是每個專案自己的
 * line_group_id,不再是單一環境變數——同一個官方帳號、同一組 token 可以推播給
 * 很多個不同的群組。 */
export async function sendLineMessage(text: string, groupId: string): Promise<void> {
  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getChannelAccessToken()}`,
    },
    body: JSON.stringify({
      to: groupId,
      messages: [{ type: "text", text }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LINE 訊息發送失敗(${response.status}):${detail}`);
  }
}

/** 回覆使用者在群組裡送出的事件(貼代碼、加入群組等)。用 event 自帶的 replyToken,
 * 不算進每月推播訊息額度,但 replyToken 有效期很短且只能用一次,失敗就算了,
 * 不要重試(重試也沒用,token 已經失效)。 */
export async function replyLineMessage(replyToken: string, text: string): Promise<void> {
  const response = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getChannelAccessToken()}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`LINE reply 失敗(${response.status}):${detail}`);
  }
}

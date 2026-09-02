import "server-only";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

/** 把一則文字訊息推進設定好的 LINE 群組。只在伺服器端呼叫(排程/webhook),
 * channel access token 不會出現在瀏覽器端。 */
export async function sendLineMessage(text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;
  if (!token || !groupId) {
    throw new Error("缺少 LINE_CHANNEL_ACCESS_TOKEN 或 LINE_GROUP_ID 環境變數");
  }

  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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

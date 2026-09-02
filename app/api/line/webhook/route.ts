import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { secureCompare } from "@/lib/secureCompare";

// LINE 平台要求 webhook 一定要驗證 x-line-signature,不然任何人都可以偽造事件打這個網址。
// 驗法:用 channel secret 對「原始 request body」算 HMAC-SHA256,base64 編碼後比對。
function isValidSignature(rawBody: string, signature: string | null): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!signature || !channelSecret) return false;

  const expected = createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  return secureCompare(expected, signature);
}

// 目前這個 webhook 唯一的用途是幫你「拿到群組 ID」:把官方帳號拉進 LINE 群組、
// 或群裡有人發訊息時,LINE 會打這個網址,事件裡的 source.groupId 就是你要的群組 ID —
// 到 Vercel 的 Function Logs 找這行 log 就看得到。之後要做更多互動功能(例如回覆訊息)
// 也是從這裡擴充。
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  for (const event of body.events ?? []) {
    if (event.source?.type === "group") {
      console.log("LINE group event — groupId:", event.source.groupId);
    }
  }

  return NextResponse.json({ ok: true });
}

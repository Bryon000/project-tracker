// 排除容易看錯/打錯的字元:0/O、1/I/L,人工輸入代碼時這幾個最容易搞混。
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 6;

export function generateLineLinkCode(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/** 統一正規化:去除頭尾空白、轉大寫——手動輸入代碼時大小寫、多餘空白很常見。 */
export function normalizeLineLinkCode(text: string): string {
  return text.trim().toUpperCase();
}

/** 這段文字「長得像不像」一組連結代碼——用來決定 webhook 要不要回覆「找不到代碼」,
 * 不對群組裡每一句正常聊天都做出回應。 */
export function looksLikeLineLinkCode(text: string): boolean {
  const normalized = normalizeLineLinkCode(text);
  if (normalized.length !== LENGTH) return false;
  return normalized.split("").every((c) => ALPHABET.includes(c));
}

import "server-only";
import { timingSafeEqual } from "node:crypto";

/** 常數時間比較兩個字串,用在比對 secret/token/簽章這類東西,
 * 避免用一般的 === 讓攻擊者靠量測回應時間差逐字猜出正確值。 */
export function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

"use client";

import { useEffect, useState } from "react";

/**
 * 讓 UI 先假設操作會成功、立刻更新畫面,不用等伺服器回應。
 * 等伺服器真正回來的新資料(server prop 改變)時再同步覆蓋過去;
 * 如果 Server Action 失敗,呼叫端要自己把值設回原本的 server 值來復原。
 */
export function useOptimisticValue<T>(serverValue: T) {
  const [value, setValue] = useState(serverValue);

  useEffect(() => {
    setValue(serverValue);
  }, [serverValue]);

  return [value, setValue] as const;
}

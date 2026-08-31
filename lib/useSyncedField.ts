"use client";

import { useEffect, useState } from "react";

/**
 * 讓輸入框的本地狀態跟著從 server 重新抓回來的最新值同步,但使用者正在編輯(focus 中)時不會被蓋掉。
 *
 * 沒有這層保護的話:A 打開一個類別卡片(name = "Foo"),B 把它改名成 "Bar" 並存檔、A 的頁面
 * revalidate 抓到新的 category.name = "Bar",但 A 元件內部的 local state 因為只在掛載時
 * 初始化一次,還停留在舊值 "Foo"。這時 A 只是點一下那個欄位又移開焦點(blur),就會把
 * B 剛存好的 "Bar" 覆寫回 "Foo" —— 而且完全沒有任何提示,B 的修改就這樣悄悄不見了。
 */
export function useSyncedField(value: string) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocal(value);
  }, [value, focused]);

  return {
    value: local,
    setValue: setLocal,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
}

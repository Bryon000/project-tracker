"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ListGroup = "active" | "completed";

/**
 * 勾選/取消勾選後,讓那一項先留在原本的清單裡一小段時間(已經顯示打勾跟完成徽章),
 * 再搬到另一區。瞬間搬走的話,底下的項目會立刻往上補位,連點時第二下就會點到下一項,
 * 而且被搬去的「已完成」區預設是收起來的,誤勾了也很難發現。
 */
export function useDelayedRegroup(delayMs = 1000) {
  const [pinned, setPinned] = useState<ReadonlyMap<string, ListGroup>>(() => new Map());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach(clearTimeout);
      active.clear();
    };
  }, []);

  /** from = 這一項在切換「之前」所在的清單。在等待時間內重複切換,會一直留在最初那一區。 */
  const pin = useCallback(
    (id: string, from: ListGroup) => {
      setPinned((prev) => {
        if (prev.has(id)) return prev;
        const next = new Map(prev);
        next.set(id, from);
        return next;
      });
      const existing = timers.current.get(id);
      if (existing) clearTimeout(existing);
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          setPinned((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
        }, delayMs)
      );
    },
    [delayMs]
  );

  const groupOf = useCallback(
    (id: string, done: boolean): ListGroup => pinned.get(id) ?? (done ? "completed" : "active"),
    [pinned]
  );

  return { pin, groupOf };
}

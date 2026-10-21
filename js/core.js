// 纯数据逻辑：不碰 DOM，不碰存储。以后换语言/换前端都只看这一个文件。
// State = { cur: number, qs: Queue[] }
// Queue = { id, name, pq: boolean, items: string[] }   items 永远按入队顺序存

(function (g) {
  const len = s => [...s].length; // 按字符数算，中文一个字算 1

  // PQ 比较器：size() 大的优先；一样长就先进先出（稳定）
  const pqCmp = (a, b) => len(b.t) - len(a.t) || a.i - b.i;

  // 返回展示/弹出顺序：[{ t, i }]，i 是在 items 里的下标
  function order(q) {
    const arr = q.items.map((t, i) => ({ t, i }));
    if (q.pq) arr.sort(pqCmp);
    return arr;
  }

  const uid = () => Math.random().toString(36).slice(2, 9);

  const Core = {
    len,
    order,
    newQueue: name => ({ id: uid(), name, pq: false, items: [] }),
    emptyState: () => ({ cur: 0, qs: [Core.newQueue("学习"), Core.newQueue("生活")] }),

    push(q, text) { q.items.push(text); },

    // 弹出 front（queue）或 top（PQ），返回 { t, i } 方便撤回
    pop(q) {
      if (!q.items.length) return null;
      const top = order(q)[0];
      q.items.splice(top.i, 1);
      return top;
    },

    remove(q, i) { q.items.splice(i, 1); },
    restore(q, popped) { q.items.splice(popped.i, 0, popped.t); },

    // 校验外部来的数据（导入、云端拉取都走这里）
    sanitize(s) {
      if (!s || !Array.isArray(s.qs) || !s.qs.length) return null;
      const qs = s.qs.map(q => ({
        id: q.id || uid(),
        name: String(q.name || "queue"),
        pq: !!q.pq,
        items: (q.items || []).map(String),
      }));
      return { cur: Math.min(Math.max(0, s.cur | 0), qs.length - 1), qs };
    },
  };

  g.Core = Core;
})(window);

// UI：只负责画界面和把点击翻译成 Core 操作，然后交给 store.save。
(async function () {
  const $ = id => document.getElementById(id);
  const store = Stores.local;

  let S = (await store.load()) || Core.emptyState();
  let last = null; // 最近一次 pop：{ qid, t, i }
  const Q = () => S.qs[S.cur];
  const cloud = Stores.cloud;
  const commit = () => { store.save(S); cloud.config.set({ dirty: true }); render(); };

  function render() {
    const q = Q();
    document.body.classList.toggle("mode-pq", q.pq);

    // tabs
    const tabs = $("tabs");
    tabs.replaceChildren();
    S.qs.forEach((x, i) => {
      const b = el("button", "tab" + (i === S.cur ? " on" : ""), x.name);
      b.append(el("span", "n", x.items.length));
      b.onclick = () => { S.cur = i; last = null; store.save(S); render(); }; // 切 tab 不算改动
      tabs.append(b);
    });
    const add = el("button", "tab ghost", "+ queue");
    add.onclick = () => {
      S.qs.push(Core.newQueue("queue " + (S.qs.length + 1)));
      S.cur = S.qs.length - 1; commit(); $("inp").focus();
    };
    tabs.append(add);

    $("mQ").classList.toggle("on", !q.pq);
    $("mPQ").classList.toggle("on", q.pq);
    $("info").textContent = q.items.length
      ? `${q.pq ? "pop → 最长的那条" : "pop → 最早进来的那条"} · size ${q.items.length}`
      : "空";
    $("pop").disabled = !q.items.length;
    $("del").hidden = S.qs.length < 2;

    // list
    const ol = $("list");
    ol.replaceChildren();
    const v = Core.order(q);
    if (!v.length) ol.append(el("li", "empty", "这个 queue 是空的，上面 push 一条想法。"));
    v.forEach((o, k) => {
      const li = el("li");
      li.append(
        el("span", "i", k === 0 ? (q.pq ? "top" : "front") : `[${k}]`),
        el("span", "t", o.t),
        el("span", "len", q.pq ? Core.len(o.t) : ""),
      );
      const x = el("button", "x", "×");
      x.setAttribute("aria-label", "删除");
      x.onclick = () => { Core.remove(q, o.i); commit(); };
      li.append(x);
      ol.append(li);
    });

    const showPop = last && last.qid === q.id;
    $("popped").hidden = !showPop;
    if (showPop) $("ptxt").textContent = last.t;
    renderCloud();
  }

  // ---- 云端 ----
  let cmsg = null; // { text, cls } 最近一次操作的结果
  function renderCloud() {
    const c = cloud.config.get();
    const st = $("cstat");
    st.className = "hint" + (cmsg ? " " + cmsg.cls : "");
    if (cmsg) st.textContent = cmsg.text;
    else if (!c.token) st.textContent = "云端：未连接";
    else if (!c.lastSync) st.textContent = "云端：已连接，还没同步过";
    else st.textContent = `上次同步 ${new Date(c.lastSync).toLocaleString()}` + (c.dirty ? " · 有未推送的改动" : "");
    $("cpush").disabled = $("cpull").disabled = !c.token || busy;
  }

  let busy = false;
  async function cloudOp(fn, okText) {
    busy = true; cmsg = { text: "同步中…", cls: "" }; renderCloud();
    try { await fn(); cmsg = { text: okText, cls: "ok" }; }
    catch (e) { cmsg = { text: "失败：" + e.message, cls: "err" }; }
    busy = false; render();
    setTimeout(() => { cmsg = null; renderCloud(); }, 4000);
  }

  $("cpush").onclick = () => cloudOp(async () => {
    await cloud.save(S);
    cloud.config.set({ dirty: false });
  }, "已推送到云端");

  // 拉取会覆盖本地：有未推送改动时要点两次
  let pullArm = false;
  $("cpull").onclick = () => {
    if (cloud.config.get().dirty && !pullArm) {
      pullArm = true; $("cpull").textContent = "会覆盖本地改动，再点一次";
      setTimeout(() => { pullArm = false; $("cpull").textContent = "拉取 ↓"; }, 3000);
      return;
    }
    pullArm = false; $("cpull").textContent = "拉取 ↓";
    cloudOp(async () => {
      S = await cloud.load(); last = null;
      await store.save(S);
      cloud.config.set({ dirty: false });
    }, "已从云端拉取");
  };

  $("cset").onclick = () => {
    const f = $("cform"); f.hidden = !f.hidden;
    const c = cloud.config.get();
    $("ctoken").value = c.token || ""; $("cgist").value = c.gistId || "";
  };
  $("cform").onsubmit = e => {
    e.preventDefault();
    cloud.config.set({ token: $("ctoken").value.trim(), gistId: $("cgist").value.trim() || undefined });
    $("cform").hidden = true; render();
  };
  $("cforget").onclick = () => {
    cloud.config.set({ token: undefined });
    $("ctoken").value = ""; render();
  };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tag === "button") e.type = "button";
    if (text !== undefined) e.textContent = text;
    return e;
  }

  $("f").onsubmit = e => {
    e.preventDefault();
    const t = $("inp").value.trim();
    if (!t) return;
    if (renaming) { Q().name = t; renaming = false; $("ren").textContent = "重命名"; }
    else Core.push(Q(), t);
    $("inp").value = ""; commit();
  };
  $("pop").onclick = () => {
    const p = Core.pop(Q());
    if (p) last = { qid: Q().id, ...p };
    commit();
  };
  $("undo").onclick = () => { if (last) { Core.restore(Q(), last); last = null; commit(); } };
  $("mQ").onclick = () => { Q().pq = false; commit(); };
  $("mPQ").onclick = () => { Q().pq = true; commit(); };

  let renaming = false;
  $("ren").onclick = () => {
    renaming = !renaming;
    $("ren").textContent = renaming ? "取消重命名" : "重命名";
    $("inp").value = renaming ? Q().name : "";
    $("inp").focus();
  };

  let delArm = false;
  $("del").onclick = () => {
    if (!delArm) {
      delArm = true; $("del").textContent = "再点一次确认删除";
      setTimeout(() => { delArm = false; $("del").textContent = "删除此 queue"; }, 2500);
      return;
    }
    S.qs.splice(S.cur, 1); S.cur = Math.max(0, S.cur - 1);
    delArm = false; $("del").textContent = "删除此 queue"; last = null; commit();
  };

  $("exp").onclick = () => FileIO.exportJSON(S);
  $("imp").onclick = () => $("file").click();
  $("file").onchange = async e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try {
      const s = await FileIO.importJSON(f);
      if (!s) throw 0;
      S = s; last = null; commit();
    } catch { $("info").textContent = "导入失败：不是 idea-queue 导出的 JSON"; }
  };

  render();
})();

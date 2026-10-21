// 存储层：UI 只认这个接口，不关心数据到底存在哪。
//
//   interface Store {
//     name: string
//     load(): Promise<State | null>
//     save(state): Promise<void>
//   }
//
// 两个方向：
//   LocalStore —— 浏览器 localStorage。只是本地修改器：
//                 编辑都先落在这里，可以导入/导出 JSON 文件。
//   CloudStore —— GitHub Gist 里的一个 JSON 文件，作为真正的存档。
//                 推送 = 本地覆盖云端，拉取 = 云端覆盖本地。

(function (g) {
  const KEY = "idea-queue-v1";
  const CFG_KEY = "idea-queue-cloud";      // { token, gistId, lastSync }
  const FILE = "idea-queue.json";
  const API = "https://api.github.com";

  const LocalStore = {
    name: "local",
    async load() {
      try { return Core.sanitize(JSON.parse(localStorage.getItem(KEY))); }
      catch { return null; }
    },
    async save(state) {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    },
  };

  // ---- 云端：GitHub Gist ----
  const cfg = {
    get() { try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch { return {}; } },
    set(patch) {
      const c = { ...cfg.get(), ...patch };
      try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch {}
      return c;
    },
  };

  async function gh(path, opts = {}) {
    const { token } = cfg.get();
    if (!token) throw new Error("还没填 GitHub token");
    const res = await fetch(API + path, {
      ...opts,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (res.status === 401) throw new Error("token 无效或已过期");
    if (res.status === 404) throw new Error("找不到这个 Gist（或 token 没有 gist 权限）");
    if (!res.ok) throw new Error(`GitHub 返回 ${res.status}`);
    return res.json();
  }

  // 没记住 gistId 时，在你的 gist 里找带 idea-queue.json 的那个（换设备时用）
  async function findGist() {
    const { gistId } = cfg.get();
    if (gistId) return gistId;
    const list = await gh("/gists?per_page=100");
    const hit = list.find(x => x.files && x.files[FILE]);
    if (hit) cfg.set({ gistId: hit.id });
    return hit ? hit.id : null;
  }

  const CloudStore = {
    name: "cloud",
    config: cfg,

    async load() {
      const id = await findGist();
      if (!id) throw new Error("云端还没有存档，先推送一次");
      const gist = await gh(`/gists/${id}`);
      const f = gist.files[FILE];
      if (!f) throw new Error(`这个 Gist 里没有 ${FILE}`);
      // 文件太大时 API 会截断，去 raw_url 拿完整内容
      const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
      const s = Core.sanitize(JSON.parse(text));
      if (!s) throw new Error("云端数据格式不对");
      cfg.set({ lastSync: Date.now() });
      return s;
    },

    async save(state) {
      const content = JSON.stringify(state, null, 2);
      const id = await findGist();
      if (id) {
        await gh(`/gists/${id}`, { method: "PATCH", body: JSON.stringify({ files: { [FILE]: { content } } }) });
      } else {
        const g2 = await gh("/gists", {
          method: "POST",
          body: JSON.stringify({ description: "Idea Queue 存档", public: false, files: { [FILE]: { content } } }),
        });
        cfg.set({ gistId: g2.id });
      }
      cfg.set({ lastSync: Date.now() });
    },
  };

  // JSON 文件导入/导出（本地修改器的进出口）
  const FileIO = {
    exportJSON(state) {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `idea-queue-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    async importJSON(file) {
      return Core.sanitize(JSON.parse(await file.text()));
    },
  };

  g.Stores = { local: LocalStore, cloud: CloudStore };
  g.FileIO = FileIO;
})(window);

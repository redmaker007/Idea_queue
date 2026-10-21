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
//   CloudStore —— 云端，作为真正的存档。还没实现，见 README。

(function (g) {
  const KEY = "idea-queue-v1";

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

  const CloudStore = {
    name: "cloud",
    async load() { throw new Error("云端存储还没接上"); },
    async save() { throw new Error("云端存储还没接上"); },
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

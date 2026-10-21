# Idea Queue

存学习和生活想法的小工具。纯 HTML/CSS/JS，没有依赖，不用构建，双击 `index.html` 就能用。

- 可以开多个 queue
- 默认是普通 queue（FIFO），每个 queue 可单独切成 PQ
- PQ 目前按 `size()` 取最大，长度相同按先进先出

## 结构

```
index.html       页面
style.css
js/core.js       纯数据逻辑（queue / PQ），不碰 DOM 和存储
js/storage.js    存储层接口 + 实现
js/app.js        UI
```

## 存储

UI 只通过一个 `Store` 接口读写：`load()` / `save(state)`。

| Store   | 状态   | 角色 |
|---------|--------|------|
| `local` | 已实现 | 浏览器 localStorage，作为本地修改器；可导入/导出 JSON |
| `cloud` | 已实现 | 私密 GitHub Gist 里的 `idea-queue.json`，作为云端存档 |

### 连接云端

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token，只勾 `gist`
2. 页面底部「设置」里粘贴 token，保存
3. 点「推送 ↑」：第一次会自动建一个私密 Gist
4. 换设备：同样填 token，点「拉取 ↓」，会自动找到那个 Gist

推送 = 本地覆盖云端，拉取 = 云端覆盖本地，不做合并。有没推送的改动时，拉取要点两次确认。
token 只存在当前浏览器的 localStorage 里，不会进仓库。Gist 的每次推送都有历史版本，误操作可以在 gist.github.com 上找回。

## 数据格式

```json
{
  "cur": 0,
  "qs": [
    { "id": "a1b2c3d", "name": "学习", "pq": false, "items": ["想法 1", "想法 2"] }
  ]
}
```

`items` 永远按入队顺序存，PQ 只是取出/展示时的排序，所以切回 queue 模式顺序不会乱。

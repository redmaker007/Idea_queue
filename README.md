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
| `cloud` | 未实现 | 云端存档，方案待定 |

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

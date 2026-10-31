## 一个博客，两个引擎

生产环境只跑 PostgreSQL。本地开发和 CI 跑 SQLite —— 因为它是一个文件，不需要服务、不需要端口、不需要清理。

代价很明确：所有查询必须同时能在两个引擎上跑通。

## 三层约束

| 层次 | 手段 | 拦截时机 |
| --- | --- | --- |
| 表结构 | 两份 Drizzle schema + `db:parity` | CI |
| 查询 | 只允许经过 `DbPort` 的 type-safe 构造器 | 代码评审 |
| 行为 | 同一批集成测试在两种引擎各跑一遍 | CI |

## 为什么不用 ORM 的自动方言切换

大多数 ORM 支持「一个 schema 映射多个方言」，但字段类型会偷偷漂移：SQLite 的 `BOOLEAN` 是 `0/1`，PG 是真 `boolean`；`BIGINT` 在 PG 里返回字符串，在 SQLite 里返回 number。

这类差异在开发环境永远不会暴露，上线才炸。显式写两份 schema，把差异压到 `parity` 里一次性可见，比事后排查便宜得多。

## 差异清单（必须显式处理）

- 布尔：SQLite `integer({ mode: 'boolean' })` ↔ PG `boolean`
- 大整数：PG `bigint mode: 'number'` 仍需 `Number()` 归一
- 大小写：SQLite `lower(x) like lower(?)` ↔ PG `x ilike ?`
- 时间：统一存 Unix 毫秒整数，DTO 层再转 ISO
- 聚合：PG `count()` 返回 string

## 代价核算

多写的代码大约 300 行（端口 + 两份 schema + parity + 迁移目录）。换来的是：

1. 新人 clone 后 `pnpm dev` 三分钟跑起来，不需要装 PG
2. CI 不需要 service container，构建快一倍
3. 测试可以并行建库，互不干扰

对单人维护的站点，这笔交易划算。如果团队有五个人同时改表结构，可能就不划算了。

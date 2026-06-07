# GEO投放助手 PostgreSQL 数据库生产化迭代方案

## 1. 背景

当前项目使用 Prisma + SQLite：

- Prisma schema：`prisma/schema.prisma`
- 当前 datasource：`provider = "sqlite"`
- 当前数据库文件：`prisma/dev.db`
- 当前启动流程会自动执行 `seedDatabase()` 与 `ensureRuntimeDefaults()`
- Dockerfile 当前写死 `DATABASE_URL=file:./dev.db`

SQLite 适合本地演示和轻量 POC，但不适合作为真实线上数据库。线上环境需要支持持久化、并发访问、备份恢复、迁移回滚、监控告警、多实例部署等能力，因此建议直接切换到 PostgreSQL。

## 2. 目标

本次迭代目标是将项目数据库从 SQLite 切换为 PostgreSQL，并建立基本的生产数据库工程规范。

主要目标：

1. Prisma datasource 改为 PostgreSQL。
2. 建立 Prisma migrations 迁移体系。
3. 本地、测试、生产统一使用 PostgreSQL。
4. Docker 不再内置 SQLite 数据库文件。
5. 拆分 demo seed 与生产初始化配置。
6. 保证现有业务功能可正常启动、读写和回归。

非目标：

1. 不做完整用户登录体系。
2. 不做复杂 RBAC 权限模型。
3. 不替换任务队列系统。
4. 不替换对象存储。
5. 不一次性改造所有 JSON 字段。
6. 不做历史数据清洗平台。

这些内容可作为后续生产化迭代继续推进。

## 3. 当前问题

### 3.1 SQLite 不适合线上

当前 Dockerfile 中存在：

```env
DATABASE_URL=file:./dev.db
```

这会导致：

1. 容器重建后数据容易丢失。
2. 多实例部署无法共享数据。
3. 备份恢复困难。
4. 并发写入能力有限。
5. 无法很好支撑后台运营、任务执行、发布排程等真实业务流量。

### 3.2 缺少 migrations

当前 package script 包含：

```json
"db:push": "prisma db push"
```

`db push` 适合开发阶段快速同步 schema，但不适合作为生产迁移方式。

生产环境应使用：

```bash
prisma migrate deploy
```

### 3.3 seed 与生产启动耦合

当前服务启动时会执行：

```ts
await seedDatabase();
await ensureRuntimeDefaults();
```

问题：

1. demo 数据可能进入生产库。
2. 启动过程承担过多数据库写入职责。
3. 生产环境初始化不可控。
4. 后续多实例启动时可能产生重复初始化风险。

### 3.4 schema 中存在大量字符串 JSON 字段

例如：

- `keywords`
- `competitors`
- `forbiddenWords`
- `platforms`
- `sourceMaterials`
- `targetQuestionsJson`
- `artifactsJson`
- `rawJson`

PostgreSQL 支持 JSON/JSONB，后续可以逐步从 `String` 改为 `Json` 类型。

本次先不强制全部改造，避免扩大风险。

## 4. 推荐数据库方案

推荐 PostgreSQL。

原因：

1. Prisma 支持成熟。
2. JSONB 能力强，适合内容、配置、Agent 输出、报告快照等数据。
3. 事务、索引、并发能力更适合线上。
4. 后续可支持全文检索、向量扩展、复杂统计。
5. 更适合平台型 SaaS、内容库、运营后台、任务系统。

不推荐继续 SQLite。SQLite 仅保留为历史开发方案，不建议继续作为主开发数据库。

MySQL 可用，但不是首选。本项目包含大量 JSON、配置、任务结果、内容分析、报表快照和运营统计数据，PostgreSQL 更适合后续演进。

## 5. 迭代范围

必做：

1. 修改 Prisma datasource 为 PostgreSQL。
2. 更新 `.env.example`。
3. 增加 PostgreSQL 本地开发配置。
4. 生成首个 migration。
5. 更新 package scripts。
6. 修改 Dockerfile 数据库配置。
7. 拆分 seed 策略。
8. 验证后端 API 正常启动。
9. 验证核心业务表可读写。
10. 编写迁移和部署说明。

可选：

1. 增加 `docker-compose.yml` 本地 PostgreSQL。
2. 增加 `db:studio` 脚本。
3. 增加 `db:reset` 脚本。
4. 增加基础索引优化。
5. 将部分明显 JSON 字符串字段改为 Prisma `Json`。

## 6. 实施步骤

## Phase 1：准备 PostgreSQL 环境

### 6.1 本地 PostgreSQL

推荐增加 `docker-compose.yml`：

```yaml
services:
  postgres:
    image: postgres:16
    container_name: geo-agent-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: geo_agent
      POSTGRES_PASSWORD: geo_agent_dev
      POSTGRES_DB: geo_agent_dev
    ports:
      - "5432:5432"
    volumes:
      - geo_agent_pgdata:/var/lib/postgresql/data

volumes:
  geo_agent_pgdata:
```

启动：

```bash
docker compose up -d postgres
```

### 6.2 更新 `.env.example`

```env
# Database
DATABASE_URL="postgresql://geo_agent:geo_agent_dev@localhost:5432/geo_agent_dev?schema=public"

# Demo seed
SEED_DEMO_DATA=false

# App
APP_URL="http://localhost:3000"
PORT=3000

# Hermes
HERMES_EXECUTOR=nous_hermes
HERMES_API_URL=http://127.0.0.1:8642
```

生产环境使用真实连接串：

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
```

## Phase 2：修改 Prisma schema

将 `prisma/schema.prisma` 中 datasource 从：

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

改为：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

建议保留 generator：

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

## Phase 3：建立 migration 体系

当前没有标准 migrations 目录，需要创建首个迁移。

开发环境执行：

```bash
npx prisma migrate dev --name init_postgresql
```

生成：

```text
prisma/migrations/
```

之后生产部署使用：

```bash
npx prisma migrate deploy
```

不建议生产继续使用：

```bash
npx prisma db push
```

## Phase 4：更新 package scripts

建议更新 `package.json`：

```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "tsx server/db/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset"
  }
}
```

保留或移除 `db:push` 均可。生产文档中必须明确：生产不使用 `db:push`。

## Phase 5：调整启动初始化逻辑

当前 `server.ts` 启动时执行：

```ts
await prisma.$connect();
await seedDatabase();
await ensureRuntimeDefaults();
```

建议改成：

```ts
await prisma.$connect();

if (process.env.SEED_DEMO_DATA === 'true') {
  await seedDatabase();
}

await ensureRuntimeDefaults();
```

新增环境变量：

```env
SEED_DEMO_DATA=false
```

本地开发可设：

```env
SEED_DEMO_DATA=true
```

生产环境应为：

```env
SEED_DEMO_DATA=false
```

## Phase 6：拆分 seed 与 runtime defaults

建议拆为两类。

demo seed 用于本地演示：

```ts
seedDatabase()
```

内容包括：

1. 默认品牌。
2. 演示服务商。
3. 演示订单。
4. 演示通知。
5. 演示市场任务。

runtime defaults 用于生产必要初始化：

```ts
ensureRuntimeDefaults()
```

内容包括：

1. 系统配置默认项。
2. skill route 默认项。
3. 必要平台配置。
4. 空库启动保护。

生产默认配置必须是幂等的。

## Phase 7：更新 Dockerfile

当前 Dockerfile 中：

```dockerfile
ENV DATABASE_URL=file:./dev.db
```

应删除。

建议改为：

```dockerfile
ENV NODE_ENV=production
ENV PORT=3456
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node
```

数据库连接串由部署平台注入：

```env
DATABASE_URL=postgresql://...
```

构建时仍执行：

```dockerfile
RUN npx prisma generate
```

容器启动前或发布流程中执行：

```bash
npx prisma migrate deploy
```

可选增加启动脚本：

```bash
npx prisma migrate deploy && node dist/server.cjs
```

更推荐在 CI/CD 发布阶段执行 migration，而不是应用容器启动时自动迁移。

## 7. 数据迁移策略

由于当前 SQLite 数据主要是 demo/开发数据，建议不做 SQLite 到 PostgreSQL 的复杂自动迁移。

推荐策略：

1. PostgreSQL 初始化空库。
2. 执行 Prisma migration。
3. 本地开发执行 demo seed。
4. 生产环境只执行 runtime defaults。
5. 如需保留 SQLite 中的业务数据，再单独写一次性迁移脚本。

如需迁移现有 SQLite 数据，可后续单独实现：

```text
scripts/migrate-sqlite-to-postgres.ts
```

迁移顺序建议：

1. Organization
2. Brand
3. Provider
4. TaskOrder
5. AgentTask
6. ContentBatch
7. ContentItem
8. PublishPlan
9. PublishJob
10. PublishRecord
11. SystemConfig

迁移完成后做 count 校验。本次不建议放入主迭代，避免拖慢切库。

## 8. 需要重点检查的 schema 风险

### 8.1 DateTime 默认值

当前大量字段使用：

```prisma
@default(now())
@updatedAt
```

PostgreSQL 支持，问题不大。

### 8.2 Float 金额字段

例如：

```prisma
budget Float
amount Float
balance Float
```

线上金额建议后续改为：

```prisma
Decimal
```

本次可暂不改，后续做财务精度专项。

### 8.3 JSON 字符串字段

当前大量字段为：

```prisma
String
```

但实际存 JSON。PostgreSQL 后续建议逐步改为：

```prisma
Json
```

本次可先保持 String，降低迁移风险。

优先改造候选：

1. `Brand.keywords`
2. `Brand.competitors`
3. `Brand.forbiddenWords`
4. `SystemConfig.value`
5. `GeoReport.rawJson`
6. `GeoReport.artifactsJson`
7. `AgentTask.input`
8. `AgentTask.output`

### 8.4 缺少索引

后续建议补充常用查询索引，例如：

```prisma
@@index([brandName, createdAt])
@@index([status, createdAt])
@@index([providerId, status])
@@index([platform, status])
```

优先模型：

1. `AgentTask`
2. `TaskOrder`
3. `PublishJob`
4. `PublishRecord`
5. `ProviderNotification`
6. `PublisherNotification`
7. `AuditLog`
8. `WebsiteRequest`
9. `WebsiteOrder`

## 9. 验收标准

### 9.1 本地验收

执行：

```bash
docker compose up -d postgres
npm install
npx prisma generate
npx prisma migrate dev --name init_postgresql
npm run db:seed
npm run dev
```

检查：

```bash
curl http://localhost:3000/api/health
```

预期：

```json
{
  "ok": true
}
```

### 9.2 功能验收

至少验证：

1. 首页/工作台可打开。
2. 品牌列表可读取。
3. 创建品牌可写入。
4. 订单列表可读取。
5. 服务商列表可读取。
6. AgentTask 可创建。
7. 发布计划可创建。
8. `/api/health` 返回正常。
9. 重启服务后数据仍然存在。

### 9.3 生产验收

生产环境验证：

```bash
npx prisma migrate deploy
npm run start
```

检查：

1. 不自动写入 demo 数据。
2. 数据库连接来自环境变量。
3. 容器内不存在业务 SQLite 依赖。
4. 多次启动不会重复生成 demo 数据。
5. 日志中无 Prisma 连接错误。
6. API health 正常。

## 10. 回滚方案

### 10.1 代码回滚

保留切换前分支。

如果切换失败，可回滚：

```bash
git revert <commit>
```

或部署上一版本镜像。

### 10.2 数据库回滚

PostgreSQL 生产库在 migration 前做快照备份。

云数据库建议开启：

1. 自动备份。
2. PITR。
3. 手动快照。

如果 migration 失败：

1. 停止新版本服务。
2. 恢复数据库快照。
3. 部署上一版本服务。
4. 排查 migration SQL。

### 10.3 SQLite 回退

短期内可保留旧 SQLite 配置用于本地回退，但不建议作为长期方案。

## 11. 建议提交拆分

### Commit 1：PostgreSQL 基础配置

- 修改 `prisma/schema.prisma`
- 更新 `.env.example`
- 增加 `docker-compose.yml`
- 更新 package scripts

### Commit 2：Prisma migration

- 增加 `prisma/migrations/init_postgresql`

### Commit 3：启动逻辑调整

- `server.ts` 增加 `SEED_DEMO_DATA` 控制
- 拆分 demo seed 与 runtime defaults

### Commit 4：Docker 生产化

- 删除 Dockerfile 中 SQLite DATABASE_URL
- 更新部署说明

### Commit 5：验证与文档

- 增加数据库切换说明
- 增加本地启动说明
- 增加生产部署说明

## 12. 推荐实施顺序

1. 新建切库分支。
2. 加本地 PostgreSQL docker-compose。
3. 修改 Prisma provider。
4. 生成首个 migration。
5. 跑通本地 seed。
6. 修改启动 seed 策略。
7. 修改 Dockerfile。
8. 跑完整 build/lint。
9. 手动验证核心 API。
10. 再考虑 JSON 字段和索引优化。

## 13. Cursor 执行提示

给 Cursor 的建议执行方式：

1. 严格按 Phase 1 到 Phase 7 顺序改动。
2. 先完成 PostgreSQL 切库最小闭环，再做索引和 JSON 字段优化。
3. 不要在同一轮里重构业务模型、权限系统、任务队列和文件存储。
4. 生产环境不允许自动执行 demo seed。
5. 每个 Phase 完成后运行 `npm run lint` 与数据库启动验证。
6. 遇到 Prisma 类型错误时，优先检查 provider 切换后的字段兼容性和 migration SQL。

## 14. 最终建议

本项目建议直接切 PostgreSQL，不再继续增强 SQLite。

SQLite 保留为历史开发遗留即可，后续主线环境统一：

```text
Local PostgreSQL
Staging PostgreSQL
Production PostgreSQL
```

这样可以避免“本地 SQLite 正常，线上 PostgreSQL 异常”的环境差异，也能为后续真实用户、真实订单、Agent 任务、发布排程、报表审计打好基础。

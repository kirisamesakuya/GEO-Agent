# PostgreSQL 数据库迁移与部署说明

本项目已从 SQLite 切换为 PostgreSQL。本地、测试、生产环境统一使用 PostgreSQL。

## 本地开发

### 1. 启动 PostgreSQL

```powershell
docker compose up -d postgres
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，确认：

```env
DATABASE_URL="postgresql://geo_agent:geo_agent_dev@localhost:5432/geo_agent_dev?schema=public"
SEED_DEMO_DATA=true
```

### 3. 安装依赖并迁移

```powershell
npm install
npm run db:generate
npm run db:migrate
```

首次迁移会提示输入 migration 名称，或使用：

```powershell
npx prisma migrate dev --name init_postgresql
```

### 4. 写入演示数据（可选）

```powershell
npm run db:seed
```

或在 `.env` 中设置 `SEED_DEMO_DATA=true` 后启动服务，启动时会自动 seed。

### 5. 启动服务

```powershell
npm run dev
```

验证：

```powershell
curl http://localhost:3000/api/health
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:migrate` | 开发环境创建/应用迁移 |
| `npm run db:deploy` | 生产环境应用迁移（不交互） |
| `npm run db:seed` | 写入演示数据 |
| `npm run db:studio` | 打开 Prisma Studio |
| `npm run db:reset` | 重置数据库并重新迁移 |

**注意：生产环境禁止使用 `prisma db push`。**

## 生产部署

### 环境变量

由部署平台注入，至少包含：

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
SEED_DEMO_DATA=false
NODE_ENV=production
PORT=3456
```

### 迁移时机

推荐在 CI/CD 发布阶段执行，而非应用容器启动时：

```powershell
npx prisma migrate deploy
```

### Docker 构建

Dockerfile 不再内置 SQLite 连接串。构建时执行 `prisma generate`；`DATABASE_URL` 由运行时注入。

发布流程建议：

1. 构建镜像
2. 执行 `prisma migrate deploy`（指向生产库）
3. 启动容器 `npm run start`

## Seed 策略

| 场景 | SEED_DEMO_DATA | 行为 |
|------|----------------|------|
| 本地开发 | `true` | 启动时写入演示品牌、服务商、订单等 |
| 生产 | `false` | 仅执行 `ensureRuntimeDefaults()`（系统配置、skill routes 等） |

`npm run db:seed` 可手动写入演示数据，不受 `SEED_DEMO_DATA` 影响。

## 回滚

- **代码**：回退到切换前分支或上一版本镜像
- **数据库**：迁移前对 PostgreSQL 做快照；失败时恢复快照并排查 migration SQL

## 历史 SQLite 数据

当前 demo 数据无需从 SQLite 迁移。如需保留旧 SQLite 业务数据，可后续实现 `scripts/migrate-sqlite-to-postgres.ts` 一次性脚本。

# GEO 投放助手（GEO-Agent）

本地开发与运行说明。  
**项目现状问答（含三端进度、本期范围、迭代索引）** → [`docs/GEO-Agent_项目现状问答.md`](docs/GEO-Agent_项目现状问答.md)（更新于 2026-06-06）

## 仓库版本说明（2026-06 新架构）

自 **2026-06** 起，`main` 为全新主线：PostgreSQL 迁移、Hermes 绑定收敛、内容交付信息架构、结果中心与后台生产化改造等。与 2026-06 之前的 Demo 版**不共享 Git 历史**（本地若曾 clone 旧仓库，不能直接 `git pull` 合并）。

| 引用 | 说明 |
|------|------|
| `main` | **当前最新版**，请以此为准开发 |
| `legacy-v0` | 重写前最后一版 Demo（三端早期实现），仅作对照或回查 |

### 老机器拉取全新代码

在**已有旧 clone** 的目录中，若你不需要保留本地未提交修改，直接对齐远程 `main`：

```powershell
cd D:\path\to\GEO-Agent
git fetch origin
git checkout main
git reset --hard origin/main
```

若 `git pull` 报 unrelated histories 或大量冲突，**不要**尝试 merge，用上方的 `reset --hard` 即可。

需要查看旧版代码时：

```powershell
git fetch origin
git checkout legacy-v0
```

回到最新开发线：

```powershell
git checkout main
git reset --hard origin/main
```

**全新 clone**（推荐新环境使用）：

```powershell
git clone https://github.com/kirisamesakuya/GEO-Agent.git
cd GEO-Agent
npm install
```

拉下新代码后，请按下方 **Run Locally** 与 [`docs/PostgreSQL数据库迁移与部署说明.md`](docs/PostgreSQL数据库迁移与部署说明.md) 配置数据库与环境变量（与旧版 SQLite / 旧 schema 不兼容）。

## Demo 与生产边界

本项目是早期 Demo 版，页面结构和用户流程可参考，但以下逻辑**不可直接用于生产**：

- Demo 数据、localStorage 角色切换、前端传 `providerId` / `brandName` / `X-Platform-Role`
- 本地 `uploads/` 文件存储、模拟余额/充值/AI 点数、演示结算提现
- 进程内 `setInterval` 任务调度

真实用户、权限、计费、结算、租户隔离须接入公司线上系统。代码中带 `DEMO_ONLY` / `PRODUCTION_TODO` 注释处为明确替换点。

相关文档：

- [`docs/GEO投放助手_Demo研发与AI改造约束文档.md`](docs/GEO投放助手_Demo研发与AI改造约束文档.md)
- [`docs/GEO投放助手_后台逻辑生产化改造文档.md`](docs/GEO投放助手_后台逻辑生产化改造文档.md)

**产品 PRD（v2.0 定稿）不在本 Git 远程仓库**，仅本地维护并通过 zip 离线分发；详见 [`docs/PRD_分发说明.md`](docs/PRD_分发说明.md)。

### 认证与数据

| 变量 | 说明 |
|------|------|
| `SEED_DEMO_DATA=true` | 本地写入演示品牌/订单/服务商（生产必须为 `false`） |
| `AUTH_MODE=demo` | 默认；从请求参数推断三端身份，兼容现有前端 |
| `AUTH_MODE=session` | 生产模式；须登录 Cookie，身份来自 `User` / `Session` 表 |

生产化 P0 已落地：`User` / `Session` / `ProviderUser` / `PlatformUserRole` 模型、请求上下文中间件、`GET /api/provider/me`、`GET /api/publisher/me`、`GET /api/auth/me`；商家端预算/AI 点数/通知/发单、接单端全部 API、平台端统一角色门禁已接入 scope 校验。第二轮已覆盖关键词/知识库/素材/收录/发布/内容库/Agent 任务/GEO 报告/网页需求/广告账号等商家端 API，以及平台端细粒度 permission 校验。第三轮已覆盖 onboarding、Hermes 商家端接口、GEO 售前分析 prospect 边界与公开分享说明。

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. 当前业务 AI/Hermes 链路为 Mock 模式，不需要配置 MiniMax 即可生成、改写和发布：
   - Mock 模式不会调用 MiniMax，也不会消耗真实 AI 生成额度
   - 如需单独验收 MiniMax 连通性，可复制 `config/minimax.example.json` → `config/minimax.local.json`
   - 在 `apiKey` 字段填入你的 MiniMax API Key（该文件已 gitignore，不会提交）
3. Run the app:
   `npm run dev`

可选：验收 MiniMax 连通性：

```bash
node scripts/minimax-smoke.mjs
```

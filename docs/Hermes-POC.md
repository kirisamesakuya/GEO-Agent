# Hermes Agent 接入说明（macOS 开发环境）

> 仓库：`external/hermes-agent`  
> Commit：`64202200a6043b685750e16107067971446f8818`  
> 日期：2026-06-03

## 1. 拉取仓库

```bash
cd /Users/feihong/Documents/geo-投放助手
mkdir -p external
git clone --depth 1 https://github.com/NousResearch/hermes-agent.git external/hermes-agent
cd external/hermes-agent && git rev-parse HEAD
```

## 2. macOS 安装 Hermes（官方一键脚本）

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
source ~/.zshrc
hermes doctor
```

或使用开发者模式：

```bash
cd external/hermes-agent
./setup-hermes.sh
./hermes doctor
```

## 3. 配置模型与 API Server

```bash
hermes setup                    # 配置 OpenRouter / Nous Portal 等（与本项目内置 AI 无关）
hermes config set API_SERVER_ENABLED true
hermes config set API_SERVER_KEY your-secret-key
hermes config set API_SERVER_PORT 8642
hermes gateway start            # 启动 gateway + API Server
```

验证：

```bash
curl -s http://127.0.0.1:8642/health
```

## 4. GEO 投放助手对接

在项目根目录 `.env` 中配置：

```env
# 内置 Agent 执行器使用 MiniMax：config/minimax.local.json（见 config/minimax.example.json）
HERMES_EXECUTOR=nous_hermes             # 可选：切换为 Hermes 执行器
HERMES_API_URL=http://127.0.0.1:8642
HERMES_API_KEY=your-secret-key          # 与 API_SERVER_KEY 一致
HERMES_AGENT_COMMIT=64202200a6043b685750e16107067971446f8818
```

- 未配置 `HERMES_API_URL` 时，使用 `DirectModelExecutor`（MiniMax API）。
- 配置后使用 `NousHermesExecutor`，通过 `/v1/runs` 提交并轮询状态。
- 业务状态始终由本项目 `AgentTask` 表管理，Hermes 仅作为外部执行适配器。

## 5. 架构边界（PRD 11.3）

| 职责 | 负责方 |
|---|---|
| AgentTask 状态机、业务落库 | GEO 投放助手后端 |
| 文章/分析/计划生成 | DirectModelExecutor 或 NousHermesExecutor |
| 任务队列与轮询 | Express + Prisma SQLite |
| Hermes Gateway/API | NousResearch/hermes-agent |

## 6. POC 验收清单

运行一键脚本（需应用已启动 `npm run dev`）：

```bash
chmod +x scripts/hermes-smoke.sh
./scripts/hermes-smoke.sh
```

- [ ] `hermes doctor` 通过（需本机安装 Hermes CLI，见 §2）
- [ ] `curl http://127.0.0.1:8642/health` 返回正常（需 gateway 运行）
- [x] 发布端提交文章任务后在 Agent 任务页可见（DirectModelExecutor 默认路径已验证）
- [x] 任务状态从「已入队」→「执行中」→「已完成」（AgentTask 状态机 + Worker 轮询）
- [x] `/api/hermes/health` 显示 Hermes 连接状态（未配置时返回未连接，属预期）
- [x] `resolveExecutorKindForTask`：配置 `HERMES_API_URL` 或 `skill_routes` 中 `executor: nous_hermes` 时走 Gateway

> **2026-06-03 备注**：本机未安装 `hermes` CLI 时 Gateway 项保持未勾选，属预期。配置 `.env` 中 `HERMES_API_URL` + 可选 `HERMES_EXECUTOR=nous_hermes` 后重启服务即可切换执行器；开发默认 `DirectModelExecutor`（MiniMax）。

## 7. 已知风险

- 中文 README 与英文 README 对 Windows 原生支持描述不一致，macOS 以官方 install.sh 为准。
- Hermes 不提供本项目业务队列回调，需自建适配层（已实现 `NousHermesExecutor`）。

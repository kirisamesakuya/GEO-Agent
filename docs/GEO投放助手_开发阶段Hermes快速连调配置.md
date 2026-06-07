# 开发阶段 · Hermes 快速连调配置（最少步骤）

> **用途**：换电脑 / 新同事入项，**最少操作**让 Web 端（GEO-Agent）与本机 Hermes **链路打通**。  
> **不包含**：一键开启 API Server、安装目录选择等产品功能（见 [`GEO投放助手_Hermes本机对接最佳方案与本期连调范围.md`](./GEO投放助手_Hermes本机对接最佳方案与本期连调范围.md)）。  
> **更新**：2026-06-06

---

## 1. 你要达成什么

| 层级 | 含义 | 最少条件 |
|------|------|----------|
| **L1 链路通** | Web 检测到 Hermes，8642 可访问 | 本文 §2–§4 |
| **L2 任务通** | 提交 GEO 任务能进 Hermes 跑 Skill | L1 + §5 |
| **L3 结果通** | 任务 succeeded，报告落库 | L2 + Skill 输出 JSON 合规 |

**开发连调先做 L1 → L2**；L3 属于 Skill 对接迭代。

---

## 2. Hermes 侧：只配 1 项（+ 1 次重启）

> 安装目录（如 `D:\Hermes`）**不用配**；配置在数据目录 `%LOCALAPPDATA%\hermes`。

### 2.1 必做

1. **打开**「汇智爱马仕助手」，保持 **Gateway 运行**（托盘/客户端内可见）。
2. **开启 API Server**，二选一：

**方式 A · 改一行 `.env`（最快，推荐开发机）**

文件：`%LOCALAPPDATA%\hermes\.env`（没有就新建）

```env
API_SERVER_ENABLED=true
```

**方式 B · 客户端 UI**

设置 → **Platforms → API Server** → `enabled = true`，端口 **8642** → 保存。

3. **重启 Gateway**（Hermes 客户端内「重启 Gateway」，或关掉客户端再开）。

### 2.2 开发机可不配

| 项 | 说明 |
|----|------|
| `API_SERVER_KEY` | 仅监听 `127.0.0.1` 时可省略 |
| `API_SERVER_PORT` | 默认 8642，不用改 |
| 绑定 GEO / 绑定码 | 连调 **不需要**（mock `/api/hermes/bind-confirm` 已移除，仅保留真实 `/api/hermes-local/bind-confirm`） |
| 选安装目录 | **不需要** |
| `config.yaml` 手改 platforms | 有 `.env` 一行即可，Gateway 启动时会合并 |

### 2.3 Hermes 侧验收（10 秒）

PowerShell：

```powershell
Invoke-RestMethod http://127.0.0.1:9120/api/status | Select-Object version, gateway_running, gateway_health_url
Invoke-RestMethod http://127.0.0.1:8642/health
```

| 检查点 | 通过标准 |
|--------|----------|
| 9120 | `gateway_running: True` |
| 8642 | 不报错；`gateway_health_url` 最好非空（9120 里） |

---

## 3. GEO-Agent 侧：只配 3 行

项目根目录 `.env`（从 `.env.example` 复制）：

```env
DATABASE_URL="file:./dev.db"
HERMES_EXECUTOR=nous_hermes
HERMES_API_URL=http://127.0.0.1:8642
```

| 变量 | 是否必填 | 说明 |
|------|----------|------|
| `DATABASE_URL` | 是 | 启动 Prisma |
| `HERMES_EXECUTOR=nous_hermes` | **是** | 不配则任务走 Mock/直连模型，**不会调 Hermes** |
| `HERMES_API_URL` | 建议写 | 默认已是 `127.0.0.1:8642` |
| `HERMES_API_KEY` | 否 | 仅当 Hermes 设了 `API_SERVER_KEY` 时两边填同一值 |

首次启动：

```powershell
cd D:\GEO-Agent
npm install
npm run db:push
npm run dev
```

---

## 4. 链路验收（L1）

浏览器或 PowerShell：

```powershell
Invoke-RestMethod http://localhost:3000/api/hermes/health
```

**通过**：`apiGatewayOk: true`（或 `mode: api_gateway`）。

Web 端：首启页 / 顶栏 Hermes 指示器为 **已连接**（绿色）。

也可跑项目脚本：

```powershell
node scripts/minimax-smoke.mjs
# 或（Git Bash）
# bash scripts/hermes-smoke.sh
```

---

## 5. 跑 Skill 的额外前提（L2，仍不在 GEO 配）

链路通 ≠ 任务一定成功。Hermes 执行 GEO Skill 还需要：

| 项 | 在哪里 | 开发机通常 |
|----|--------|------------|
| GEO Skills 文件 | `%LOCALAPPDATA%\hermes\skills\geo\*\SKILL.md` | 随 Hermes 安装已有 |
| 模型 / 词元 | Hermes 客户端模型设置或 `.env` 里 `AGENTSYUN_API_KEY` 等 | 你已配则可跑 |
| Skill 路由 | GEO 数据库 `skill_routes` | **seed 已写好**，无需手配 |

**建议首条验收任务**：发布端 → GEO 快速检测 → 提交 `geo-quick-start`。

通过标准：Agent 任务详情有 `externalRunId`，状态 `running` → `succeeded`（或 Hermes 内可见 run）。

---

## 6. 配置对照表（一张表记全）

```
┌─────────────────────────────────────────────────────────────┐
│ Hermes（用户只做这些）                                        │
├─────────────────────────────────────────────────────────────┤
│ ① 打开客户端 + Gateway 运行                                   │
│ ② %LOCALAPPDATA%\hermes\.env → API_SERVER_ENABLED=true      │
│ ③ 重启 Gateway                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ 8642
┌─────────────────────────────────────────────────────────────┐
│ GEO-Agent .env                                               │
├─────────────────────────────────────────────────────────────┤
│ DATABASE_URL="file:./dev.db"                                 │
│ HERMES_EXECUTOR=nous_hermes                                  │
│ HERMES_API_URL=http://127.0.0.1:8642                         │
└─────────────────────────────────────────────────────────────┘
```

**不需要两边都配 API Key**（本机 loopback 开发）。

---

## 7. 故障 30 秒定位

| 现象 | 缺什么 | 补什么 |
|------|--------|--------|
| `gateway_health_url: null` | Hermes API Server 未开 | §2.1 一行 `.env` + 重启 Gateway |
| 8642 连接失败 | Gateway 未重启或未开 | §2.1 第 3 步 |
| GEO health 仍 offline | GEO 未用 Hermes 执行器 | §3 `HERMES_EXECUTOR=nous_hermes` 后 **重启 npm run dev** |
| 检测绿但任务 failed | 8642 通但 Skill/模型问题 | 看 Hermes 日志；查 skills 目录与模型 Key |
| `DATABASE_URL` 报错 | GEO 缺 `.env` | 复制 `.env.example` → `.env` |

---

## 8. 与完整方案的关系

| 文档 | 内容 |
|------|------|
| **本文** | 开发最少步骤，能连上就能调接口 |
| [`Hermes-POC.md`](./Hermes-POC.md) | CLI / commit / smoke 细节 |
| [`GEO-SKILL-INPUT-MAPPING.md`](./GEO-SKILL-INPUT-MAPPING.md) | Skill 入参对照 |
| [`GEO投放助手_Hermes本机对接最佳方案与本期连调范围.md`](./GEO投放助手_Hermes本机对接最佳方案与本期连调范围.md) | 产品化、Partner API、Pull 模式 |

---

## 9. 复制即用 · Hermes `.env` 最小片段

```env
# 仅此一行即可让 GEO 连上 8642（开发 loopback）
API_SERVER_ENABLED=true
```

## 10. 复制即用 · GEO `.env` 最小片段

```env
DATABASE_URL="file:./dev.db"
APP_URL="http://localhost:3000"
HERMES_EXECUTOR=nous_hermes
HERMES_API_URL=http://127.0.0.1:8642
```

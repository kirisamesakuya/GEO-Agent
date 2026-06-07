# GEO 投放助手 / GEO-Agent 项目现状问答

> **文档版本**：v1.0  
> **汇总时间**：2026-06-06（UTC+8）  
> **代码路径**：`/Users/feihong/Documents/geo-投放助手`  
> **远程仓库**：[kirisamesakuya/GEO-Agent](https://github.com/kirisamesakuya/GEO-Agent)  
> **说明**：本文以问答形式记录截至汇总日的项目定位、架构、已完成能力与本期刻意收敛范围，供协作与后续迭代对齐。

---

## 一、项目是什么？

### Q1. GEO 投放助手解决什么问题？

面向 **GEO（Generative Engine Optimization）投放** 的全链路产品：商家在 **发布端** 做品牌资料、GEO 分析、AI 写文、内容库与订单发单；**接单方** 在任务大厅认领并交付；**平台端** 做商家/订单/Agent/资金等运营监管。发布执行依赖本机 **Hermes** 执行器与商家自行管理的发布账号，而非平台强制绑定账号。

### Q2. 与 GitHub 仓库 GEO-Agent 的关系？

本地工程即 GEO-Agent 的实现载体。仓库用于归档代码与项目状态文档；Hermes 本体在 `external/hermes-agent/`（已 gitignore，需单独 clone）。

### Q3. 当前运行形态？

- 单体应用：`npm run dev` → Vite 前端 + Express API（`tsx server.ts`），默认 `http://localhost:3000`
- 三端入口：`/` 发布端、`/?app=provider` 接单端、`/?app=platform` 平台端
- 数据：SQLite + Prisma（`prisma/dev.db`）
- **AI / Hermes 主链路当前为 Mock**，可本地演示全流程，不依赖真实 MiniMax / Hermes 即可跑通

---

## 二、三端分别做到哪了？

### Q4. 发布端（Publisher）核心能力？

| 模块 | 状态 | 要点 |
|------|------|------|
| 工作台 / 品牌管理 | ✅ | 品牌、关键词、知识库、素材 |
| GEO 分析 | ✅ | 快速检测 / 专业审计 / 资产生成 / 报告历史（四 Tab） |
| 排名监控 | ✅ | 计划、采样、趋势 |
| 内容库 & 项目化排程 | ✅ | 多平台批次、Hermes 模拟发布 |
| AI 写文章 | ✅ | 多来源生成；右侧状态/预览侧栏 |
| 发起订单 / 订单交付 | ✅ | 任务包、网站订单、发布记录 |
| 发布账号（本机） | ✅ | Hermes 执行器区块、登录检测、账号管理 |
| 消息通知 | ✅ | 真实站内信（Agent/订单/发布账号等事件） |
| 账户余额 / 算力 | ✅ | 预算、充值、冻结 |

### Q5. 接单端（Provider）核心能力？

| 模块 | 状态 | 要点 |
|------|------|------|
| 入驻 / 个人中心 | ✅ | 选平台与地区、提交审核 |
| 任务大厅 / 我的订单 | ✅ | 认领、草稿、审稿、交付、返修 |
| 账号资源 | ✅ | 自选可接单平台与报价；**本期不要求提交案例** |
| 收益 / 消息 / 网站订单 | ✅ | 演示数据 + 基础流程 |

### Q6. 平台端（Platform）核心能力？

| 模块 | 状态 | 要点 |
|------|------|------|
| 平台驾驶舱 | ✅ | KPI、漏斗、风险热力、待办 |
| 商家 / 组织认证 | ✅ | 列表 + 详情抽屉 |
| 订单监管 / 接单申请 / 网站订单 | ✅ | 派单、改派、申请确认 |
| Agent 监控 / Hermes | ✅ | 任务列表、Skill 运行、自动化记录 |
| 内容与发布监管 | ✅ | 发布记录、失败重试入口（Mock） |
| 排名监控运营 | ✅ | 跨品牌计划视图 |
| 风险与争议中心 | ✅ | 聚合订单/Agent/资金/充值工单 |
| 资金算力 / 结算 / 报表 | ✅ | 充值审核、结算批次、运营报表 |
| 角色权限 / 配置 / 审计 | ✅ | 演示级 RBAC、配置版本、审计日志 |

---

## 三、本期刻意不做 / 前端隐藏的能力

### Q7. 平台端为什么看不到「发布账号运营」？

**本期产品决策**：平台不运营、不审核商家本机发布账号；账号绑定与 Hermes 登录均在 **发布端** 完成。

- 已移除侧栏「发布账号运营中心」及对应页面
- 已下线 `/api/platform/publish-accounts` 等平台侧 API
- 风险中心 **不再聚合**「发布账号 / 未绑定」类 Mock 工单（`refType=account` 已过滤）

开关：`src/apps/platform/platform-feature-flags.ts` → `PLATFORM_PUBLISH_ACCOUNT_OPS_ENABLED = false`

### Q8. 「可接单平台审核」和「履约评级中心」为什么隐藏？

接单方尚少，本期只需 **自行勾选可接单平台** 即可参与匹配，不做真实账号资质核验与履约评级。

- 侧栏已通过 `PLATFORM_DEFERRED_VIEWS` 隐藏
- 后端接口与页面代码 **保留**，待规模成熟后打开开关即可

相关文件：

- `src/apps/platform/platform-feature-flags.ts`
- `src/apps/platform/views/PlatformResourceReviewView.tsx`（可接单平台审核）
- `src/apps/platform/views/PlatformFulfillmentRatingView.tsx`（履约评级）

### Q9. 接单方还需要提交案例吗？

**不需要。** `PROVIDER_CASE_SUBMISSION_ENABLED = false`（`src/apps/provider/provider-feature-flags.ts`），账号资源页已隐藏案例链接与案例素材区块。

---

## 四、技术架构速览

### Q10. 技术栈？

| 层 | 选型 |
|----|------|
| 前端 | React 19 + Vite 6 + Tailwind 4 + Lucide |
| 后端 | Express + tsx 直跑 TypeScript |
| 数据库 | Prisma 5 + SQLite |
| Agent | 自研 Worker + Skill 路由；Hermes 连调预留 |
| 图表 | Recharts（平台驾驶舱） |

### Q11. 关键目录？

```text
src/                    # 发布端组件 + apps/platform + apps/provider
server/                 # API 路由、Service、Agent Worker、DB seed
prisma/schema.prisma    # 数据模型
docs/                   # PRD、线框图、迭代方案（20+ 篇）
config/                 # platform-auth、MiniMax 示例配置
external/hermes-agent/  # Hermes 源码（gitignore，本地 submodule/clone）
```

### Q12. 常用命令？

```bash
npm install
npm run db:push      # 同步 schema
npm run db:seed      # 种子数据（云杉口腔等）
npm run dev          # 开发 http://localhost:3000
npm run build        # 生产构建
```

演示品牌默认：**云杉口腔**；演示接单方：**晨光传媒、蓝海内容、北辰工作室**。

---

## 五、近期已完成的重要迭代（2026-06 上旬）

### Q13. 最近两周主要改了什么？

1. **发布端**
   - 信息架构优化（工作台、内容库、订单合并等）
   - GEO 分析四 Tab + Hermes 执行器 UI
   - 发布端真实站内通知（`PublisherNotification`）
   - 内容库/写文章发布账号联动、表格样式统一

2. **平台端**
   - 驾驶舱可视化、独立运营页面（内容监管、风险中心、报表等）
   - 平台表格主题（浅灰表头 `platform-table`）
   - 移除发布账号运营；风险工单去 Mock
   - 可接单平台审核 / 履约评级 **代码就绪但前端隐藏**

3. **接单端**
   - 订单状态细化（写作中、待发布方审稿等）
   - 账号资源简化（无案例要求）

4. **数据 / Demo**
   - 平台演示：待审组织认证、接单申请、可接单平台审核样例（v2）
   - 发布端演示通知 6 条

---

## 六、已知限制与下一步

### Q14. 当前主要限制？

| 项 | 说明 |
|----|------|
| AI / Hermes | Mock 执行器，未接生产 Hermes API |
| 平台发布账号 | 不监管商家本机账号 |
| 可接单平台审核 | 前端隐藏，未与任务大厅 `approved` 强绑定 |
| 履约评级 | 前端隐藏，无真实评分模型 |
| 平台 RBAC | 演示角色切换，非真实登录体系 |
| `external/hermes-agent` | 未纳入 git，需本地准备 |

### Q15. 建议的后续优先级（P0 → P1）？

1. **Hermes 真连调**：执行器心跳、Skill 安装、发布链路实跑（见 `docs/GEO投放助手_Hermes连调前Web端功能补齐迭代计划.md`）
2. **任务大厅与平台审核联动**：仅 `reviewStatus=approved` 的平台可见任务（审核功能开启后）
3. **平台端登录与真实 RBAC**
4. **接单方规模上来后**：打开可接单平台审核、履约评级
5. **GEO 报告 ↔ 排名监控 ↔ 写文章** 效果验证闭环（见对应小迭代方案）

### Q16. 重要文档索引？

| 文档 | 用途 |
|------|------|
| `docs/GEO投放助手_三端功能盘点与平台端全量线框图.md` | 三端盘点 + 平台线框 |
| `docs/GEO投放助手_发布端信息架构优化方案.md` | 发布端 IA |
| `docs/GEO投放助手_Hermes连调前Web端功能补齐迭代计划.md` | Hermes P0 清单 |
| `docs/GEO投放助手_本机发布账号管理迭代计划.md` | 发布账号产品定义 |
| `docs/GEO投放助手_平台端设计规范_v1.0.md` | 平台 UI 规范 |
| `README.md` | 本地启动说明 |

---

## 七、给新同学的三个问题

### Q17. 我想本地看一眼三端，最少步骤？

```bash
git clone https://github.com/kirisamesakuya/GEO-Agent.git
cd GEO-Agent
npm install
npm run db:push && npm run db:seed
npm run dev
```

浏览器打开：`http://localhost:3000/?app=platform`（平台）、`/?app=provider`（接单）、`/`（发布）。

### Q18. 功能开关在哪里改？

| 开关 | 文件 |
|------|------|
| 平台端隐藏页面 | `src/apps/platform/platform-feature-flags.ts` |
| 接单方案例提交 | `src/apps/provider/provider-feature-flags.ts` |

### Q19. 本文之后如何更新？

建议在每次大迭代合并前更新本文 **「汇总时间」** 与 **第五节 / 第六节**，保持与 `PLATFORM_DEFERRED_VIEWS`、Mock 范围一致。

---

*文档结束 · 生成于 2026-06-06*

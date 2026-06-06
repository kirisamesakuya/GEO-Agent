# GEO 投放助手：平台端设计规范 v1.0

版本：v1.0  
日期：2026-06-05  
适用范围：平台端后台全部页面  
参考方向：字节系 B 端产品、Semi Design 设计语言、当前平台驾驶舱视觉稿

---

## 1. 设计目标

平台端是运营、审核、客服、财务、管理员长期使用的工作后台，不做营销感，不做大屏炫技，不做高饱和色块堆叠。

目标体验：

1. 首屏判断快：3 秒内能看出平台健康度、待处理风险、业务流转状态。
2. 页面克制：白底、浅灰背景、弱边框、清晰层级，不使用大面积色块分割。
3. 信息可扫：关键指标可视化，明细进入二级页面或抽屉。
4. 操作可靠：所有敏感操作有确认、原因、审计记录。
5. 可组件化：后续所有页面按统一 token、组件、布局模板开发。

---

## 2. 推荐组件库

### 2.1 推荐采用 Semi Design

Semi Design 是抖音前端与 UED 团队维护的现代设计系统，提供 React UI 组件、设计语言、设计 token、Figma 组件资源，可作为本项目平台端改造的主要参考与组件来源。

推荐原因：

| 能力 | 对本项目的价值 |
| --- | --- |
| B 端组件完整 | 表格、表单、筛选、弹窗、抽屉、导航、标签、通知等后台常用组件可直接复用 |
| 设计语言接近字节系 | 更贴近用户要求的字节后台风格 |
| Token 体系完整 | 方便统一颜色、字号、间距、圆角、阴影 |
| Figma / 代码协同 | 后续可把视觉稿、组件库、开发实现对齐 |
| 国际化能力成熟 | 后续如果平台扩展多语言，迁移成本较低 |

### 2.2 接入建议

当前项目使用 React 19。Semi Design 官方 React 组件包需要先做兼容验证，再决定是直接引入还是先参考其设计 token 自建轻量组件。

建议两步走：

1. **短期：不大规模替换组件库。** 先按本规范改造现有页面，使用 Tailwind/CSS 实现统一视觉，避免一次性引入过大风险。
2. **中期：试点引入 Semi。** 选择筛选器、表格、抽屉、弹窗、选择器这类高复用组件做兼容验证。

推荐依赖：

```bash
npm install @douyinfe/semi-ui @douyinfe/semi-icons
```

试点入口：

```tsx
import { Button, Table, Select, Tag, Modal, Drawer, Input, DatePicker } from '@douyinfe/semi-ui';
import { IconSearch, IconBell, IconHome } from '@douyinfe/semi-icons';
import '@douyinfe/semi-ui/dist/css/semi.min.css';
```

如果 React 19 兼容性不稳定，则采用“设计 token + 自研业务组件”的方式，不强行替换。

---

## 3. 视觉原则

### 3.1 允许

| 类型 | 规则 |
| --- | --- |
| 页面背景 | 使用极浅灰 `#F6F8FB` 或 `#F7F8FA` |
| 内容容器 | 白色卡片，1px 浅边框，弱阴影 |
| 状态表达 | 图标、浅色底、文字色、Tag、点状标记 |
| 强调色 | 蓝色作为主操作与选中态 |
| 风险色 | 红/橙只用于数字、图标、Tag、局部提示 |
| 图表 | 低饱和蓝、绿、橙、红，避免霓虹和渐变堆叠 |

### 3.2 禁止

| 禁止项 | 原因 | 替代方案 |
| --- | --- | --- |
| 粗色条分割线 | 会让后台像告警墙，视觉噪音大 | 用浅色边框、图标底、数字色、Tag |
| 大面积状态色块 | 信息密度高时会压迫 | 状态色只占局部 5%-15% 面积 |
| 卡片左侧粗色边 | 分割过强，破坏字节系克制感 | 卡片统一浅边框，状态放在图标/Tag |
| 高饱和渐变背景 | 不适合运营后台 | 使用白底和浅灰分区 |
| 装饰性光斑/圆球 | 降低专业感 | 用真实图表和数据组件 |
| 多层卡片套卡片 | 层级混乱 | 页面分区 + 单层卡片 |

---

## 4. Design Tokens

### 4.1 颜色

```css
:root {
  --platform-bg: #f6f8fb;
  --platform-surface: #ffffff;
  --platform-surface-subtle: #f9fafc;

  --platform-border: #e5eaf3;
  --platform-border-subtle: #eef2f7;
  --platform-border-hover: #9dbdff;

  --platform-text-title: #111827;
  --platform-text-primary: #1f2937;
  --platform-text-secondary: #46546b;
  --platform-text-tertiary: #8a94a6;
  --platform-text-placeholder: #98a2b3;

  --platform-primary: #1f6fff;
  --platform-primary-hover: #155eef;
  --platform-primary-bg: #eaf2ff;

  --platform-success: #12b76a;
  --platform-success-bg: #e7f8f0;

  --platform-warning: #f79009;
  --platform-warning-bg: #fff4e5;

  --platform-danger: #f04438;
  --platform-danger-bg: #fff1f0;

  --platform-info: #2f7df6;
  --platform-info-bg: #f3f8ff;
}
```

### 4.2 字号

| 场景 | 字号 | 字重 | 说明 |
| --- | --- | --- | --- |
| 页面标题 | 24px | 700 | 顶栏左侧标题 |
| 分区标题 | 16px | 700 | 卡片标题、模块标题 |
| 卡片标题 | 14px | 600 | KPI 名称、列表标题 |
| 正文 | 14px | 400/500 | 表格、表单、描述 |
| 辅助信息 | 12px | 400 | 时间、说明、趋势 |
| 微型标签 | 11px-12px | 500/600 | Tag、状态 |
| KPI 数字 | 28px-32px | 700 | 驾驶舱核心数字 |

### 4.3 间距

| Token | 值 | 用途 |
| --- | --- | --- |
| `space-1` | 4px | 图标与文字的最小间距 |
| `space-2` | 8px | 表单内小间距 |
| `space-3` | 12px | 按钮、Tag、列表项 |
| `space-4` | 16px | 卡片内部基础间距 |
| `space-5` | 20px | 卡片较宽 padding |
| `space-6` | 24px | 页面内容区 padding |
| `space-7` | 28px | 顶栏横向 padding |

### 4.4 圆角与阴影

| 场景 | 圆角 | 阴影 |
| --- | --- | --- |
| 页面卡片 | 8px | `0 8px 26px rgba(15, 23, 42, 0.04)` |
| 按钮/输入框 | 6px | 无 |
| 图标底 | 10px 或圆形 | 轻微阴影可选 |
| Tag | 4px-6px | 无 |
| 抽屉/弹窗 | 8px | 系统浮层阴影 |

规则：卡片圆角不得超过 8px，除非是头像、圆形图标或图表节点。

---

## 5. 布局规范

### 5.1 平台端基础布局

```text
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ 侧边栏 236px │ 顶栏 72px：标题 / 日期范围 / 搜索 / 通知 / 用户              │
│              ├──────────────────────────────────────────────────────────────┤
│ 一级导航      │ 内容区：24px padding，最大化利用横向空间                    │
│              │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

侧边栏：

| 项 | 规范 |
| --- | --- |
| 宽度 | 236px |
| 背景 | 白色 |
| 边界 | 右侧 1px `--platform-border` |
| 导航高度 | 44px |
| 选中态 | 浅蓝底 + 蓝色文字 + 蓝色图标 |
| 禁止 | 使用大面积深色侧边栏、渐变侧边栏 |

顶栏：

| 项 | 规范 |
| --- | --- |
| 高度 | 72px |
| 背景 | 白色 |
| 标题 | 24px / 700 |
| 搜索框 | 360px-420px，浅边框 |
| 日期选择 | 近 7 天 / 近 30 天 / 自定义 |
| 通知 | 图标按钮 + 小红点或数字角标 |

### 5.2 内容栅格

驾驶舱页面推荐 12 栅格：

| 区域 | 栅格 |
| --- | --- |
| KPI 卡 | 4 等分或 5 等分 |
| 业务态势 | 12 栅格通栏 |
| 三联图表 | 4 + 4 + 4 |
| 底部重点/排行 | 7 + 5 或 6 + 6 |

列表页推荐：

```text
筛选区
状态 Tab
列表/表格
右侧详情抽屉
```

---

## 6. 组件规范

### 6.1 卡片

默认卡片：

```css
.platform-card {
  background: var(--platform-surface);
  border: 1px solid var(--platform-border);
  border-radius: 8px;
  box-shadow: 0 8px 26px rgba(15, 23, 42, 0.04);
}
```

禁止样式：

```css
/* 禁止：粗色条状态卡 */
.bad-card {
  border-left: 6px solid red;
}
```

推荐状态卡：

```text
┌──────────────────────────┐
│ [浅色图标底]  标题        │
│              关键数字     │
│              状态 Tag     │
└──────────────────────────┘
```

状态通过以下组合表达：

1. 图标颜色
2. 数字颜色
3. 浅色图标背景
4. 轻量 Tag
5. hover 边框变化

不通过粗色条表达。

### 6.2 KPI 卡

结构：

```text
┌────────────────────────────┐
│ [圆形图标] 标题      sparkline│
│            8,429,320         │
│            较上期 ▲ 12.6%    │
└────────────────────────────┘
```

规范：

| 项 | 规则 |
| --- | --- |
| 标题 | 单行，不换行 |
| 数字 | 28px-32px，黑色 |
| 趋势 | 绿色/红色小字，不使用大色块 |
| 图表 | 迷你折线，线宽 2px 左右 |
| 图标 | 圆形或 10px 圆角底，颜色跟指标语义一致 |

### 6.3 状态 Tag

| 状态 | 文案 | 背景 | 文字 |
| --- | --- | --- | --- |
| 正常 | 正常 | `--platform-success-bg` | `--platform-success` |
| 延迟 | 延迟 | `--platform-warning-bg` | `--platform-warning` |
| 失败 | 失败 | `--platform-danger-bg` | `--platform-danger` |
| 待处理 | 待处理 | `--platform-primary-bg` | `--platform-primary` |
| 已关闭 | 已关闭 | `#F2F4F7` | `--platform-text-tertiary` |

Tag 不要做成胶囊过圆，推荐 4px-6px 圆角。

### 6.4 表格

表格用于明细页面，不作为驾驶舱首屏主视觉。

规范：

| 项 | 规则 |
| --- | --- |
| 表头 | 浅灰底或白底加下边框，不用深蓝表头 |
| 行高 | 48px-56px |
| hover | 浅蓝灰背景 |
| 状态 | Tag + 文案 |
| 操作 | 文字按钮或图标按钮 |
| 批量操作 | 顶部工具条，不放在每一行重复堆叠 |

### 6.5 筛选区

推荐：

```text
[搜索] [品牌 Select] [平台 Select] [状态 Select] [时间 DatePicker] [重置] [导出]
```

规则：

1. 单行优先，超过一行时使用“展开筛选”。
2. 筛选区不做大卡片，只做轻量工具栏。
3. 输入框高度 32px-36px。

### 6.6 抽屉

适用：

1. 订单详情
2. Agent 任务详情
3. 商家 360
4. 发布账号详情
5. 审核材料详情

规范：

| 项 | 规则 |
| --- | --- |
| 宽度 | 420px-560px |
| 标题区 | 标题 + 状态 Tag + 关闭按钮 |
| 内容 | 分组信息 + 时间线 |
| 底部 | 固定操作按钮 |
| 敏感操作 | 二次确认 + 原因 |

---

## 7. 图表规范

### 7.1 驾驶舱图表

允许：

1. KPI 迷你折线
2. 业务流转路径
3. 漏斗图
4. 环形图
5. 热力图
6. 横向排行条

禁止：

1. 纯装饰图表
2. 无数据含义的渐变波纹
3. 大面积红橙告警背景
4. 过度 3D 图表

### 7.2 颜色使用比例

单屏颜色比例建议：

| 类型 | 占比 |
| --- | --- |
| 白/浅灰/边框 | 70%-80% |
| 主蓝色 | 10%-15% |
| 语义色 | 5%-10% |
| 深色文字 | 5% |

红色只能用于风险、失败、异常，不用于普通强调。

---

## 8. 页面模板

### 8.1 平台驾驶舱

```text
KPI 指标
业务运行态势
订单漏斗 / Agent 健康 / 风险热力图
今日重点 / 接单方排行
```

规则：

1. 首页不放大表格。
2. 今日重点最多 3-4 个。
3. 风险卡不使用左侧粗色条。
4. 所有卡片点击进入二级页面。

### 8.2 管理列表页

```text
页面标题
筛选工具栏
状态 Tab
表格列表
右侧详情抽屉
```

适用：商家、接单方、订单、发布账号、内容监管、资金流水。

### 8.3 审核处理页

```text
待审队列
材料预览
审核结论
原因输入
审计提示
```

适用：组织认证、接单方入驻、资源审核、充值审核。

### 8.4 风险工单页

```text
风险 KPI
风险队列
工单详情
关联对象
处理时间线
```

状态色使用 Tag、图标、数字表达，不使用整行红底或粗色条。

---

## 9. 平台端页面改造优先级

| 优先级 | 页面 | 设计要求 |
| --- | --- | --- |
| P0 | 平台驾驶舱 | 可视化首页，低文字密度 |
| P0 | 发布账号运营中心 | 列表 + 状态 + 详情抽屉 |
| P0 | 内容与发布监管 | 内容列表 + 发布证据 + 风险检查 |
| P0 | 风险与争议中心 | 工单化处理 |
| P0 | 资源审核中心 | 审核队列 + 材料详情 |
| P0 | 角色与成员权限 | 权限矩阵 + 审计 |
| P1 | 排名监控运营 | 趋势图 + 采样详情 |
| P1 | 履约评级中心 | 排名 + 评分详情 |
| P1 | 消息通知中心 | 模板 + 记录 + 重发 |
| P2 | 运营报表与导出 | 报表列表 + 图表 |

---

## 10. 开发落地规范

### 10.1 文件建议

```text
src/apps/platform/
├─ PlatformApp.tsx
├─ platform-theme.css
├─ components/
│  ├─ PlatformLayout.tsx
│  ├─ PlatformSidebar.tsx
│  ├─ PlatformHeader.tsx
│  ├─ PlatformCard.tsx
│  ├─ PlatformStatusTag.tsx
│  ├─ PlatformMetricCard.tsx
│  └─ PlatformDetailDrawer.tsx
└─ views/
   ├─ PlatformDashboardView.tsx
   ├─ PlatformMerchantsView.tsx
   ├─ PlatformPublishAccountsView.tsx
   ├─ PlatformContentGovernanceView.tsx
   ├─ PlatformRiskCenterView.tsx
   └─ ...
```

### 10.2 组件封装优先级

先封装：

1. `PlatformLayout`
2. `PlatformCard`
3. `PlatformMetricCard`
4. `PlatformStatusTag`
5. `PlatformFilterBar`
6. `PlatformDetailDrawer`
7. `PlatformDataTable`

后续所有页面禁止重复写不同风格的卡片、Tag、筛选器。

### 10.3 CSS 命名

使用 `platform-` 前缀，避免与发布端、接单端样式互相污染。

```css
.platform-card {}
.platform-status-tag {}
.platform-filter-bar {}
.platform-dashboard-grid {}
```

---

## 11. 当前驾驶舱修正规则

针对已发现问题：

1. 「今日重点」卡片取消左侧粗色条。
2. 风险、延迟、待验收只用图标底色、数字颜色、轻边框表达。
3. 卡片之间用间距和浅边框区分，不用明显色块分割。
4. 所有后续页面都遵循该规则。

---

## 12. 参考资料

1. Semi Design Introduction: https://semi.design/en-US/start/introduction
2. Semi Design Quick Start: https://semi.design/en-US/start/getting-started
3. Semi Design Layout: https://semi.design/en-US/basic/layout

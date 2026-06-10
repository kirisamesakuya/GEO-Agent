# 设计框架对齐说明

> 对照来源：`docs/UI设计规范.md`、`docs/ui-design-preview.html`、PRD v1.1  
> 更新：2026-06-03

## 1. 设计源优先级

| 优先级 | 文件 | 用途 |
|---|---|---|
| 1 | `docs/ui-design-preview.html` | 可视化 token 与组件样例（开发实现基准） |
| 2 | `docs/UI设计规范.md` | Markdown 规范与 Figma Neutral 说明 |
| 3 | PRD §4 / §10 | 业务页面结构与通用组件职责 |

冲突时：**布局尺寸、中性色、组件尺寸** 以 preview 为准；**主操作按钮色** 以 PRD 高保真「青绿 CTA」为准。

## 2. Token 对齐结论

### 已对齐

| 项 | 规范值 | 代码位置 |
|---|---|---|
| 侧边栏宽度 | 240px | `--layout-sidebar-width` |
| Header 高度 | 56px | `--layout-header-height` |
| 内容区内边距 | 32px | `--sp-xl` |
| 右侧面板 | 360px | `--layout-panel-width` |
| 卡片圆角 | 12px | `--radius-lg` |
| 按钮 md | 14px / 40px min-height | `.geo-btn-*` |
| 品牌主色（链接/表头） | `#1D4ED8` | `--color-primary` |
| Figma 中性色 | Text/Divider/Background | `--neutral-*` |
| 主操作 CTA | `#0D9488` 青绿 | `--color-accent` |

### 双轨色彩策略（ intentional ）

```
--color-primary   → 表头、链接、品牌 Logo 底、信息强调
--color-accent    → 页面主 CTA（提交 Hermes、确认发布）
--neutral-*       → 文字层级、分割线、页面底色
```

这与 preview 中 `.btn.primary` 用蓝色不同；PRD 明确要求「青绿色主按钮」，因此 CTA 使用 `--color-accent`。

## 3. 壳层布局

```
┌──────────┬──────────────────────────────┬──────────┐
│ Sidebar  │ Header (56px, sticky)        │          │
│ 240px    ├──────────────────────────────┤  Right   │
│ #F9F9F9  │ Main content (padding 32px)  │  Panel   │
│          │                              │  360px   │
└──────────┴──────────────────────────────┴──────────┘
```

实现：`App.tsx` + `Sidebar.tsx` + `Header.tsx` + 各页面 `RightPreviewPanel`（360px）。

## 4. 组件映射（PRD §10）

| PRD 组件 | 实现文件 | 状态 |
|---|---|---|
| AgentInputCard | `src/components/common/AgentInputCard.tsx` | ✅ |
| AssistantPanel | `src/components/common/AssistantPanel.tsx` | ✅ 待接入生成文章页 |
| TaskStatusPill | `src/components/common/TaskStatusPill.tsx` | ✅ |
| RightPreviewPanel | `src/components/common/RightPreviewPanel.tsx` | ✅ 待全面替换旧右侧栏 |
| ResultWorkspace | — | 🔜 Iteration 2 |

## 5. 当前差距 & 迭代计划

| 差距 | 处理 |
|---|---|
| 生成文章页仍混用 Tailwind 灰色类 | ✅ 已 token 化 |
| Provider 端 gray 类 | ✅ 已替换为 `--provider-*` / `text-provider-*` |
| 三端响应式侧栏 | ✅ 发布/平台/接单 <1024px 抽屉 |
| 配置助手未嵌入生成文章页 | Iteration 2 用 AssistantPanel 替换旧聊天区 |
| 内容库无真实数据 | Iteration 2 已实现 ContentBatch API |
| 创建网页/找人投放等占位 | Iteration 5–6 |

## 7. 三端壳层与响应式（2026-06 对齐）

| 端 | 主题文件 | 侧栏 | 断点 |
|----|---------|------|------|
| 发布端 | `src/index.css` | 240px / 抽屉 | 1024 / 640 |
| 平台端 | `src/apps/platform/platform-theme.css` | 240px / 抽屉 | 1024 |
| 接单端 | `src/apps/provider/provider-theme.css` | 240px / 抽屉 | 1024 / 640 |

接单端中性色使用 `text-provider-*`、`border-provider`、`provider-card`，禁止新增 Tailwind `gray-*`。

在浏览器打开 `docs/ui-design-preview.html` 可对照 token 与组件样例。

## 8. 滚动策略（主区单滚动条）

**原则**：整页只在 `App.tsx` 的 `<main class="geo-layout-scroll">` 出现可见滚动条；各业务模块随主区自然增高，禁止再套一层 `h-full overflow-y-auto` 形成「模块内大滚动条」。

| 类名 | 用途 |
|---|---|
| `.geo-layout-scroll` | 主内容区：细滚动条、`scrollbar-gutter: stable` |
| `.geo-scroll-hide` | 侧栏列表、抽屉正文、sticky 辅栏：可滚轮滚动但隐藏滚动条 |
| `.geo-page-tab-sticky` | 嵌入页 Tab 条吸顶（随主区滚动） |

**布局约定**

1. 主区 `<main class="geo-layout-scroll">` 不要用 `flex flex-col` 包裹页面（否则子项默认 `flex-shrink:1` 会被压扁）；页面根节点禁止 `h-full overflow-hidden`。
2. Flex 纵向链：`min-h-0` 只用于 Header 下壳层；品牌工作台等长表单用 `.geo-brand-workspace` 随主区增高，侧栏 `sticky` + `geo-scroll-hide`。
3. 左右分栏：主列随主区滚动；侧栏 `sticky top-0 self-start` + `geo-scroll-hide` + `max-h: calc(100vh - var(--layout-header-height))`。
4. 弹窗 / 抽屉内局部滚动：用 `geo-scroll-hide`，不用默认粗滚动条。
5. 代码块、日志等小区域 `max-h-* overflow-y-auto` 可保留，同样建议加 `geo-scroll-hide`。

实现参考：`GeoReportHistoryView`、`GeoQuickStartView`、`RightPreviewPanel`、`Sidebar` 导航区。

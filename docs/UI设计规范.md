# GEO 助手 — UI 设计规范

> 版本：v2.1 | 风格：商务 / 专业 | 色板：产品主色 + Figma Neutral Styles | 更新日期：2026-06-03

---

## 1. 设计原则

| 原则 | 说明 |
|------|------|
| 稳重克制 | 低饱和度配色，清晰的层级关系，不过度装饰 |
| 数据优先 | 优化数字和表格展示，适合 B2B 数据看板场景 |
| 一致性 | 统一的间距、圆角、字体层级系统 |
| 可读性 | 对比度充足（WCAG AA+），信息密度适中 |

---

## 2. 色彩系统

### 2.1 品牌主色

| 变量 | 色值 | 预览 | 用途 |
|------|------|------|------|
| `--color-primary` | `#1D4ED8` | 深蓝 | 按钮、链接、强调色 |
| `--color-primary-hover` | `#1E40AF` | 更深蓝 | 按钮悬浮 |
| `--color-primary-light` | `#EFF6FF` | 极浅蓝 | 悬浮背景、激活态背景 |
| `--color-primary-soft` | `#BFDBFE` | 浅蓝 | 边框悬浮、次级强调 |

### 2.2 文字颜色

| 变量 | 色值 | 用途 |
|------|------|------|
| `--color-title` | `#0F172A` | 标题、重要文字（最高对比度） |
| `--color-text` | `#334155` | 正文文字 |
| `--color-text-secondary` | `#64748B` | 辅助文字、标签、时间戳 |
| `--color-text-placeholder` | `#94A3B8` | 占位符、禁用文字 |

### 2.3 背景与边框

| 变量 | 色值 | 用途 |
|------|------|------|
| `--color-bg` | `#F8FAFC` | 页面整体背景 |
| `--color-bg-card` | `#FFFFFF` | 卡片、面板背景 |
| `--color-bg-hover` | `#F1F5F9` | 列表项 / 菜单项悬浮背景 |
| `--color-border` | `#E2E8F0` | 边框、分隔线 |
| `--color-border-hover` | `#CBD5E1` | 输入框悬浮边框 |

### 2.4 语义色

| 类型 | 色值 | 背景色 | 用途 |
|------|------|--------|------|
| Success | `#059669` | `#ECFDF5` | 成功状态、正向趋势 |
| Warning | `#D97706` | `#FFFBEB` | 警告、待处理 |
| Danger | `#DC2626` | `#FEF2F2` | 错误、负向趋势、删除 |
| Info | `#2563EB` | `#EFF6FF` | 信息提示、中性状态 |

### 2.5 Figma Neutral Color Styles

以下颜色来自 Figma 中性色样式，用于补充最新“灿卡式”页面的文字、分割线和背景层级。该色组只定义中性色，不引入新的品牌色；品牌主色仍按产品主色或当前高保真稿的青绿色主操作色执行。

#### Text

| Style | Color | 用途 |
|---|---|---|
| 文字/01重要 | `#000000` | 页面标题、重要正文、关键数字 |
| 文字/02次要 | `#666666` | 次级正文、说明、表格普通内容 |
| 文字/03提示 | `#999999` | 辅助提示、时间、弱说明 |
| 文字/04占位 | `#B3B3B3` | 输入框 placeholder、空值提示 |
| 文字/05失效 | `#CCCCCC` | 禁用文字、不可用操作 |
| 文字/白字 | `#FFFFFF` | 深色或主色按钮文字 |

#### Divider

| Style | Color | 用途 |
|---|---|---|
| 分割线/01深灰背景分割线 | `#E5E5E5` | 深灰背景上的边框、列表线 |
| 分割线/02浅灰背景分割线 | `#EAEAEA` | 浅灰背景上的边框、表格分隔 |
| 分割线/03白底分割线 | `#F3F3F3` | 白底区域分割线（按需手动添加） |
| 分割线/04选中 | `#000000` | 选中态强调线、强对比底线 |

#### Background

| Style | Color | 用途 |
|---|---|---|
| 背景/01选中背景 | `#EAEAEA` | 选中项、当前行、浅色激活块 |
| 背景/02深灰背景 | `#F3F3F3` | 卡片内次级面、表格头、分组背景 |
| 背景/03浅灰背景 | `#F9F9F9` | 页面底色、空状态块、轻面板 |
| 背景/黑色背景 | `#000000` | 黑色工具栏、强对比区域 |
| 背景/白色背景 | `#FFFFFF` | 卡片、弹窗、输入面板 |

#### Usage Notes

1. 排版层级优先使用 `文字/*` 样式，不要随意引入新的灰度色。
2. 边框、表格分隔、弹窗分隔、侧边栏线条优先使用 `分割线/*` 样式；卡片内部默认不使用分割线。
3. 页面底、选中态、面板填充、空状态块优先使用 `背景/*` 样式。
4. 不要从该 Figma 中性色组中引入新的品牌色；它只服务中性层级。

---

## 3. 排版系统

### 3.1 字体栈

```
'Microsoft YaHei', 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif
```

### 3.2 字号层级

| 层级 | 变量 | 字号 | 字重 | 行高 | 用途 |
|------|------|------|------|------|------|
| H1 | `--font-size-h1` | 24px | 700 | 1.3 | 页面标题 |
| H2 | `--font-size-h2` | 18px | 600 | 1.4 | 区块标题 |
| H3 | `--font-size-h3` | 16px | 600 | 1.4 | 卡片标题 |
| Body | `--font-size-body` | 14px | 400 | 1.6 | 正文内容 |
| Caption | `--font-size-caption` | 12px | 400 | 1.4 | 标签、辅助信息 |
| Data | `--font-size-data` | 32px | 700 | 1.2 | 统计大字 |
| Data-sm | `--font-size-data-sm` | 18px | 700 | 1.3 | 小统计数字 |

### 3.3 Figma Typography Scale

默认字号为 `14px`，默认正文行高为 `20px`。新增字号时必须优先从下表选择，避免产生不受控的排版层级。

| Font Size | Line Height |
|---|---|
| 12px | 16px |
| 14px | 20px |
| 16px | 24px |
| 18px | 26px |
| 20px | 28px |
| 24px | 32px |
| 28px | 36px |
| 32px | 40px |
| 36px | 44px |
| 40px | 48px |
| 48px | 56px |
| 56px | 64px |
| 64px | 72px |
| 72px | 80px |

---

## 4. 间距系统

基准单位 **4px**，所有间距为 4 的倍数。

| 变量 | 值 | 用途 |
|------|-----|------|
| `--sp-xs` | 4px | 元素内微小间距 |
| `--sp-sm` | 8px | 图标与文字间距、小间距 |
| `--sp-md` | 12px | 表单元素间距 |
| `--sp-base` | 16px | 卡片之间间距、网格 gap |
| `--sp-lg` | 24px | 区块之间间距、卡片内边距 |
| `--sp-xl` | 32px | 页面内边距 |
| `--sp-2xl` | 48px | 大段间距、弹窗内边距 |

### 使用规则

- **卡片之间**：`--sp-base` (16px)
- **卡片内边距**：`--sp-lg` (24px)
- **页面内边距**：`--sp-xl` (32px)
- **段落间距**：`--sp-md` (12px)
- **表单组间距**：`--sp-md` (12px)

---

## 5. 圆角系统

| 变量 | 值 | 用途 |
|------|-----|------|
| `--radius-sm` | 6px | 标签、小元素 |
| `--radius-md` | 8px | 按钮、输入框、下拉选择 |
| `--radius-lg` | 12px | 卡片、面板 |
| `--radius-xl` | 16px | 弹窗、大容器、登录卡片 |

### 使用规则

- 交互控件（按钮、输入框）→ `--radius-md`
- 容器容器（卡片、面板）→ `--radius-lg`
- 独立弹窗 / 登录页 → `--radius-xl`

---

## 6. 布局规范

### 6.1 布局尺寸

| 区域 | 尺寸 | 说明 |
|------|------|------|
| Header | 高度 56px | 顶部横条，含 Logo、导航、用户信息 |
| 侧边栏 | 展开 240px / 收起 72px | 左侧导航菜单 |
| 内容区 | padding `--sp-xl` (32px) | 中间主要区域 |
| 聊天面板 | 360px | 右侧聊天面板（可折叠） |

### 6.2 响应式

- 最小内容宽度：1200px（桌面端优先）
- 卡片网格：`auto-fit, minmax(360px, 1fr)`
- 统计卡片网格：固定 4 列

---

## 7. 组件规范

### 7.1 按钮

| 类型 | 样式 | 用途 |
|------|------|------|
| 主按钮 | 深蓝背景 + 白字 | 主要操作（提交、确认） |
| 次按钮 | 白底 + 灰边框 + 深灰字 | 次要操作（取消、返回） |
| 文字按钮 | 无背景无边框 + 灰字 | 折叠、关闭、辅助操作 |
| 危险按钮 | 红底 + 白字 | 删除、退出等破坏性操作 |

#### 7.1.1 按钮尺寸

| Size | Font Size | Line Height | Padding | Min Height |
|---|---|---|---|---|
| md | 14px | 20px | `10px 20px` | 40px |
| sm | 14px | 20px | `8px 18px` | 36px |
| xs | 14px | 20px | `6px 16px` | 32px |

使用规则：

1. 页面主 CTA 使用 `md`。
2. 卡片内次级操作优先使用 `sm`。
3. 表格行内操作、标签旁小按钮使用 `xs`。
4. 所有按钮文字默认 `14px / 20px`，不要为了压缩按钮任意缩小字号。

### 7.2 卡片

- 白底 `#FFFFFF`
- 1px 浅灰边框 `#E2E8F0`
- 圆角 12px
- 默认无投影
- 默认不添加卡片内部描边、分割线或顶部强调线
- Hover 状态：仅边框加深

### 7.3 表格

- 表头：深蓝背景 `--color-primary` + 白字 + 600 字重
- 斑马纹：无（悬浮行变色即可）
- 悬浮行：浅蓝背景 `--color-primary-light`
- 边框圆角：`--radius-lg`（外包裹）

### 7.4 标签 (Tag)

- 圆角 6px，无边框
- 背景色使用语义色的浅色版
- 文字色使用对应语义色
- 字号 12px，500 字重

### 7.5 弹窗

- 圆角 16px
- 默认无投影
- 标题区 24px 内边距，底部边框分隔
- 内容区 20px 28px 内边距
- 底部操作区右对齐，按钮间距 10px

### 7.6 输入框

- 圆角 8px
- Hover 时边框变深
- Focus 时主色边框

---

## 8. 动效规范

| 属性 | 值 | 用途 |
|------|-----|------|
| 过渡时间 | 200ms | 统一动画时长 |
| 缓动函数 | ease-out | 统一缓动效果 |
| 侧边栏折叠 | width 200ms ease-out | 展开 / 收起动画 |
| 卡片 hover | border-color 200ms | 悬浮反馈 |
| 按钮 hover | background + border-color 200ms | 操作反馈 |

---

## 9. 登录页规范

- **背景**：`linear-gradient(135deg, #0F172A, #1E293B, #1E3A5F)`
  - 深蓝到深灰蓝渐变，稳重专业
- **卡片**：宽度 420px，圆角 16px，默认无投影
- **标题**：26px，700 字重，1px 字间距
- **副标题**：`--color-text-secondary`，14px

---

## 附录：CSS 变量速查表

```css
/* 快速复制粘贴使用 */
:root {
  /* 色彩 */
  --color-primary: #1D4ED8;
  --color-primary-hover: #1E40AF;
  --color-primary-light: #EFF6FF;
  --color-primary-soft: #BFDBFE;
  --color-title: #0F172A;
  --color-text: #334155;
  --color-text-secondary: #64748B;
  --color-text-placeholder: #94A3B8;
  --color-border: #E2E8F0;
  --color-border-hover: #CBD5E1;
  --color-bg: #F8FAFC;
  --color-bg-card: #FFFFFF;
  --color-bg-hover: #F1F5F9;
  --color-success: #059669;
  --color-success-bg: #ECFDF5;
  --color-warning: #D97706;
  --color-warning-bg: #FFFBEB;
  --color-danger: #DC2626;
  --color-danger-bg: #FEF2F2;
  --color-info: #2563EB;
  --color-info-bg: #EFF6FF;

  /* 排版 */
  --font-family: 'Microsoft YaHei', 'PingFang SC', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-h1: 24px;
  --font-size-h2: 18px;
  --font-size-h3: 16px;
  --font-size-body: 14px;
  --font-size-caption: 12px;
  --font-size-data: 32px;
  --font-size-data-sm: 18px;
  --line-height-body: 1.6;

  /* 间距 */
  --sp-xs: 4px;
  --sp-sm: 8px;
  --sp-md: 12px;
  --sp-base: 16px;
  --sp-lg: 24px;
  --sp-xl: 32px;
  --sp-2xl: 48px;

  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* 动效 */
  --transition: 200ms ease-out;
}
```

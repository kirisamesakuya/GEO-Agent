# GEO 投放助手 · 高保真页面集

> 源文档：`GEO投放助手_撮合交易最新链路与线框图.md` v0.1  
> 生成方式：基于项目实际 CSS Token + React 组件模式，HTML 实现  
> 打开方式：**浏览器直接打开 `all-pages.html`**  
> 日期：2026-06-25

## 设计系统

全部 14 个页面共用同一套 Sidebar + Header + 设计 Token，来自：

| 来源 | 对应 |
|------|------|
| `src/index.css` | CSS 变量（颜色/间距/圆角/字体/阴影） |
| `src/App.tsx` | 壳层布局（240px 侧栏 + 56px Header） |
| `src/components/Sidebar.tsx` | 侧栏导航结构 |
| `src/components/Header.tsx` | PageHeaderWithBrand 模式 |
| `src/components/WorkbenchView.tsx` | 工作台-ResultPanel 组件 |
| `src/components/paid-source/PaidSourcePublishFormView.tsx` | 表单分段+geo-input |
| `src/components/paid-source/QuoteCompareView.tsx` | 比价表格 |
| `src/components/paid-source/PaidSourceTaskListView.tsx` | 任务列表+Tab |
| `src/components/site-optimize/SiteOptimizeView.tsx` | 网站优化卡片 |
| 接单端 ProviderTaskView / SubmitQuoteView / Onboarding | 接单端页面模式 |

## 14 个页面（右下角导航切换）

| # | 页面 | 对应线框图 |
|---|------|-----------|
| 01 | 工作台 | §7.1 |
| 02 | 任务发布表单 | §7.1.1 |
| 03 | 方案拆单页 | §7.2 |
| 04 | 比价页 | §7.3 |
| 05 | 任务管理列表 | §7.3.1 |
| 06 | 报价详情/接单方对比 | §7.3.2 |
| 07 | 执行详情 | §7.3.3 |
| 08 | 任务大厅（接单端） | §7.4 |
| 09 | 接单任务详情 | §7.4.1 |
| 10 | 提交报价（接单端） | §7.5 |
| 11 | 入驻信息提交 | §7.5.1 |
| 12 | 案例资源维护 | §7.5.2 |
| 13 | 自有网站优化 | §7.6 |
| 14 | 新建网站 | §7.7 |

## 统一规范对照

| 规范项 | 实际用法 |
|--------|---------|
| 卡片 `.geo-card` | 白底 + `#EAEAEA` 1px + 12px 圆角 + 20px padding |
| 主按钮 `.geo-btn-primary` | 青绿 `#0D9488` bg + 白字 + 8px 圆角 + 40px min-height |
| 次按钮 `.geo-btn-secondary` | 白底 + `#EAEAEA` 边框 |
| 小按钮 `.geo-btn-sm` | 36px min-height / 13px 字号 |
| 输入框 `.geo-input` | `#EAEAEA` 边框 + focus 青绿光圈 |
| 表格 `.data-table` | `#F3F3F3` 表头 + `#EAEAEA` 分割线 |
| Tab `.nav-tab` | 未选中白底灰边 / 选中 `#1D4ED8` |
| 状态标签 `.geo-badge` | 成功绿 / 警告橙 / 信息蓝 / 默认灰 |
| 进度条 `.progress-steps` | 完成绿 / 进行中青绿 / 待处理灰 |
| Section 标题 `.form-section-title` | 14px 600 + 底部 `#EAEAEA` 分割线 |

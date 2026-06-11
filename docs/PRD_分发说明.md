# PRD 文档分发说明

## 原则

**产品需求 PRD（v2.0 及后续）不纳入 Git 远程仓库**，仅在本地维护，并通过压缩包 / 文档协作平台离线分发给评审方与相关同事。

代码仓库（GitHub `origin`）只保留研发、Skill 契约、部署与验收相关文档；**禁止 `git push` 携带 PRD 正文、审阅稿、定稿包或 PRD 截图资产**。

## 本地目录（已 gitignore，不会上传）

| 路径 | 说明 |
|---|---|
| `docs/PRD_GEO投放助手_*` | 四份端侧 / 平台 PRD（`*_待定.md`、`*_Approved.md`、导出 pdf/docx） |
| `docs/PRD_v2.0_审阅稿_2026-06-11/` | Review 审阅快照与 HTML |
| `docs/PRD_v2.0_定稿_2026-06-11/` | Approved 定稿包（含 Skill 快照副本、截图、HTML） |
| `docs/PRD_v2.0_定稿_2026-06-11.zip` | 定稿压缩包 |
| `docs/prd-assets/` | PRD 页面截图源文件 |
| `docs/_qa/` | PRD 导出 QA 联系页 |
| `scripts/build_prd_html.py` 等 | PRD 专用构建脚本（仅本地使用） |

## 对外发送

定稿外发请使用：

```text
docs/PRD_v2.0_定稿_2026-06-11.zip
```

或整文件夹 `docs/PRD_v2.0_定稿_2026-06-11/`（详见其内 `README.md`）。

## 协作者如何获取 PRD

1. 向产品负责人索取定稿 zip / 飞书文档链接。
2. clone 代码仓库后**不会**自动包含 PRD；开发以 Issue / 设计稿 / 口头评审补充为准，或单独接收定稿包。
3. 若本地已有定稿包，解压到 `docs/PRD_v2.0_定稿_2026-06-11/` 即可与 HTML 内链一致。

## 历史说明

仓库中曾跟踪 `docs/GEO投放助手_正式开发版_PRD_v1.1_*.md`（旧版 Demo PRD）。自 v2.0 起已从版本库移除跟踪；**请勿再提交任何 PRD 文件**。

## 推送前自检

```powershell
cd D:\GEO-Agent
git status
git diff --cached --name-only | Select-String "PRD|prd-assets|定稿|审阅稿"
```

若上述命令有输出，请 `git restore --staged` 相应文件后再 `git push`。

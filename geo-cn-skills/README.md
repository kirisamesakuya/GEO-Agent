# geo-cn-skills

面向**中国环境**的 GEO Hermes 技能包，专为 [GEO-Agent](https://github.com/kirisamesakuya/GEO-Agent) 设计。

- **20** 个技能，覆盖预审、官网优化、内容优化、关键词、代理与内容生产
- 统一输出契约 **`geoWebOutput.v1`**
- 默认监测平台：**DeepSeek、豆包、千问、Kimi、元宝**
- 融合公开 GEO 工作流中的国内平台适配、证据台账、CORE-EEAT 快扫等方法论

## 单独测试：排名监测技能

在接入全包前，可先只安装监测技能到 Hermes：

```powershell
cd geo-cn-skills/standalone/geo-platform-ranking-sampling
.\scripts\install-standalone.ps1
```

详见 [standalone/geo-platform-ranking-sampling/HERMES_TEST.md](standalone/geo-platform-ranking-sampling/HERMES_TEST.md)。

## 快速开始

### 校验

```powershell
cd geo-cn-skills
.\scripts\validate-pack.ps1
```

### 安装到本机 Hermes

```powershell
.\scripts\install-to-hermes.ps1
```

### 接入 GEO-Agent 路由

将 `adapter-skill-map.json` 合并到数据库 `skill_routes` 配置，或开发环境 bootstrap 默认值。

## 技能清单

| 分类 | 技能 ID | GEO-Agent taskType |
|------|---------|-------------------|
| 预审 | `geo-brand-mentions` | `brand_extract` |
| 预审 | `geo-quick-start` | `geo_quick_start` |
| 预审 | `geo-audit` | `geo_audit` |
| 官网 | `geo-crawlers` | `geo_crawlers` |
| 官网 | `geo-technical` | `geo_technical` |
| 官网 | `geo-llmstxt` | `geo_llmstxt` |
| 官网 | `geo-schema` | `geo_schema` |
| 内容 | `geo-platform-optimizer` | `geo_platform_optimizer` |
| 内容 | `geo-citability` | `geo_citability` |
| 内容 | `geo-content` | `geo_content` |
| 关键词 | `geo-keyword-mining-web` | `keyword_mining` |
| 关键词 | `geo-platform-ranking-sampling` | `index_sampling` |
| 代理 | `geo-prospect-web` | `geo_prospect` |
| 代理 | `geo-proposal-web` | `geo_proposal` |
| 代理 | `geo-report-web` | `geo_report` |
| 代理 | `geo-report-pdf` | `geo_report_pdf` |
| 代理 | `geo-compare` | `geo_compare` |
| 生产 | `geo-knowledge-extract-web` | `knowledge_extract` |
| 生产 | `geo-article-generation-web` | `article_generation` |
| 生产 | `geo-article-rewrite-web` | `article_rewrite` |

完整注册表：`registry/skills.json`。

## 目录结构

```text
geo-cn-skills/
├── README.md
├── VERSION
├── adapter-skill-map.json      # GEO-Agent skill_routes 模板
├── registry/skills.json
├── shared/
│   ├── cn-defaults.json
│   ├── geo-web-contract.md
│   └── references/
├── skills/<skill-id>/
│   ├── SKILL.md
│   └── manifest.json
└── scripts/
    ├── install-to-hermes.ps1
    └── validate-pack.ps1
```

## 输出契约

所有技能必须返回 `geoWebOutput.v1` 单 JSON 对象：

`audit`, `data`, `metrics`, `findings`, `artifacts`, `actionPlan`

详见 `shared/geo-web-contract.md`。

## 与 GEO-Agent 的分工

| 层 | 职责 |
|----|------|
| **geo-cn-skills** | Hermes 本机执行、方法论、中国默认 |
| **GEO-Agent** | 任务编排、`normalizeGeoSkillInput`、GeoReport 落库、UI |

## 独立仓库发布

本目录可单独 `git init` 并推送到新 GitHub 仓库：

```powershell
cd geo-cn-skills
git init
git add .
git commit -m "feat: initial geo-cn-skills pack 2026.06.09-cn1"
```

## Attribution

方法论参考了公开 GEO/SEO 技能生态中的通用实践（国内平台监测、证据台账、E-E-A-T 质检、意图拓词等），经改写为 GEO-Agent 契约，不直接捆绑第三方私有系统。

## License

Apache License 2.0 — 见 [LICENSE](LICENSE)。

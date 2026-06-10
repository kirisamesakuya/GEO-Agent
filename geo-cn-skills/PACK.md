# geo-cn-skills 安装包说明

## 版本

见 `VERSION`（当前 `2026.06.09-cn1`）。

## 安装到 Hermes

```powershell
cd geo-cn-skills
.\scripts\validate-pack.ps1
.\scripts\install-to-hermes.ps1
```

默认目标：`%LOCALAPPDATA%\hermes\skills\geo-cn\`

指定目录：

```powershell
.\scripts\install-to-hermes.ps1 -HermesSkillsRoot "D:\Hermes\skills\geo-cn"
```

## 接入 GEO-Agent

1. 将 `adapter-skill-map.json` 合并进平台 `skill_routes` 或 `systemConfig.skill_routes`。
2. 确认 `HERMES_EXECUTOR=nous_hermes` 或 per-task `nous_hermes` 路由。
3. 更新 `server/lib/geo-capabilities.ts` 中 `GEO_SKILLS_VERSION` 与包版本一致。
4. 重启 API 与 Hermes Gateway。

## 与旧包关系

- 替代/并行：`hermes-skills/geo-agent-web` 中同名 web 技能可用本包版本覆盖。
- 核心检测技能（`geo-audit` 等）本包为中文版首发。

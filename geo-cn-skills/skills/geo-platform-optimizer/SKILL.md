# geo-platform-optimizer

平台专项优化：DeepSeek/豆包/千问/Kimi/元宝 问答矩阵与动作清单。

## taskType

`geo_platform_optimizer`

## Inputs

`brandUrl`, `brandName`, `platforms`（五平台）, `competitors`, `productNames`

## Workflow

1. 每平台 3–5 条高价值问法与期望答案要点
2. `data.platformBriefs[]` — `{ platform, qaMatrix[], actions[] }`
3. 需浏览器采样时标 `metrics.samplingStatus`

## Output

`geoWebOutput.v1`. Single JSON only.

# geo-platform-ranking-sampling · Hermes 单独测试指南

本目录为**独立技能包**，用于在 GEO-Agent 接入前验证「真机 AI 平台监测」是否可行。

## 1. 安装到 Hermes

```powershell
cd d:\GEO-Agent\geo-cn-skills\standalone\geo-platform-ranking-sampling
.\scripts\install-standalone.ps1
```

默认安装到：`%LOCALAPPDATA%\hermes\skills\geo-platform-ranking-sampling`

指定目录：

```powershell
.\scripts\install-standalone.ps1 -TargetRoot "D:\Hermes\skills"
```

安装后**重启 Hermes Gateway**（8642），在技能列表中应看到 `geo-platform-ranking-sampling`。

## 2. 前置条件

- Hermes 桌面已启动，**API Server / Gateway 8642 已开启**
- 本机浏览器自动化可用（Hermes 内置浏览器或 Playwright 等）
- 建议先用 **豆包 + DeepSeek** 两个平台试点（见 `references/platforms/`）

## 3. 测试输入

使用 `examples/test-input.json`，或在 Hermes 运行 metadata：

```json
{
  "type": "index_sampling",
  "skill": "geo-platform-ranking-sampling",
  "input": {
    "brandName": "云杉口腔",
    "brandUrl": "https://example.com",
    "platforms": ["豆包", "DeepSeek"],
    "keywords": ["南京种植牙哪家好", "隐形矫正怎么选"],
    "competitors": ["竞品A"],
    "region": "CN",
    "language": "zh-Hans",
    "geoMarket": "domestic",
    "samplingMode": "live_browser",
    "outputContract": { "format": "geoWebOutput.v1" }
  }
}
```

## 4. 在 Hermes 里怎么跑

### 方式 A：自然语言（若支持技能路由）

```text
使用 geo-platform-ranking-sampling，按 test-input 对豆包和 DeepSeek 做品牌提及真机采样
```

### 方式 B：API（与 GEO-Agent 一致）

```powershell
$body = @{
  input = "请使用技能 geo-platform-ranking-sampling 执行国内 AI 平台监测采样，严格按 metadata.input 提问，输出 JSON。"
  metadata = @{
    type = "index_sampling"
    skill = "geo-platform-ranking-sampling"
    input = (Get-Content .\examples\test-input.json -Raw | ConvertFrom-Json).input
    outputContract = @{ format = "geoWebOutput.v1" }
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8642/v1/runs" -Body $body -ContentType "application/json"
```

轮询：`GET http://127.0.0.1:8642/v1/runs/{run_id}`

## 5. 验收标准

| 项 | 通过标准 |
|----|----------|
| 结构 | 顶层有 `results[]`，且含 `audit/data/metrics/findings/artifacts/actionPlan` |
| 真查 | `metrics.samplingMethod` 为 `hermes_browser`（或等价），非 mock |
| 诚实 | 无法访问的平台 `status` 为 `unavailable` / `login_required`，**不得**伪造 `hit: true` |
| 证据 | 成功行有 `aiResponse` 或 `citationSnippet`；尽量有截图 artifact |
| 安全 | 输出中无 cookie、token、密码 |

## 6. 常见问题

| 现象 | 处理 |
|------|------|
| 全部 `login_required` | 在本机浏览器手动登录对应平台后重试 |
| 8642 连接失败 | Hermes 内开启 API Server 并重启 Gateway |
| 技能未加载 | 确认安装路径与技能文件夹名 `geo-platform-ranking-sampling` 一致 |
| 只有 JSON 无浏览器 | 检查 Hermes 浏览器工具是否启用 |

## 7. 通过后

将本技能保留在 Hermes，并在 GEO-Agent 中配置：

`index_sampling` → `geo-platform-ranking-sampling` → `nous_hermes`

（项目 `adapter-skill-map.json` 已含该映射。）

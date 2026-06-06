# GEO 投放助手（GEO-Agent）

本地开发与运行说明。  
**项目现状问答（含三端进度、本期范围、迭代索引）** → [`docs/GEO-Agent_项目现状问答.md`](docs/GEO-Agent_项目现状问答.md)（更新于 2026-06-06）

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. 当前业务 AI/Hermes 链路为 Mock 模式，不需要配置 MiniMax 即可生成、改写和发布：
   - Mock 模式不会调用 MiniMax，也不会消耗真实 AI 生成额度
   - 如需单独验收 MiniMax 连通性，可复制 `config/minimax.example.json` → `config/minimax.local.json`
   - 在 `apiKey` 字段填入你的 MiniMax API Key（该文件已 gitignore，不会提交）
3. Run the app:
   `npm run dev`

可选：验收 MiniMax 连通性：

```bash
node scripts/minimax-smoke.mjs
```

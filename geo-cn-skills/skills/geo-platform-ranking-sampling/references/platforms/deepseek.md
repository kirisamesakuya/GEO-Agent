# DeepSeek · 监测 Playbook

## 入口

- Web 对话：`https://chat.deepseek.com/`（以实际可访问 URL 为准）

## 问法模板

同豆包；DeepSeek 用户常问对比型、科普型问题。

## 登录检测

- 需登录才能对话 → `login_required`
- 游客模式若可用且能完整回答，可标 `sampled`

## 采样步骤

1. 打开聊天页
2. 发送监测问句
3. 等待流式输出结束
4. 记录完整回答与引用来源（如有）
5. 匹配品牌名、竞品、官网链接

## 注意

- 流式输出未结束不要截断
- 无引用模块时 `citationUrls` 可为空，但需在 `aiResponse` 保留正文

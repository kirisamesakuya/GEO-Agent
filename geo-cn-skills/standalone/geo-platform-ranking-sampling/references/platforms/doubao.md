# 豆包 · 监测 Playbook

## 入口

- Web 对话：`https://www.doubao.com/chat/`（以实际可访问 URL 为准）

## 问法模板

- `{city}{品类}哪家好？请推荐并说明理由`
- `{keyword} 怎么选？有哪些靠谱机构？`

## 登录检测

- 出现登录弹窗、扫码页、或未登录无法输入 → `status: login_required`
- 提示用户在本机浏览器完成登录后重试

## 采样步骤

1. 打开对话页，确认输入框可用
2. 发送 `monitoringPrompt` 或 keyword 问句
3. 等待回答稳定（无 loading）
4. 提取正文、引用卡片/链接列表
5. 判断 `brandName` 是否出现在正文；`brandUrl` 是否在引用中

## 失败处理

- 验证码 → `captcha`
- 超时无回答 → `error` + 简短 errorMessage

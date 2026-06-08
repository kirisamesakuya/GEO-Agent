/**
 * 发布端 Hermes 控制台本期暂不开放的能力（代码保留，UI 隐藏）。
 * 待本机并发策略与队列监控方案稳定后再逐项开启。
 */

/** 后台额度、发布任务计数、桌面端保护状态卡片 */
export const HERMES_CAPACITY_STATS_ENABLED = false;

/** 保守 / 平衡 / 加速 / 勿打扰策略切换与桌面端保护开关 */
export const HERMES_CONCURRENCY_POLICY_UI_ENABLED = false;

/** 分析 / 发布 / 账号类队列监控与「打开诊断日志」入口 */
export const HERMES_QUEUE_MONITOR_ENABLED = false;

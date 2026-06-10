# 证据台账（来源分级）

对齐国内 GEO 交付习惯：任何对比、排名、数据断言需可追溯。

## data.sourceLedger 条目

```json
{
  "id": "src-1",
  "url": "https://...",
  "title": "官网产品页",
  "tier": "official",
  "accessedAt": "2026-06-09",
  "status": "reachable",
  "supports": ["价格区间", "服务范围"]
}
```

## tier 枚举

- `official` — 品牌官网/官方账号
- `authority` — 政府、行业协会、主流媒体
- `third_party` — 第三方评测/目录
- `user_provided` — 用户上传
- `unverified` — 未验证，不得用于硬结论

/** 协议对齐的产品提示文案（品牌端 / 接单端共用） */

export const LEGAL_OPERATOR = '江苏汇智智能数字科技有限公司';

export const BRAND_PLATFORM_NAME = '汇智GEO-AI智联项目平台';
export const PROVIDER_PLATFORM_NAME = '汇智AIGC媒体收单平台';

export const BRAND_USER_AGREEMENT_TITLE = '汇智GEO-AI智联项目平台用户服务协议';
export const BRAND_PREPAID_AGREEMENT_TITLE = '投放服务预存与资金管理办法';
export const BRAND_PRIVACY_TITLE = '汇智GEO-AI智联项目平台隐私政策';

export const PROVIDER_USER_AGREEMENT_TITLE = '汇智AIGC媒体收单平台用户服务协议';
export const PROVIDER_SERVICE_AGREEMENT_TITLE =
  '汇智AIGC媒体收单平台接单方（创作者及内容服务商）入驻与平台撮合服务协议';
export const PROVIDER_PRIVACY_TITLE = '汇智AIGC媒体收单平台隐私政策';

/** 发单勾选（完整书名，含书名号） */
export const BRAND_PUBLISH_AGREEMENT_LABEL = `《${BRAND_USER_AGREEMENT_TITLE}》`;

export const MARKETPLACE_PLATFORM_FEE_RATE = 0.3;

/** 接单端注册/登录勾选 */
export const PROVIDER_REGISTRATION_AGREEMENT_LABEL =
  `《${PROVIDER_USER_AGREEMENT_TITLE}》和《${PROVIDER_PRIVACY_TITLE}》`;

/** 接单入驻勾选（完整书名，含书名号） */
export const PROVIDER_ONBOARDING_AGREEMENT_LABEL = `《${PROVIDER_SERVICE_AGREEMENT_TITLE}》`;

/** 入驻页勾选完整句式（含 30% 费率提示） */
export const PROVIDER_ONBOARDING_AGREEMENT_CHECKBOX =
  `我已阅读并同意${PROVIDER_ONBOARDING_AGREEMENT_LABEL}，知悉平台按订单实际结算金额收取 ${MARKETPLACE_PLATFORM_FEE_RATE * 100}% 平台技术服务费，并同意按照平台规则完成接单、交付、验收、结算和争议处理。我已充分理解平台调处规则、七天自动验收、知识产权转让、反作弊及反绕单违约责任等重要条款。`;

/** 注册/登录勾选完整句式 */
export const PROVIDER_REGISTRATION_AGREEMENT_CHECKBOX =
  `我已阅读并同意${PROVIDER_REGISTRATION_AGREEMENT_LABEL}。`;

/** 入驻页补充说明：注册协议已在前序环节确认 */
export const PROVIDER_ONBOARDING_REGISTRATION_ACK =
  `您注册账号时已同意《${PROVIDER_USER_AGREEMENT_TITLE}》和《${PROVIDER_PRIVACY_TITLE}》。`;

/** 任务领取确认 */
export const PROVIDER_TASK_CLAIM_ACK =
  `确认领取即表示同意按${PROVIDER_ONBOARDING_AGREEMENT_LABEL}及本任务交付与验收要求履约；平台技术服务费按实际结算金额的 ${MARKETPLACE_PLATFORM_FEE_RATE * 100}% 收取。`;

/** 收益页费率说明 */
export const PROVIDER_EARNINGS_FEE_NOTE =
  `费率依据${PROVIDER_ONBOARDING_AGREEMENT_LABEL}；验收通过后按实际结算金额扣除平台技术服务费。`;

/** 充值勾选 / 支付确认 */
export const BRAND_RECHARGE_AGREEMENT_LABEL = `《${BRAND_USER_AGREEMENT_TITLE}》及《${BRAND_PREPAID_AGREEMENT_TITLE}》`;

export const DUAL_ACCOUNT_HINT =
  '词元账户用于 AI 能力消耗；投放账户用于媒体发布与接单结算。两类余额相互独立，不可混用或互相抵扣。';

export const TOKEN_ACCOUNT_HINT =
  '词元余额用于文章生成、GEO 分析、投放计划制定等 AI 任务，请在 Agent 云 Token 工场充值。';

export const DELIVERY_ACCOUNT_HINT =
  '投放余额用于媒体发布、接单任务验收结算等订单，须购买「汇智AIGC媒体收单平台投放服务预存」充值；不可提现，自账号发布不扣费。';

export const BRAND_NO_GUARANTEE_HINT =
  '平台提供撮合与技术服务，不保证曝光、收录、排名、转化或第三方平台审核结果。';

export const PROVIDER_NO_GUARANTEE_HINT =
  '平台不承诺订单数量、收益金额、账号数据或商业转化效果；请依约交付真实、合规成果。';

export const PROVIDER_FEE_EXAMPLE = {
  settlement: 1000,
  fee: 300,
  income: 700,
} as const;

export const RECHARGE_COMPLIANCE_SHORT = [
  '仅用于媒体投放订单结算，不可提现、不可转赠、不可代他人支付。',
  '警惕「兼职刷单」「代收代付」等诈骗与洗钱风险；付款前请确认商品名称与金额。',
] as const;

export const RECHARGE_PAY_FOOTER =
  '支付即表示确认购买媒体投放服务预存，并已知悉词元账户与投放账户相互独立。';

export const PUBLISH_BUDGET_FREEZE_HINT =
  '发布任务后将按展示预算冻结投放账户余额；验收通过后结算，未接单或撤回将按规则释放。';

export const PUBLISH_CONTENT_COMPLIANCE_HINT =
  '请确保任务需求、素材合法已取得授权；商业推广类任务应明确要求广告标识，特殊行业须附资质。';

export const PROVIDER_PAYOUT_COMPLIANCE_HINT =
  '收款账户实名须与身份证一致；平台可为反洗钱、税务核验要求补充材料，并线下审核打款。';

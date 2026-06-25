import {
  BRAND_NO_GUARANTEE_HINT,
  BRAND_PLATFORM_NAME,
  BRAND_USER_AGREEMENT_TITLE,
  DUAL_ACCOUNT_HINT,
  LEGAL_OPERATOR,
  MARKETPLACE_PLATFORM_FEE_RATE,
  PROVIDER_FEE_EXAMPLE,
  PROVIDER_NO_GUARANTEE_HINT,
  PROVIDER_PLATFORM_NAME,
  PROVIDER_PRIVACY_TITLE,
  PROVIDER_SERVICE_AGREEMENT_TITLE,
  PROVIDER_USER_AGREEMENT_TITLE,
  PUBLISH_CONTENT_COMPLIANCE_HINT,
} from './platform-legal-copy.js';

export { MARKETPLACE_PLATFORM_FEE_RATE };

export const PROVIDER_AGREEMENT_VERSION = 'V2026.06';
export const BRAND_AGREEMENT_VERSION = 'V2026.06';

export type AgreementSection = { title: string; paragraphs: string[] };
export type MarketplaceAgreement = {
  title: string;
  version: string;
  summary: string;
  sections: AgreementSection[];
};

const feePct = (MARKETPLACE_PLATFORM_FEE_RATE * 100).toFixed(0);
const { settlement, fee, income } = PROVIDER_FEE_EXAMPLE;

export const PROVIDER_USER_AGREEMENT: MarketplaceAgreement = {
  title: PROVIDER_USER_AGREEMENT_TITLE,
  version: PROVIDER_AGREEMENT_VERSION,
  summary: `适用于注册、登录及入驻审核通过前的基础服务；撮合交易、费率与结算规则以《${PROVIDER_SERVICE_AGREEMENT_TITLE}》为准。`,
  sections: [
    {
      title: '一、账户注册与安全',
      paragraphs: [
        `您注册${PROVIDER_PLATFORM_NAME}账号时，应使用真实手机号并妥善保管登录凭证。`,
        '未满 14 周岁不得注册；14 至 18 周岁须在监护人同意和指导下使用。',
      ],
    },
    {
      title: '二、基础服务边界',
      paragraphs: [
        '未通过入驻审核前，您通常仅可使用账号管理、资料维护、入驻申请、消息通知等有限功能。',
        PROVIDER_NO_GUARANTEE_HINT,
      ],
    },
    {
      title: '三、与入驻协议的关系',
      paragraphs: [
        `申请成为接单方、承接任务、交付成果、结算或提现的，须另行同意《${PROVIDER_SERVICE_AGREEMENT_TITLE}》。`,
        `个人信息处理规则见《${PROVIDER_PRIVACY_TITLE}》。`,
      ],
    },
    {
      title: '四、其他',
      paragraphs: [
        `运营主体：${LEGAL_OPERATOR}。完整协议已在平台公示，如有疑问请联系 contact@huizhihuyu.com。`,
      ],
    },
  ],
};

export const PROVIDER_PRIVACY_AGREEMENT: MarketplaceAgreement = {
  title: PROVIDER_PRIVACY_TITLE,
  version: PROVIDER_AGREEMENT_VERSION,
  summary: '说明平台如何收集、使用和保护您的个人信息，含注册、入驻审核、撮合履约与结算提现相关数据。',
  sections: [
    {
      title: '一、注册与入驻',
      paragraphs: [
        '注册时收集手机号码、验证码、设备与日志信息，用于账号创建、身份验证与安全风控。',
        '入驻申请时可能收集主体资质、媒体账号、案例作品、接单地区、联系人及收款信息，用于入驻审核与任务匹配。',
      ],
    },
    {
      title: '二、履约与结算',
      paragraphs: [
        '接单履约过程中可能处理交付物、沟通记录、订单与收益明细、提现账户信息，用于验收协同、结算、风控与争议处理。',
        '平台将采取合理安全措施保护您的个人信息，您可通过客服渠道行使查阅、更正、删除等权利。',
      ],
    },
    {
      title: '三、其他',
      paragraphs: [
        `运营主体：${LEGAL_OPERATOR}。完整隐私政策已在平台公示。`,
      ],
    },
  ],
};

export const PROVIDER_COOPERATION_AGREEMENT: MarketplaceAgreement = {
  title: PROVIDER_SERVICE_AGREEMENT_TITLE,
  version: PROVIDER_AGREEMENT_VERSION,
  summary: `入驻与撮合专项协议，与《${PROVIDER_USER_AGREEMENT_TITLE}》配套适用。平台按每笔验收通过的订单实际结算金额收取 ${feePct}% 平台技术服务费；不承诺订单数量、收益或转化效果。`,
  sections: [
    {
      title: '协议关系',
      paragraphs: [
        `您注册账号时已同意《${PROVIDER_USER_AGREEMENT_TITLE}》和隐私政策；本协议在您提交入驻申请时另行确认，规范入驻审核、撮合交易、费率、履约与结算。`,
        PROVIDER_NO_GUARANTEE_HINT,
      ],
    },
    {
      title: '一、入驻与资料真实性',
      paragraphs: [
        `您入驻${PROVIDER_PLATFORM_NAME}，应保证主体、媒体账号、案例、联系方式和收款信息真实、准确、可验证。`,
        PROVIDER_NO_GUARANTEE_HINT,
      ],
    },
    {
      title: '二、平台技术服务费',
      paragraphs: [
        `平台技术服务费 = 实际结算金额 × ${feePct}%；接单方可结算收益 = 实际结算金额 × ${100 - Number(feePct)}%。例如订单结算 ¥${settlement.toLocaleString('zh-CN')}，平台服务费 ¥${fee.toLocaleString('zh-CN')}，您可结算 ¥${income.toLocaleString('zh-CN')}。`,
        '未接单、发布方撤回、验收未通过而未形成结算的金额，不收取平台技术服务费。部分结算、退款或争议调整时，以最终实际结算金额为基数同步调整。',
        '您确认接单即视为已知悉该订单对应的服务费规则；费率调整原则上仅适用于生效日后新确认的订单。',
      ],
    },
    {
      title: '三、履约、验收、广告与第三方平台',
      paragraphs: [
        '确认接单后应依约独立完成原创、合规交付，不得转包任务、刷量、伪造截图、购买虚假互动或规避平台审核。',
        '提交完整交付物后 7 个自然日内发布方未验收、未修改、未维权的，视同验收合格并自动触发结算。',
        '商业推广、种草、测评、GEO 内容投放等任务，应依法标明「广告」「推广」「商业合作」等标识，并遵守第三方媒体平台规则。违规造成的损失和处罚由责任方承担。',
      ],
    },
    {
      title: '四、结算、提现与禁止绕单',
      paragraphs: [
        '订单经最终验收并完成风控审核后进入结算。平台可为反洗钱、税务、争议处理要求补充身份、收款或交易证明；涉嫌异常时可不经通知冻结提现。',
        '定制化交付物结算后，知识产权原则上不可撤销转让给发布方。不得绕过平台私下交易；绕单须承担双倍惩罚性违约金，作弊可扣除全部账户余额。',
      ],
    },
    {
      title: '五、其他',
      paragraphs: [
        `运营主体：${LEGAL_OPERATOR}。完整协议与隐私政策已在平台公示，如有疑问请联系 contact@huizhihuyu.com。`,
        '发生争议应优先通过平台留存证据协商；协商不成，按协议约定争议解决方式处理。',
      ],
    },
  ],
};

export const BRAND_TRANSACTION_AGREEMENT: MarketplaceAgreement = {
  title: BRAND_USER_AGREEMENT_TITLE,
  version: BRAND_AGREEMENT_VERSION,
  summary: `${BRAND_NO_GUARANTEE_HINT} ${DUAL_ACCOUNT_HINT}`,
  sections: [
    {
      title: '一、任务发布与服务边界',
      paragraphs: [
        `您通过${BRAND_PLATFORM_NAME}发布任务，应明确预算、交付物、验收标准、期限及必要素材，并保证品牌资料、商标、文案和指令真实合法且已获授权。`,
        '平台为撮合与交易协同服务提供方，不是接单方的雇主或内容共同发布者。',
        BRAND_NO_GUARANTEE_HINT,
      ],
    },
    {
      title: '二、投放账户与词元账户',
      paragraphs: [
        DUAL_ACCOUNT_HINT,
        '发布任务时，平台可按任务预算冻结投放账户余额；验收通过后按实际结算金额结算。投放余额不可提现、不可转赠。',
        '自账号矩阵发布不消耗投放账户余额。',
      ],
    },
    {
      title: '三、验收、退款与争议',
      paragraphs: [
        '接单方确认前可撤回任务并释放冻结预算；接单后不得无故取消，不得绕开平台私下变更价款。',
        '接单方提交完整交付物后 7 日内您未验收、未合理修改且未维权的，自动验收并触发结算；合理修改期间计时暂停。',
        '不得恶意拖延验收或滥用争议；平台可调处并直接执行结果，您对调处有异议的应向责任相对方另行主张。',
      ],
    },
    {
      title: '四、内容与合规',
      paragraphs: [
        PUBLISH_CONTENT_COMPLIANCE_HINT,
        `接单方平台技术服务费（当前为实际结算金额的 ${feePct}%）由平台从其收益中扣除，通常不额外增加您已确认的订单预算，除非发布前页面另有展示并经您确认。`,
      ],
    },
    {
      title: '五、其他',
      paragraphs: [
        `运营主体：${LEGAL_OPERATOR}。充值、发票与退款以届时页面规则为准；完整协议已在平台公示。`,
        '发生争议应优先通过平台客服与争议处理流程协商解决。',
      ],
    },
  ],
};

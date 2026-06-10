/** 资产预览区：交付说明（线下交付为主，可自行托管为辅） */
export const DEPLOY_BRIEF_BY_ARTIFACT_TYPE: Record<string, string> = {
  schema_jsonld:
    '默认随网页需求交由接单方部署；若客户自有站点，可复制 JSON-LD 嵌入页面 <head>。',
  json: '结构化数据草稿，随网页需求交付或由技术人员自行嵌入。',
  llms_txt: '随网页需求交付；若客户自有站点，上传到网站根目录 /llms.txt。',
  robots_patch: '随网页需求合并进 robots.txt；自行托管时按补丁说明更新。',
  text: '按网页需求说明交付给接单方或客户技术同事。',
};

/** 接单方基础身份证实名校验（格式校验，不对接三方实人认证） */

const ID_CARD_RE =
  /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;

const REAL_NAME_RE = /^[\u4e00-\u9fa5·]{2,20}$/;

export function normalizeIdCardNumber(raw: string): string {
  return raw.trim().toUpperCase();
}

export function maskIdCardNumber(idNumber: string): string {
  const n = normalizeIdCardNumber(idNumber);
  if (n.length < 8) return '****';
  return `${n.slice(0, 3)}***********${n.slice(-4)}`;
}

export function validateProviderIdentityInput(input: {
  realName: string;
  idNumber: string;
}): { ok: true; realName: string; idNumber: string } | { ok: false; error: string } {
  const realName = input.realName.trim();
  const idNumber = normalizeIdCardNumber(input.idNumber);

  if (!realName) return { ok: false, error: '请填写真实姓名' };
  if (!REAL_NAME_RE.test(realName)) return { ok: false, error: '姓名格式不正确' };
  if (!idNumber) return { ok: false, error: '请填写身份证号码' };
  if (!ID_CARD_RE.test(idNumber)) return { ok: false, error: '身份证号码格式不正确' };

  return { ok: true, realName, idNumber };
}

export function isProviderIdentityVerified(provider: {
  identityVerifiedAt?: Date | string | null;
}): boolean {
  return Boolean(provider.identityVerifiedAt);
}

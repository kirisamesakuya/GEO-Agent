/**
 * @deprecated 功能页不再常驻展示 Hermes 状态条。
 * 请使用 HermesSubmitGuardProvider + HermesSetupGuideModal，以及本机 Hermes 页「技能清单」。
 */
export { ensureHermesReadyForSubmit } from '../../lib/hermes-readiness-guard';

export default function HermesReadinessPanel() {
  return null;
}

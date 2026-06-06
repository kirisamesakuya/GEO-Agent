import type { EffectBaseline, EffectVerification } from '../../lib/content-item-meta';
import { EFFECT_JUDGMENT_LABEL } from '../../lib/article-effect-nav';

interface Props {
  baseline: EffectBaseline | null;
  verification: EffectVerification | null;
}

export default function ArticleEffectVerificationPanel({ baseline, verification }: Props) {
  if (!baseline && !verification) {
    return (
      <p className="text-xs text-[var(--neutral-text-03)]">
        暂无效果验证数据。可从排名监控「生成补缺文章」创建带复测计划的写作任务。
      </p>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--neutral-text-03)]">
        效果验证
      </p>
      {baseline && (
        <>
          <p>来源：排名缺口</p>
          <p>目标问题：{baseline.targetQuestions.join('、')}</p>
          <p>目标平台：{baseline.targetPlatforms.join('、')}</p>
          <p>发布前品牌提及率：{baseline.brandMentionRate}%</p>
          {baseline.competitorMentions.length > 0 && (
            <p>竞品出现：{baseline.competitorMentions.join('、')}</p>
          )}
        </>
      )}
      {verification && (
        <>
          {verification.publishUrl && (
            <p className="break-all">
              发布链接：
              <a href={verification.publishUrl} className="geo-link" target="_blank" rel="noreferrer">
                {verification.publishUrl}
              </a>
            </p>
          )}
          <p>
            当前判断：
            <strong>{EFFECT_JUDGMENT_LABEL[verification.overallJudgment] ?? verification.overallJudgment}</strong>
          </p>
          <ul className="space-y-1">
            {verification.scheduleDays.map((d) => {
              const cp = verification.checkpoints[String(d)];
              return (
                <li key={d} className="rounded px-2 py-1 bg-[var(--neutral-bg-03)]">
                  T+{d}：
                  {cp?.status === 'done'
                    ? `已完成 · 提及率 ${cp.brandMentionRate ?? '—'}% · ${EFFECT_JUDGMENT_LABEL[cp.judgment ?? 'pending'] ?? cp.judgment}`
                    : cp?.status === 'scheduled'
                      ? `计划于 ${cp.scheduledAt?.slice(0, 10) ?? '—'}`
                      : '待复测'}
                </li>
              );
            })}
          </ul>
          <p className="text-[10px] text-[var(--neutral-text-03)] mt-2">
            结果为采样对比，不代表 AI 平台稳定推荐；建议结合 7/14/30 天复测持续观察。
          </p>
        </>
      )}
    </div>
  );
}

import type { ReactNode } from 'react';

interface FieldLimitLabelProps {
  label: string;
  className?: string;
}

/** 带字数限制的字段标签（计数见 FieldCharLimitBox） */
export function FieldLimitLabel({ label, className = '' }: FieldLimitLabelProps) {
  return <span className={`geo-label ${className}`.trim()}>{label}</span>;
}

interface FieldCharCounterProps {
  current: number;
  max: number;
  unit?: '字' | '条';
  /** 嵌入输入框右下角；false 时用于列表等非输入场景 */
  inline?: boolean;
  multiline?: boolean;
}

function counterColorClass(current: number, max: number) {
  const atLimit = current >= max;
  const nearLimit = !atLimit && current >= Math.floor(max * 0.9);
  if (atLimit) return 'text-[var(--color-danger)]';
  if (nearLimit) return 'text-amber-700';
  return 'text-[var(--neutral-text-03)]';
}

/** 已输入字数/条数计数 */
export function FieldCharCounter({
  current,
  max,
  unit = '字',
  inline = false,
  multiline = false,
}: FieldCharCounterProps) {
  const color = counterColorClass(current, max);
  const text = inline ? `${current}/${max}` : `已输入 ${current}/${max} ${unit}`;

  if (inline) {
    return (
      <span
        className={`pointer-events-none absolute right-2.5 tabular-nums text-[10px] leading-none ${color} ${
          multiline ? 'bottom-2' : 'top-1/2 -translate-y-1/2'
        }`}
        aria-hidden
      >
        {text}
      </span>
    );
  }

  return (
    <span className={`text-[10px] tabular-nums shrink-0 ${color}`}>{text}</span>
  );
}

interface FieldCharLimitBoxProps {
  current: number;
  max: number;
  unit?: '字' | '条';
  multiline?: boolean;
  className?: string;
  children: ReactNode;
}

/** 包裹 input/textarea，在框内右下角显示字数计数 */
export function FieldCharLimitBox({
  current,
  max,
  unit = '字',
  multiline = false,
  className = '',
  children,
}: FieldCharLimitBoxProps) {
  return (
    <div className={`relative ${className}`.trim()}>
      {children}
      <FieldCharCounter current={current} max={max} unit={unit} inline multiline={multiline} />
    </div>
  );
}

/** 输入框右侧为计数预留的内边距 */
export function fieldCharLimitInputClass(multiline = false) {
  return multiline ? 'geo-input-has-counter-multiline' : 'geo-input-has-counter';
}

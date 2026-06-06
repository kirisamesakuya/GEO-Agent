import { ALL_INDUSTRY_OPTIONS, INDUSTRY_GROUPS } from '../../lib/industry-categories';

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

export default function IndustrySelect({ value, onChange, className, id }: Props) {
  const showCustom = Boolean(value) && !ALL_INDUSTRY_OPTIONS.includes(value);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">请选择行业门类</option>
      {showCustom && <option value={value}>{value}（当前）</option>}
      {INDUSTRY_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

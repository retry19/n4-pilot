import { Check } from 'lucide-react';

export function Choice({
  title,
  description,
  selected,
  onSelect,
  badge,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
}) {
  return (
    <button type="button" className="choice" aria-pressed={selected} onClick={onSelect}>
      <span className="grow">
        <span className="choice__title">
          {title}
          {badge ? <span className="estimate-tag">{badge}</span> : null}
        </span>
        <span className="choice__desc">{description}</span>
      </span>
      <span className="choice__check" aria-hidden>
        {selected ? <Check size={20} /> : null}
      </span>
    </button>
  );
}

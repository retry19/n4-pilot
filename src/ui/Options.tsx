import { CheckCircle2, XCircle } from 'lucide-react';

export interface OptionView {
  id: string;
  text: string;
}

/**
 * Answer options. After answering, the correct option and the learner's choice
 * stay visible with icons + text — never color alone.
 */
export function OptionList({
  options,
  selected,
  correct,
  answered,
  onSelect,
  disabled,
  japanese,
}: {
  options: OptionView[];
  selected: string | null;
  correct: string;
  answered: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
  japanese?: boolean;
}) {
  return (
    <div className="options" role="radiogroup" aria-label="Pilihan jawaban">
      {options.map((option, index) => {
        const isSelected = selected === option.id;
        const isCorrect = option.id === correct;
        const stateClass = answered
          ? isCorrect
            ? 'option--correct'
            : isSelected
              ? 'option--wrong'
              : ''
          : isSelected
            ? 'option--selected'
            : '';
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`option ${stateClass}`}
            onClick={() => onSelect(option.id)}
            disabled={disabled || answered}
          >
            <span className="option__key" aria-hidden>
              {String.fromCharCode(65 + index)}
            </span>
            <span className={`grow ${japanese ? 'option__jp' : ''}`} lang={japanese ? 'ja' : undefined}>
              {option.text}
            </span>
            {answered && isCorrect ? (
              <CheckCircle2 size={20} className="option__mark" style={{ color: 'var(--success)' }} aria-label="jawaban benar" />
            ) : null}
            {answered && isSelected && !isCorrect ? (
              <XCircle size={20} className="option__mark" style={{ color: 'var(--danger)' }} aria-label="jawabanmu" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleHelp, Lightbulb, XCircle } from 'lucide-react';
import type { Concept, FuriganaMode, SessionRecord, StudyCard } from '../core/types.ts';
import { DOMAIN_LABEL, ERROR_CAUSE, ITEM_TYPE_LABEL } from '../core/types.ts';
import { stripRuby } from '../core/ruby.ts';
import { formatMinutes } from '../core/date.ts';
import type { AnswerResult } from '../state/store.ts';
import { JapaneseText } from './JapaneseText.tsx';
import { AudioButton } from './AudioButton.tsx';
import { OptionList } from './Options.tsx';
import { Sheet } from './Sheet.tsx';
import { Chip } from './common.tsx';

const CJK = /[\u3000-\u30ff\u3400-\u9fff\uff66-\uff9f]/;

function domainTone(domain: StudyCard['domain']): 'info' | 'success' | 'warning' | 'neutral' {
  if (domain === 'listening') return 'warning';
  if (domain === 'reading') return 'success';
  return 'info';
}

export function CardView({
  card,
  furigana,
  exam = false,
  index,
  total,
  onAnswer,
  onNext,
  nextLabel = 'Lanjut',
}: {
  card: StudyCard;
  furigana: FuriganaMode;
  exam?: boolean;
  index?: number;
  total?: number;
  onAnswer: (optionId: string, ms: number) => AnswerResult | null;
  onNext: () => void;
  nextLabel?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const startedAt = useRef(Date.now());
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSelected(null);
    setResult(null);
    setWhyOpen(false);
    startedAt.current = Date.now();
  }, [card.key]);

  const answered = Boolean(result);
  const isListening = card.domain === 'listening';

  const submit = () => {
    if (!selected || answered) return;
    const ms = Date.now() - startedAt.current;
    const answer = onAnswer(selected, ms);
    setResult(answer);
    window.setTimeout(() => nextRef.current?.focus(), 30);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!answered && /^[1-4]$/.test(event.key)) {
        const option = card.options[Number(event.key) - 1];
        if (option) {
          event.preventDefault();
          setSelected(option.id);
        }
      } else if (event.key === 'Enter') {
        if (!answered && selected) {
          event.preventDefault();
          submit();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const promptText = card.prompt.text ?? '';
  const renderPrompt = () => {
    if (isListening) {
      return (
        <div className="stack-sm">
          {card.prompt.context ? <p className="prompt-context">{card.prompt.context}</p> : null}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="card__title">Audio</span>
            {card.audio ? (
              <AudioButton
                text={card.audio}
                label={exam ? 'Putar sekali' : 'Putar audio'}
                allowSpeed={!exam}
                once={exam}
              />
            ) : null}
            <p className="caption">
              {exam ? 'Di ujian, audio hanya diputar sekali.' : 'Boleh diulang. Transcript muncul setelah kamu menjawab.'}
            </p>
          </div>
          <p className="prompt-question">{card.prompt.question}</p>
        </div>
      );
    }

    if (card.domain === 'reading') {
      return (
        <div className="stack-sm">
          <span className="card__title">{card.prompt.text}</span>
          <div className="passage" tabIndex={0} aria-label="Teks bacaan">
            <JapaneseText text={card.prompt.context ?? ''} mode={furigana} />
          </div>
          <p className="prompt-question">{card.prompt.question}</p>
        </div>
      );
    }

    if (card.prompt.audioFirst) {
      return (
        <div className="stack-sm">
          <p className="prompt-context">{card.prompt.context}</p>
          {card.audio ? <AudioButton text={card.audio} label="Putar audio" /> : null}
          <p className="prompt-question">{card.prompt.question}</p>
        </div>
      );
    }

    if (promptText) {
      return (
        <div className="stack-sm">
          <p className={`prompt-question ${CJK.test(promptText) ? 'jp prompt-jp--small' : ''}`} lang={CJK.test(promptText) ? 'ja' : undefined}>
            {promptText}
          </p>
          {card.prompt.question && card.prompt.question !== 'Pilih bentuk yang tepat.' ? (
            <p className="prompt-context">{card.prompt.question}</p>
          ) : null}
        </div>
      );
    }

    return (
      <div className="stack-sm">
        {card.prompt.context ? <p className="prompt-context">{card.prompt.context}</p> : null}
        <JapaneseText text={card.prompt.ja ?? ''} mode={furigana} className="prompt-jp" as="p" />
        {card.prompt.reading && stripRuby(card.prompt.ja ?? '') !== card.prompt.reading ? (
          <p className="prompt-reading" lang="ja">
            {card.prompt.reading}
          </p>
        ) : null}
        <p className="prompt-question">{card.prompt.question}</p>
      </div>
    );
  };

  const showJapaneseOptions = isListening || card.domain === 'grammar' || card.domain === 'reading';

  return (
    <div className="card-face">
      <div className="row wrap" style={{ gap: 8 }}>
        <Chip tone={domainTone(card.domain)}>{DOMAIN_LABEL[card.domain]}</Chip>
        <span className="caption">{ITEM_TYPE_LABEL[card.itemType]}</span>
        {index !== undefined && total !== undefined ? (
          <span className="caption" style={{ marginLeft: 'auto' }}>
            {index + 1} / {total}
          </span>
        ) : null}
      </div>

      {renderPrompt()}

      {!isListening && card.audio ? (
        <div>
          <AudioButton text={card.audio} label="Dengar" allowSpeed />
        </div>
      ) : null}

      <OptionList
        options={card.options}
        selected={selected}
        correct={card.correct}
        answered={answered}
        onSelect={setSelected}
        japanese={showJapaneseOptions}
      />

      {answered && result ? (
        <section className={`feedback ${result.correct ? 'feedback--correct' : 'feedback--wrong'}`} aria-live="polite">
          <div className="feedback__head">
            {result.correct ? (
              <CheckCircle2 size={20} aria-hidden style={{ color: 'var(--success)' }} />
            ) : (
              <XCircle size={20} aria-hidden style={{ color: 'var(--danger)' }} />
            )}
            <span>{result.correct ? 'Benar' : 'Belum tepat'}</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setWhyOpen(true)}
            >
              <CircleHelp size={14} aria-hidden /> Kenapa?
            </button>
          </div>
          <p className="feedback__why">{result.explanation}</p>
          {result.contrast ? <p className="feedback__why muted">{result.contrast}</p> : null}
          {result.evidence ? (
            <div className="feedback__evidence">
              <strong style={{ display: 'block', marginBottom: 4 }}>
                {isListening ? 'Transkrip' : 'Bukti dari teks'}
              </strong>
              <span className="jp" lang="ja" style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>
                {result.evidence}
              </span>
            </div>
          ) : null}
          {!result.correct && result.cause ? (
            <div className="feedback__evidence" style={{ borderLeftColor: 'var(--warning)' }}>
              <strong style={{ display: 'block', marginBottom: 2 }}>{ERROR_CAUSE[result.cause].label}</strong>
              {ERROR_CAUSE[result.cause].remediation}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="session__footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <div className="session__footer-inner">
          {!answered ? (
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={submit} disabled={!selected}>
              {selected ? 'Jawab' : 'Pilih satu jawaban'}
            </button>
          ) : (
            <button ref={nextRef} type="button" className="btn btn--primary btn--block btn--lg" onClick={onNext}>
              {nextLabel} <ArrowRight size={18} aria-hidden />
            </button>
          )}
          <p className="caption center" aria-hidden>
            Tip: tekan 1–4 untuk memilih, Enter untuk menjawab.
          </p>
        </div>
      </div>

      <Sheet
        open={whyOpen}
        onClose={() => setWhyOpen(false)}
        title="Kenapa jawabannya begitu?"
        description={card.prompt.question}
      >
        <div className="stack">
          <p style={{ lineHeight: 1.6 }}>{card.explanation}</p>
          {card.contrast ? (
            <div className="example">
              <strong>Bandingkan</strong>
              <p style={{ marginTop: 4 }}>{card.contrast}</p>
            </div>
          ) : null}
          {result && !result.correct && result.cause ? (
            <div className="banner banner--warning">
              <AlertTriangle size={18} aria-hidden />
              <div>
                <strong className="banner__title">{ERROR_CAUSE[result.cause].label}</strong>
                {ERROR_CAUSE[result.cause].hint} {ERROR_CAUSE[result.cause].remediation}
              </div>
            </div>
          ) : null}
          <div className="banner banner--info">
            <Lightbulb size={18} aria-hidden />
            <div>
              Ini penjelasan dari konten kanonik, bukan AI. Kalau terasa salah, laporkan itemnya dari menu
              Profil → Tentang.
            </div>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

export function ConceptView({
  concept,
  furigana,
  onNext,
}: {
  concept: Concept;
  furigana: FuriganaMode;
  onNext: () => void;
}) {
  const hasExamples = concept.examples.length > 0;
  return (
    <div className="card-face">
      <div className="row wrap">
        <Chip tone="info">{DOMAIN_LABEL[concept.domain]}</Chip>
        <span className="caption">{concept.title}</span>
      </div>

      <div className="stack-sm">
        <JapaneseText text={concept.heading} mode={furigana} className="concept-head" as="p" />
        {concept.reading ? <p className="prompt-reading">{concept.reading}</p> : null}
        {concept.audio ? <AudioButton text={concept.audio} label="Dengar" allowSpeed /> : null}
      </div>

      <p className="concept-meaning">{concept.meaning}</p>
      {concept.detail ? <p className="concept-detail">{concept.detail}</p> : null}

      {hasExamples ? (
        <div className="example-list">
          {concept.examples.map((example) => (
            <div className="example" key={example.id}>
              <JapaneseText text={example.ja} mode={furigana} className="example__ja" as="p" />
              <p className="example__reading" lang="ja">
                {example.reading}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {concept.contrast ? (
        <div className="disclosure">
          <details>
            <summary>Bandingkan dengan pola lain</summary>
            <div className="disclosure__body">{concept.contrast}</div>
          </details>
        </div>
      ) : null}

      {concept.note ? (
        <div className="banner banner--info">
          <Lightbulb size={18} aria-hidden />
          <div>{concept.note}</div>
        </div>
      ) : null}

      <div className="session__footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <div className="session__footer-inner">
          <button type="button" className="btn btn--primary btn--block btn--lg" onClick={onNext}>
            Coba 1 soal <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecapView({
  record,
  insight,
  nextReview,
  onFinish,
  finishing,
}: {
  record: SessionRecord;
  insight: string;
  nextReview: string;
  onFinish: () => void;
  finishing?: boolean;
}) {
  const answered = record.answers.length;
  const correct = record.answers.filter((answer) => answer.correct).length;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;
  const started = new Date(record.startedAt).getTime();
  const minutes = Math.max(1, Math.round((Date.now() - started) / 60_000));
  return (
    <div className="recap">
      <div className="stack-sm">
        <span className="eyebrow">Sesi selesai</span>
        <h2 style={{ fontSize: 'var(--text-h1)' }}>
          {accuracy === null ? 'Sesi pertama tersimpan.' : correct >= answered * 0.7 ? 'Kerja yang bagus.' : 'Ini data, bukan label.'}
        </h2>
        <p className="muted">Tidak ada confetti. Yang penting: besok kamu tahu harus mulai dari mana.</p>
      </div>

      <div className="card">
        <div className="row-between">
          <div>
            <span className="card__title">Akurasi</span>
            <p className="recap__score">{accuracy === null ? '—' : `${accuracy}%`}</p>
          </div>
          <div className="stat-grid" style={{ flex: 1, maxWidth: 220 }}>
            <div className="stat">
              <span className="stat__value">{correct}</span>
              <span className="stat__label">benar</span>
            </div>
            <div className="stat">
              <span className="stat__value">{answered}</span>
              <span className="stat__label">jawaban</span>
            </div>
          </div>
        </div>
        <div className="card__divider" />
        <div className="recap__list">
          <div className="recap__row">
            <span>Waktu</span>
            <strong className="tabular">{formatMinutes(minutes)}</strong>
          </div>
          <div className="recap__row">
            <span>Review berikutnya</span>
            <strong>{nextReview}</strong>
          </div>
          <div className="recap__row" style={{ borderBottom: 'none' }}>
            <span>Rencana besok</span>
            <strong>Sesi berikutnya tetap ±{record.plan.estimatedMinutes} menit</strong>
          </div>
        </div>
      </div>

      <div className="insight">
        <Lightbulb size={20} aria-hidden style={{ flex: 'none' }} />
        <div>
          <strong style={{ display: 'block', marginBottom: 2 }}>Satu insight</strong>
          {insight}
        </div>
      </div>

      <button type="button" className="btn btn--primary btn--block btn--lg" onClick={onFinish} disabled={finishing}>
        {finishing ? 'Menyimpan…' : 'Kembali ke Hari Ini'}
      </button>
    </div>
  );
}

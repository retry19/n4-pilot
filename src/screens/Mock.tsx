import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Info,
  Play,
  Timer,
  X,
} from 'lucide-react';
import type { MockAnswer, MockReport, MockSectionId, StudyCard } from '../core/types.ts';
import { EXAM, ITEM_TYPE_LABEL, MOCK_SECTIONS } from '../core/types.ts';
import { formatClock, formatDate, formatDateLong, todayISO } from '../core/date.ts';
import { stripRuby } from '../core/ruby.ts';
import { MOCK_FORMS, MOCK_FORM_BY_ID } from '../content/index.ts';
import { useActions, useApp, mockRemainingSeconds } from '../state/store.ts';
import { planFor, readinessFor } from '../state/derive.ts';
import { navigate } from '../lib/router.ts';
import { useNow } from '../ui/JapaneseText.tsx';
import { AudioButton } from '../ui/AudioButton.tsx';
import { JapaneseText } from '../ui/JapaneseText.tsx';
import { OptionList } from '../ui/Options.tsx';
import { Sheet } from '../ui/Sheet.tsx';
import { Banner, Chip, EmptyState, GateRow, PageHead, RangeBar } from '../ui/common.tsx';

export function MockOverviewScreen({ formId }: { formId: string }) {
  const data = useApp((store) => store.data);
  const actions = useActions();
  const form = MOCK_FORM_BY_ID.get(formId);
  const [ready, setReady] = useState(false);
  if (!form) {
    return (
      <main className="app-main" id="main" tabIndex={-1}>
        <EmptyState title="Form tidak ditemukan" body="Pilih mock dari Latihan." action={<button className="btn btn--primary" onClick={() => navigate('/practice')}>Kembali</button>} />
      </main>
    );
  }
  const attempts = data.mocks.filter((mock) => mock.formId === form.id);
  const last = attempts.at(-1);
  const active = data.activeMock;
  const totalItems = form.sections.vocabulary.length + form.sections.grammar_reading.length + form.sections.listening.length;

  return (
    <main className="app-main" id="main" tabIndex={-1}>
      <div className="row" style={{ marginBottom: 8 }}>
        <button type="button" className="icon-btn" onClick={() => navigate('/practice')} aria-label="Kembali">
          <ArrowLeft size={20} aria-hidden />
        </button>
        <span className="beta-badge">full mock</span>
      </div>
      <PageHead
        eyebrow={`Mock ${form.variant} · ${formatDate(todayISO())}`}
        title={`${form.label} · ${totalItems} soal`}
        description="Timer ketat, audio sekali, tanpa lookup. Pause hanya antar-seksi."
      />

      <div className="stack">
        <div className="card stack-sm">
          <span className="card__title">Aturan</span>
          <ul className="stack-xs" style={{ fontSize: 14, lineHeight: 1.6 }}>
            <li>• 3 seksi: 25 menit kosakata, 55 menit grammar &amp; bacaan, 35 menit menyimak.</li>
            <li>• Listening diputar sekali. Tidak ada replay.</li>
            <li>• Tidak ada pengurangan nilai — jawab semua.</li>
            <li>• Kamu bisa keluar, tetapi timer tetap berjalan.</li>
            <li>• Auto-submit saat waktu habis. Jawaban yang sudah dipilih tetap tersimpan.</li>
          </ul>
        </div>

        <div className="card stack-sm">
          <span className="card__title">Seksi</span>
          {MOCK_SECTIONS.map((section) => (
            <div className="mock-row" key={section.id}>
              <div>
                <strong>{section.label}</strong>
                <p className="caption">{form.sections[section.id].length} soal</p>
              </div>
              <span className="tabular" style={{ fontWeight: 700 }}>
                {section.minutes} menit
              </span>
            </div>
          ))}
        </div>

        <Banner tone="warning" title="Ini form beta">
          Jumlah item belum setara bentuk resmi JLPT. Timer dan struktur seksi mengikuti format 2026. Skor adalah
          estimasi, bukan skor resmi.
        </Banner>

        {active ? (
          <Banner
            tone="info"
            title={active.formId === form.id ? 'Mock sedang berjalan' : 'Ada mock lain yang berjalan'}
            action={
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => navigate(`/mock/${active.formId}/run`)}
              >
                Lanjutkan mock
              </button>
            }
          >
            Timer tetap berjalan sampai kamu menyelesaikan atau membatalkan mock.
          </Banner>
        ) : null}

        {last ? (
          <div className="card stack-sm">
            <div className="row-between">
              <div>
                <span className="card__title">Percobaan terakhir</span>
                <p style={{ fontSize: 24, fontWeight: 800 }}>{last.report.total.estimate} / 180</p>
              </div>
              <Chip tone={last.report.status === 'above' ? 'success' : 'warning'}>
                {last.report.status === 'above' ? 'di atas gate' : 'ada gate di bawah'}
              </Chip>
            </div>
            <p className="caption">{formatDateLong(last.submittedAt.slice(0, 10))}</p>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => navigate(`/mock/${form.id}/report`)}>
              Lihat laporan &amp; pembahasan
            </button>
          </div>
        ) : null}

        <div className="card stack-sm">
          <label className="checkbox">
            <input type="checkbox" checked={ready} onChange={(event) => setReady(event.target.checked)} />
            <span>Saya siap. Saya akan menyelesaikan dalam satu duduk (±115 menit + istirahat).</span>
          </label>
          <button
            type="button"
            className="btn btn--primary btn--block btn--lg"
            disabled={!ready || Boolean(active)}
            onClick={() => {
              if (actions.startMock(form.id)) navigate(`/mock/${form.id}/run`);
            }}
          >
            <Play size={18} aria-hidden /> Mulai {form.label}
          </button>
          {active ? <p className="caption">Selesaikan atau batalkan mock yang sedang berjalan dulu.</p> : null}
        </div>
      </div>
    </main>
  );
}

export function MockRunnerScreen({ formId }: { formId: string }) {
  const data = useApp((store) => store.data);
  const actions = useActions();
  const now = useNow(1000);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const ended = useRef(false);
  const form = MOCK_FORM_BY_ID.get(formId);
  const active = data.activeMock;

  const remaining = active ? mockRemainingSeconds(active, now) : 0;
  const breakRemaining = (() => {
    if (!active || active.phase !== 'break' || !active.breakStartedAt) return 0;
    return Math.max(0, 600 - Math.floor((now.getTime() - new Date(active.breakStartedAt).getTime()) / 1000));
  })();

  useEffect(() => {
    if (!active || active.phase !== 'running' || !form) return;
    if (remaining <= 0 && !ended.current) {
      ended.current = true;
      const last = active.sectionIndex >= MOCK_SECTIONS.length - 1;
      actions.finishMockSection();
      if (last) navigate(`/mock/${formId}/report`);
    }
  }, [remaining, active, actions, form, formId]);

  useEffect(() => {
    if (!active || active.phase !== 'break') return;
    if (breakRemaining <= 0) actions.beginMockSection();
  }, [breakRemaining, active, actions]);

  if (!form || !active) {
    return (
      <main className="app-main" id="main" tabIndex={-1}>
        <h1 className="sr-only">Mock ujian</h1>
        <EmptyState
          icon={<Timer size={22} aria-hidden />}
          title="Tidak ada mock berjalan"
          body="Mulai mock dari halaman Latihan. Timer akan berjalan sampai kamu menyelesaikan atau membatalkan."
          action={<button type="button" className="btn btn--primary" onClick={() => navigate('/practice')}>Kembali</button>}
        />
      </main>
    );
  }

  if (active.phase === 'break') {
    return (
      <div className="mock-shell">
        <div className="mock-break">
          <span className="eyebrow">Istirahat</span>
          <h1>10 menit. Berdiri, minum, jangan buka materi.</h1>
          <p className="muted">Timer seksi berikutnya belum berjalan.</p>
          <p className="break-timer tabular">{formatClock(breakRemaining)}</p>
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={() => actions.beginMockSection()}
          >
            Lanjut sekarang <ArrowRight size={18} aria-hidden />
          </button>
          <p className="caption">Seksi berikutnya dimulai otomatis saat hitungan habis.</p>
        </div>
      </div>
    );
  }

  const section = MOCK_SECTIONS[active.sectionIndex]!;
  const cards = form.sections[section.id];
  const index = Math.max(0, Math.min(active.currentCardIndex, cards.length - 1));
  const card = cards[index]!;
  const entry = active.answers[card.key];
  const answeredCount = cards.filter((item) => active.answers[item.key]?.optionId).length;
  const isLastSection = active.sectionIndex >= MOCK_SECTIONS.length - 1;

  const finishSection = () => {
    setFinishOpen(false);
    actions.finishMockSection();
    if (isLastSection) navigate(`/mock/${formId}/report`);
  };

  return (
    <div className="mock-shell">
      <h1 className="sr-only">{form.label} berjalan</h1>
      <header className="mock-header">
        <button type="button" className="icon-btn" onClick={() => setExitOpen(true)} aria-label="Keluar dari mock">
          <ArrowLeft size={20} aria-hidden />
        </button>
        <div>
          <p style={{ fontWeight: 800, fontSize: 14 }}>{section.label}</p>
          <p className="caption">
            Soal {index + 1} / {cards.length} · {answeredCount} terjawab
          </p>
        </div>
        <div className={`mock-timer ${remaining < 300 ? 'mock-timer--warning' : ''}`} aria-live="off">
          <Timer size={18} aria-hidden /> <span className="tabular">{formatClock(remaining)}</span>
        </div>
      </header>

      <main className="mock-body" id="main" tabIndex={-1}>
        <div className="card-face">
          <div className="row-between">
            <Chip tone="neutral">{ITEM_TYPE_LABEL[card.itemType]}</Chip>
            <button
              type="button"
              className={`btn ${entry?.flagged ? 'btn--secondary' : 'btn--ghost'} btn--sm`}
              onClick={() => actions.flagMock(card.key)}
              aria-pressed={entry?.flagged}
            >
              <Flag size={14} aria-hidden /> {entry?.flagged ? 'Ditandai' : 'Tandai'}
            </button>
          </div>

          <MockPrompt card={card} furigana={data.settings.furigana} />

          <OptionList
            options={card.options}
            selected={entry?.optionId ?? null}
            correct={card.correct}
            answered={false}
            onSelect={(optionId) => actions.answerMock(card.key, optionId)}
            japanese={card.domain !== 'vocab' && card.domain !== 'kanji' && card.domain !== 'kana'}
          />
          <p className="caption center">Tidak ada feedback sampai mock selesai. Ini disengaja.</p>
        </div>
      </main>

      <footer className="mock-footer">
        <button
          type="button"
          className="icon-btn"
          onClick={() => actions.setMockCardIndex(Math.max(0, index - 1))}
          disabled={index === 0}
          aria-label="Soal sebelumnya"
        >
          <ChevronLeft size={22} aria-hidden />
        </button>
        <button type="button" className="btn btn--secondary grow" onClick={() => setSheetOpen(true)}>
          Lembar jawaban
        </button>
        {index < cards.length - 1 ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => actions.setMockCardIndex(index + 1)}
            aria-label="Soal berikutnya"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => setFinishOpen(true)}>
            Selesai
          </button>
        )}
      </footer>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Lembar jawaban"
        description={`${answeredCount} dari ${cards.length} terjawab · ${section.label}`}
      >
        <div className="answer-sheet" role="list">
          {cards.map((item, itemIndex) => (
            <button
              key={item.key}
              type="button"
              role="listitem"
              className="answer-cell"
              data-answered={Boolean(active.answers[item.key]?.optionId)}
              data-flagged={Boolean(active.answers[item.key]?.flagged)}
              data-current={itemIndex === index}
              onClick={() => {
                actions.setMockCardIndex(itemIndex);
                setSheetOpen(false);
              }}
              aria-label={`Soal ${itemIndex + 1}${active.answers[item.key]?.optionId ? ', terjawab' : ', belum dijawab'}${active.answers[item.key]?.flagged ? ', ditandai' : ''}`}
            >
              {itemIndex + 1}
            </button>
          ))}
        </div>
        <div className="banner banner--info" style={{ marginTop: 16 }}>
          <Info size={18} aria-hidden />
          <div>Jawaban tersimpan otomatis. Kalau aplikasi tertutup, lanjutkan mock dan timer tetap berjalan.</div>
        </div>
      </Sheet>

      <Sheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title={isLastSection ? 'Kirim mock?' : 'Selesaikan seksi ini?'}
        description={`${cards.length - answeredCount} soal belum dijawab. Tidak ada pengurangan nilai, tetapi kosong tetap nol.`}
        footer={
          <>
            <button type="button" className="btn btn--primary btn--block" onClick={finishSection}>
              {isLastSection ? 'Kirim & lihat laporan' : 'Selesai seksi & istirahat'}
            </button>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => setFinishOpen(false)}>
              Kembali ke soal
            </button>
          </>
        }
      >
        <p className="muted" style={{ fontSize: 14 }}>
          Setelah dikirim, kamu akan melihat estimasi skor, gate, 3 wins, dan 3 leaks. Ini data, bukan label.
        </p>
      </Sheet>

      <Sheet
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Keluar dari mock?"
        description="Timer tetap berjalan. Kamu bisa melanjutkan nanti — atau membatalkan sesi ini."
        footer={
          <>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                setExitOpen(false);
                navigate('/practice');
              }}
            >
              Keluar, timer tetap berjalan
            </button>
            <button
              type="button"
              className="btn btn--danger btn--block"
              onClick={() => {
                actions.abortMock();
                setExitOpen(false);
                navigate('/practice');
              }}
            >
              <X size={16} aria-hidden /> Batalkan mock
            </button>
          </>
        }
      >
        <p className="caption">Membatalkan mock menghapus jawaban mock ini. Latihan harianmu tidak terpengaruh.</p>
      </Sheet>
    </div>
  );
}

function MockPrompt({ card, furigana }: { card: StudyCard; furigana: 'all' | 'tap' | 'off' }) {
  if (card.domain === 'listening') {
    return (
      <div className="stack-sm">
        <p className="prompt-context">{card.prompt.context}</p>
        <div className="card stack-sm">
          <span className="card__title">Audio · sekali putar</span>
          {card.audio ? <AudioButton text={card.audio} label="Putar audio" once /> : null}
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
  if (card.prompt.text) {
    return (
      <div className="stack-sm">
        <p className="prompt-question jp prompt-jp--small" lang="ja">
          {card.prompt.text}
        </p>
      </div>
    );
  }
  return (
    <div className="stack-sm">
      <JapaneseText text={card.prompt.ja ?? ''} mode={furigana} className="prompt-jp" as="p" />
      <p className="prompt-question">{card.prompt.question}</p>
    </div>
  );
}

export function MockReportScreen({ formId }: { formId: string }) {
  const data = useApp((store) => store.data);
  const [showAll, setShowAll] = useState(false);
  const form = MOCK_FORM_BY_ID.get(formId);
  const attempts = data.mocks.filter((mock) => mock.formId === formId);
  const attempt = attempts.at(-1);
  const today = todayISO();
  const readiness = readinessFor(data, today);
  const plan = planFor(data, today);

  if (!form || !attempt) {
    return (
      <main className="app-main" id="main" tabIndex={-1}>
        <h1 className="sr-only">Laporan mock</h1>
        <EmptyState
          title="Belum ada laporan"
          body="Selesaikan mock terlebih dahulu. Laporan dibangun dari jawaban yang benar-benar kamu pilih."
          action={<button type="button" className="btn btn--primary" onClick={() => navigate(`/mock/${formId}`)}>Lihat mock</button>}
        />
      </main>
    );
  }

  const report = attempt.report;
  const answers = new Map(attempt.answers.map((answer) => [answer.cardKey, answer]));
  const allCards = [...form.sections.vocabulary, ...form.sections.grammar_reading, ...form.sections.listening];
  const wrong = allCards.filter((card) => {
    const answer = answers.get(card.key);
    return !answer || answer.optionId !== card.correct;
  });
  const shown = showAll ? allCards : wrong.slice(0, 20);

  return (
    <main className="app-main" id="main" tabIndex={-1}>
      <h1 className="sr-only">Laporan {form.label}</h1>
      <div className="row" style={{ marginBottom: 8 }}>
        <button type="button" className="icon-btn" onClick={() => navigate('/practice')} aria-label="Kembali">
          <ArrowLeft size={20} aria-hidden />
        </button>
        <span className="beta-badge">laporan mock</span>
      </div>

      <div className="report-hero">
        <span className="eyebrow">
          {form.label} · {formatDate(attempt.submittedAt.slice(0, 10))}
        </span>
        <div>
          <p className="report-score">
            {report.total.estimate} <small>/ 180</small>
          </p>
          <p className="caption">
            rentang {report.total.low}–{report.total.high} · estimasi, bukan skor resmi JLPT
          </p>
        </div>
        <RangeBar
          low={report.total.low}
          high={report.total.high}
          estimate={report.total.estimate}
          max={180}
          gate={90}
          label={`Estimasi ${report.total.estimate} dari 180, rentang ${report.total.low}–${report.total.high}.`}
          tone={report.status === 'gate_failed' ? 'warning' : report.status === 'above' ? 'success' : undefined}
        />
        <div className={`banner ${report.status === 'above' ? 'banner--success' : report.status === 'gate_failed' ? 'banner--warning' : 'banner--info'}`}>
          {report.status === 'above' ? <CheckCircle2 size={18} aria-hidden /> : <AlertTriangle size={18} aria-hidden />}
          <div>
            <strong className="banner__title">
              {report.status === 'above'
                ? 'Estimasi di atas semua ambang'
                : report.status === 'gate_failed'
                  ? 'Total cukup atau belum, tetapi ada gate yang belum aman'
                  : 'Bukti belum lengkap'}
            </strong>
            {report.status === 'above'
              ? 'Tetap estimasi: JLPT memakai scaled score dan form berbeda.'
              : report.status === 'gate_failed'
                ? 'Ini yang paling menaikkan peluangmu minggu ini — bukan menambah materi baru.'
                : 'Kamu tidak menjawab cukup banyak soal untuk menyimpulkan apa pun.'}
          </div>
        </div>
      </div>

      <section className="card stack-sm" style={{ marginTop: 16 }} aria-labelledby="gates-heading">
        <div className="section-title">
          <h2 id="gates-heading">Gate</h2>
          <span className="caption">Total tidak menyelamatkan seksi</span>
        </div>
        <GateRow label="Knowledge + Reading" estimate={report.kr.estimate} max={EXAM.krMax} gate={EXAM.krGate} passing={report.gates.kr} />
        <GateRow label="Listening" estimate={report.listening.estimate} max={EXAM.listeningMax} gate={EXAM.listeningGate} passing={report.gates.listening} />
        <GateRow label="Total" estimate={report.total.estimate} max={EXAM.totalMax} gate={EXAM.passTotal} passing={report.gates.total} />
      </section>

      <section className="card stack-sm" style={{ marginTop: 16 }} aria-labelledby="sections-heading">
        <div className="section-title">
          <h2 id="sections-heading">Per seksi</h2>
          <span className="caption">{report.evidence} soal terjawab</span>
        </div>
        {report.sections.map((section) => (
          <div className="mock-row" key={section.section}>
            <div>
              <strong>{MOCK_SECTIONS.find((item) => item.id === section.section)?.label ?? section.section}</strong>
              <p className="caption">
                {section.correct}/{section.total} benar · {section.minutesUsed} menit
              </p>
            </div>
            <span className="tabular" style={{ fontWeight: 700 }}>
              {section.estimate}
            </span>
          </div>
        ))}
      </section>

      <div className="wl-grid" style={{ marginTop: 16 }}>
        <div className="wl wl--wins">
          <h3>3 wins</h3>
          <ul>
            {report.wins.map((win) => (
              <li key={win}>
                <CheckCircle2 size={14} aria-hidden style={{ color: 'var(--success)', flex: 'none', marginTop: 3 }} />
                {win}
              </li>
            ))}
          </ul>
        </div>
        <div className="wl wl--leaks">
          <h3>3 leaks</h3>
          <ul>
            {report.leaks.map((leak) => (
              <li key={leak}>
                <AlertTriangle size={14} aria-hidden style={{ color: 'var(--warning)', flex: 'none', marginTop: 3 }} />
                {leak}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="card stack-sm" style={{ marginTop: 16 }} aria-labelledby="types-heading">
        <div className="section-title">
          <h2 id="types-heading">Per tipe soal</h2>
          <span className="caption">Di mana kesalahannya menumpuk</span>
        </div>
        {report.itemTypes.map((entry) => (
          <div className="coverage-row" key={entry.itemType}>
            <span style={{ fontSize: 12 }}>{ITEM_TYPE_LABEL[entry.itemType]}</span>
            <div className="coverage-row__bar" aria-hidden>
              <span style={{ width: `${entry.total ? (entry.correct / entry.total) * 100 : 0}%` }} />
            </div>
            <span className="coverage-row__value">
              {entry.correct}/{entry.total}
            </span>
          </div>
        ))}
      </section>

      <section className="stack-sm" style={{ marginTop: 16 }} aria-labelledby="review-heading">
        <div className="section-title">
          <h2 id="review-heading">Pembahasan item</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowAll((value) => !value)}>
            {showAll ? 'Hanya yang salah' : 'Lihat semua'}
          </button>
        </div>
        {shown.length === 0 ? (
          <div className="card">
            <p className="caption">Tidak ada item yang perlu dibahas. Jangan overfit — lakukan mock lain dengan form berbeda.</p>
          </div>
        ) : (
          shown.map((card, index) => {
            const answer = answers.get(card.key) as MockAnswer | undefined;
            const isRight = answer?.optionId === card.correct;
            const yourText = card.options.find((option) => option.id === answer?.optionId)?.text ?? 'tidak dijawab';
            const rightText = card.options.find((option) => option.id === card.correct)?.text ?? '';
            const label = card.prompt.ja ? stripRuby(card.prompt.ja) : card.prompt.text ?? card.prompt.question;
            return (
              <details className={`review-item ${isRight ? 'review-item--right' : 'review-item--wrong'}`} key={card.key}>
                <summary>
                  <span className="review-item__num">{index + 1}</span>
                  <span className="grow">
                    <span className="jp" lang="ja">{label}</span>
                    {!isRight ? <span className="caption" style={{ display: 'block' }}>Jawabanmu: {yourText}</span> : null}
                  </span>
                  <Chip tone={isRight ? 'success' : 'danger'}>{isRight ? 'benar' : 'salah'}</Chip>
                </summary>
                <div className="review-item__body">
                  <p>
                    <strong>Benar:</strong> {rightText}
                  </p>
                  <p style={{ marginTop: 6 }}>{card.explanation}</p>
                  {card.contrast ? <p className="caption" style={{ marginTop: 6 }}>{card.contrast}</p> : null}
                </div>
              </details>
            );
          })
        )}
      </section>

      <section className="card stack-sm" style={{ marginTop: 16 }} aria-labelledby="next-heading">
        <div className="section-title">
          <h2 id="next-heading">Rencana 7 hari</h2>
          {plan?.nextMock ? <span className="caption">Mock berikutnya {formatDate(plan.nextMock.date)}</span> : null}
        </div>
        {readiness?.nextAction ? (
          <div className="banner banner--info">
            <Info size={18} aria-hidden />
            <div>
              <strong className="banner__title">{readiness.nextAction.title}</strong>
              {readiness.nextAction.detail}
            </div>
          </div>
        ) : null}
        <div className="stack-sm">
          {(readiness?.factors ?? []).map((factor) => (
            <div className="mock-row" key={factor.id}>
              <span>{factor.label}</span>
              <span className="caption">{factor.action}</span>
            </div>
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn btn--primary grow" onClick={() => navigate('/errors')}>
            Buka buku kesalahan
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/today')}>
            Hari Ini
          </button>
        </div>
      </section>

      <p className="caption" style={{ marginTop: 16, textAlign: 'center' }}>
        Ini estimasi dari mock beta, bukan skor JLPT resmi. Form berikutnya berbeda; gunakan tren, bukan satu angka.
      </p>
    </main>
  );
}

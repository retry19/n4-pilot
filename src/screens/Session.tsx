import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Clock, Pause, Play, X } from 'lucide-react';
import type { BlockId } from '../core/types.ts';
import { SESSION_MODES } from '../core/types.ts';
import { dominantCause, groupLabel } from '../core/errors.ts';
import { formatClock, relativeDay, todayISO } from '../core/date.ts';
import { CARD_BY_KEY, CURRICULUM } from '../content/index.ts';
import { useActions, useApp } from '../state/store.ts';
import { navigate } from '../lib/router.ts';
import { useNow } from '../ui/JapaneseText.tsx';
import { CardView, ConceptView, RecapView } from '../ui/StudyCard.tsx';
import { EmptyState } from '../ui/common.tsx';
import { Sheet } from '../ui/Sheet.tsx';

const BLOCK_LABEL: Record<BlockId, string> = {
  recall: 'Recall',
  review: 'Review',
  learn: 'Belajar',
  apply: 'Latihan',
  listening: 'Menyimak',
  prove: 'Timed',
  recap: 'Rangkuman',
};

const CONCEPT_BY_KEY = new Map(CURRICULUM.map((unit) => [unit.concept.key, unit.concept]));

export function SessionScreen() {
  const data = useApp((store) => store.data);
  const actions = useActions();
  const now = useNow(1000);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  const record = data.activeSession;

  const blockDots = useMemo(() => {
    if (!record) return [] as { block: BlockId; first: number; last: number }[];
    const map = new Map<BlockId, { block: BlockId; first: number; last: number }>();
    record.plan.steps.forEach((step, index) => {
      const existing = map.get(step.block);
      if (existing) existing.last = index;
      else map.set(step.block, { block: step.block, first: index, last: index });
    });
    return [...map.values()];
  }, [record]);

  useEffect(() => {
    document.title = 'Sesi · N4 Pilot';
  }, []);

  // Timed section drill: hard 10-minute budget, like a mini exam section.
  const drillMode = record?.plan.mode === 'drill';
  const drillElapsed = record ? Math.max(0, (now.getTime() - new Date(record.startedAt).getTime()) / 1000) : 0;
  const drillRemaining = drillMode ? Math.max(0, SESSION_MODES.drill.minutes * 60 - drillElapsed) : 0;
  const drillExpired = useRef(false);
  useEffect(() => {
    if (!drillMode || !record || drillRemaining > 0 || drillExpired.current) return;
    drillExpired.current = true;
    actions.completeSession();
    navigate('/today');
  }, [drillMode, drillRemaining, record, actions]);

  if (!record) {
    return (
      <main className="app-main" id="main" tabIndex={-1}>
        <h1 className="sr-only">Sesi belajar</h1>
        <EmptyState
          icon={<Play size={22} aria-hidden />}
          title="Tidak ada sesi aktif"
          body="Mulai sesi dari Hari Ini. Progres tidak akan hilang kalau kamu keluar di tengah jalan."
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/today')}>
              Kembali ke Hari Ini
            </button>
          }
        />
      </main>
    );
  }

  const step = record.plan.steps[record.cursor];
  if (!step) {
    return (
      <main className="app-main" id="main" tabIndex={-1}>
        <h1 className="sr-only">Sesi belajar</h1>
        <EmptyState
          icon={<Play size={22} aria-hidden />}
          title="Semua langkah sudah dijawab"
          body="Simpan sesi untuk memperbarui kesiapanmu."
          action={
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                actions.completeSession();
                navigate('/today');
              }}
            >
              Simpan & selesai
            </button>
          }
        />
      </main>
    );
  }

  const elapsed = Math.max(0, Math.round((now.getTime() - new Date(record.startedAt).getTime()) / 1000));
  const currentBlock = step.block;
  const dotState = (dot: { block: BlockId; first: number; last: number }): 'done' | 'active' | 'todo' => {
    if (record.cursor > dot.last) return 'done';
    if (record.cursor >= dot.first && record.cursor <= dot.last) return 'active';
    return 'todo';
  };

  const finish = () => {
    actions.completeSession();
    navigate('/today');
  };

  const nextReviewLabel = (() => {
    const dues = record.answers
      .map((answer) => data.cards[answer.cardKey]?.due)
      .filter((due): due is string => Boolean(due))
      .sort();
    const first = dues[0];
    if (!first) return 'besok';
    return relativeDay(todayISO(new Date(first)), todayISO());
  })();

  const sessionErrors = data.errors.filter((error) => error.at >= record.startedAt);
  const cause = dominantCause(sessionErrors);
  const correct = record.answers.filter((answer) => answer.correct).length;
  const answered = record.answers.length;
  const insight = (() => {
    if (answered === 0) return 'Sesi ini belum punya jawaban. Mulai dari 10 menit; konsistensi mengalahkan panjang.';
    if (cause) {
      const label = groupLabel(sessionErrors.find((error) => error.cause === cause)?.groupKey ?? `${cause}:`).label;
      return `Pola yang paling sering muncul: ${label}. Besok kita latih itu dulu, bukan menambah materi baru.`;
    }
    if (correct / answered >= 0.8) {
      return 'Akurasimu tinggi. Kami akan menaikkan kesulitan sedikit, bukan menambah waktu belajar.';
    }
    return 'Kesalahan hari ini bukan vonis. Besok kami ulang dengan contoh yang lebih kecil.';
  })();

  const card = step.cardKey ? CARD_BY_KEY.get(step.cardKey) : null;
  const concept = step.conceptKey ? CONCEPT_BY_KEY.get(step.conceptKey) : null;

  return (
    <div className="session">
      <h1 className="sr-only">Sesi belajar</h1>
      <header className="session__header">
        <button type="button" className="icon-btn" onClick={() => setExitOpen(true)} aria-label="Keluar dari sesi">
          <ArrowLeft size={20} aria-hidden />
        </button>
        <div className="session__meta">
          <span className="session__block">{BLOCK_LABEL[currentBlock]}</span>
          <span className="caption">
            {record.plan.mode === 'quick10' ? 'Quick 10' : record.plan.mode === 'recovery' ? 'Mulai lagi' : record.plan.mode === 'fixit' ? 'Fix-it' : 'Sesi'} ·{' '}
            langkah {Math.min(record.cursor + 1, record.plan.steps.length)}/{record.plan.steps.length}
          </span>
        </div>
        <span
          className={`session__timer ${drillMode && drillRemaining <= 120 ? 'mock-timer--warning' : ''}`}
          aria-label={drillMode ? `Sisa waktu ${formatClock(drillRemaining)}` : `Waktu berjalan ${formatClock(elapsed)}`}
        >
          <Clock size={15} aria-hidden />{' '}
          <span className="tabular">{formatClock(drillMode ? drillRemaining : elapsed)}</span>
        </span>
        <button type="button" className="icon-btn" onClick={() => setPauseOpen(true)} aria-label="Jeda sesi">
          <Pause size={18} aria-hidden />
        </button>
      </header>

      <div className="session__progress">
        <div className="block-dots" aria-hidden>
          {blockDots.map((dot) => (
            <span key={dot.block} className="block-dot" data-state={dotState(dot)} />
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <div className="progress progress--thin">
            <span style={{ width: `${(record.cursor / record.plan.steps.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {drillMode && drillRemaining <= 120 ? (
        <div style={{ padding: '0 var(--s-5)' }}>
          <div className="banner banner--warning" role="alert">
            <Clock size={18} aria-hidden />
            <div>
              Waktu drill hampir habis ({formatClock(drillRemaining)}). Jawab yang tersisa, lalu lihat rangkuman.
            </div>
          </div>
        </div>
      ) : null}

      <main className="session__body" id="main" tabIndex={-1}>
        {step.kind === 'concept' && concept ? (
          <ConceptView
            concept={concept}
            furigana={data.settings.furigana}
            onNext={() => actions.advanceStep()}
          />
        ) : null}

        {(step.kind === 'card' || step.kind === 'listening' || step.kind === 'reading') && card ? (
          <CardView
            card={card}
            furigana={data.settings.furigana}
            index={record.answers.length}
            total={record.plan.steps.filter((item) => item.kind === 'card').length}
            onAnswer={(optionId, ms) => actions.answerStep(step.id, optionId, ms)}
            onNext={() => actions.advanceStep()}
            nextLabel={
              step.block === 'listening'
                ? 'Lanjut'
                : record.cursor + 1 >= record.plan.steps.length - 1
                  ? 'Lihat rangkuman'
                  : 'Lanjut'
            }
          />
        ) : null}

        {step.kind === 'recap' ? (
          <RecapView
            record={record}
            insight={insight}
            nextReview={nextReviewLabel}
            onFinish={finish}
          />
        ) : null}

        {!card && !concept && step.kind !== 'recap' ? (
          <EmptyState
            title="Langkah tidak ditemukan"
            body="Konten mungkin berubah versi. Lewati langkah ini."
            action={
              <button type="button" className="btn btn--primary" onClick={() => actions.advanceStep()}>
                Lewati
              </button>
            }
          />
        ) : null}
      </main>

      <Sheet
        open={pauseOpen}
        onClose={() => setPauseOpen(false)}
        title="Jeda sesi?"
        description="Progres tersimpan. Timer berhenti sampai kamu kembali."
        footer={
          <>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                actions.leaveSession();
                setPauseOpen(false);
                navigate('/today');
              }}
            >
              Jeda & kembali nanti
            </button>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => setPauseOpen(false)}>
              Lanjut belajar
            </button>
          </>
        }
      >
        <p className="muted" style={{ fontSize: 14 }}>
          Sesi ini: {answered} jawaban · {correct} benar. Tidak ada yang hilang.
        </p>
      </Sheet>

      <Sheet
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Keluar dari sesi?"
        description="Kamu bisa lanjut nanti dari Hari Ini, atau menghapus sesi ini."
        footer={
          <>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                actions.leaveSession();
                setExitOpen(false);
                navigate('/today');
              }}
            >
              Simpan & keluar
            </button>
            <button
              type="button"
              className="btn btn--danger btn--block"
              onClick={() => {
                actions.discardSession();
                setExitOpen(false);
                navigate('/today');
              }}
            >
              <X size={16} aria-hidden /> Hapus sesi ini
            </button>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => setExitOpen(false)}>
              Lanjut belajar
            </button>
          </>
        }
      >
        <p className="muted" style={{ fontSize: 14 }}>
          Menghapus sesi tidak menghapus jawaban yang sudah tersimpan? Ya — review yang sudah dijawab tetap tercatat.
          Yang hilang hanya antrean sesi ini.
        </p>
      </Sheet>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import { isLeech } from '../core/fsrs.ts';
import { formatMinutes, todayISO } from '../core/date.ts';
import { useActions, useApp } from '../state/store.ts';
import { dueCards } from '../state/derive.ts';
import { navigate } from '../lib/router.ts';
import { CardView } from '../ui/StudyCard.tsx';
import { EmptyState } from '../ui/common.tsx';

type Tab = 'due' | 'overdue' | 'leech';

export function ReviewScreen() {
  const data = useApp((store) => store.data);
  const actions = useActions();
  const today = todayISO();

  const [tabs] = useState(() => {
    const all = dueCards(data);
    return {
      due: all,
      overdue: all.filter((card) => {
        const state = data.cards[card.key];
        return state ? todayISO(new Date(state.due)) < today : false;
      }),
      leech: all.filter((card) => {
        const state = data.cards[card.key];
        return state ? isLeech(state) : false;
      }),
    };
  });
  const [tab, setTab] = useState<Tab>('due');
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(0);

  const queue = tabs[tab];
  const card = queue[index];

  const counts = useMemo(
    () => ({ due: tabs.due.length, overdue: tabs.overdue.length, leech: tabs.leech.length }),
    [tabs],
  );

  const switchTab = (next: Tab) => {
    setTab(next);
    setIndex(0);
    setDone(0);
  };

  if (queue.length === 0) {
    return (
      <main className="app-main" id="main" tabIndex={-1}>
        <div className="row" style={{ marginBottom: 12 }}>
          <button type="button" className="icon-btn" onClick={() => navigate('/today')} aria-label="Kembali">
            <ArrowLeft size={20} aria-hidden />
          </button>
          <h1 style={{ fontSize: 'var(--text-h3)' }}>Review</h1>
        </div>
        <EmptyState
          icon={<CheckCircle2 size={22} aria-hidden />}
          title={tab === 'leech' ? 'Tidak ada leech' : 'Tidak ada review due'}
          body={
            tab === 'leech'
              ? 'Tidak ada kartu yang perlu diganti caranya. Bagus.'
              : 'Kamu bisa latihan ringan atau istirahat. Review tidak menumpuk — itu janji kami.'
          }
          action={
            <div className="stack-sm" style={{ width: '100%', maxWidth: 320 }}>
              <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/today')}>
                Kembali ke Hari Ini
              </button>
              <button type="button" className="btn btn--secondary btn--block" onClick={() => navigate('/library')}>
                Buka perpustakaan
              </button>
            </div>
          }
        />
      </main>
    );
  }

  if (!card) {
    return (
      <main className="app-main" id="main" tabIndex={-1}>
        <EmptyState
          icon={<CheckCircle2 size={22} aria-hidden />}
          title="Review selesai"
          body={`${done} kartu dijawab. Sisa ${queue.length - done} kartu menunggu di tab ini.`}
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/today')}>
              Kembali ke Hari Ini
            </button>
          }
        />
      </main>
    );
  }

  return (
    <main className="app-main" id="main" tabIndex={-1}>
      <div className="row" style={{ marginBottom: 8 }}>
        <button type="button" className="icon-btn" onClick={() => navigate('/today')} aria-label="Kembali">
          <ArrowLeft size={20} aria-hidden />
        </button>
        <div className="grow">
          <h1 style={{ fontSize: 'var(--text-h3)' }}>Review hari ini</h1>
          <p className="caption">
            {queue.length} kartu · sekitar {formatMinutes(Math.max(1, Math.round((queue.length * 24) / 60)))} · tidak
            ada tumpukan
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={() => navigate('/errors')} aria-label="Buku kesalahan">
          <RotateCcw size={18} aria-hidden />
        </button>
      </div>

      <div className="tabs" role="tablist" aria-label="Jenis review" style={{ marginBottom: 12 }}>
        {(
          [
            ['due', 'Due', counts.due],
            ['overdue', 'Terlambat', counts.overdue],
            ['leech', 'Leech', counts.leech],
          ] as [Tab, string, number][]
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="tabs__item"
            onClick={() => switchTab(id)}
          >
            {label} {count > 0 ? `· ${count}` : ''}
          </button>
        ))}
      </div>

      <div className="progress progress--thin" style={{ marginBottom: 16 }}>
        <span style={{ width: `${queue.length ? (index / queue.length) * 100 : 0}%` }} />
      </div>

      <CardView
        card={card}
        furigana={data.settings.furigana}
        index={index}
        total={queue.length}
        onAnswer={(optionId, ms) => {
          const result = actions.reviewAnswer(card.key, optionId, ms);
          setDone((value) => value + 1);
          return result;
        }}
        onNext={() => setIndex((value) => value + 1)}
        nextLabel={index + 1 >= queue.length ? 'Selesai' : 'Kartu berikutnya'}
      />

      <p className="caption center" style={{ marginTop: 16 }}>
        Kartu yang sudah dijawab akan kembali sesuai jadwal FSRS. Leech diubah caranya, bukan diulang terus.
      </p>
    </main>
  );
}

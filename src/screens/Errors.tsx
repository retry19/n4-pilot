import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Info, NotebookPen, Wrench } from 'lucide-react';
import type { ErrorCause, ErrorEvent } from '../core/types.ts';
import { ERROR_CAUSE } from '../core/types.ts';
import { groupErrors } from '../core/errors.ts';
import { formatDate, relativeDay, todayISO } from '../core/date.ts';
import { useActions, useApp } from '../state/store.ts';
import { navigate } from '../lib/router.ts';
import { Chip, EmptyState, PageHead } from '../ui/common.tsx';
import { Sheet } from '../ui/Sheet.tsx';

type StatusFilter = 'all' | 'open' | 'resolved';

export function ErrorsScreen() {
  const data = useApp((store) => store.data);
  const actions = useActions();
  const [status, setStatus] = useState<StatusFilter>('open');
  const [cause, setCause] = useState<ErrorCause | 'all'>('all');
  const [fixit, setFixit] = useState<{ keys: string[]; label: string } | null>(null);

  const groups = useMemo(() => {
    const filtered = data.errors.filter((error) => {
      if (status === 'open' && error.status === 'resolved') return false;
      if (status === 'resolved' && error.status !== 'resolved') return false;
      if (cause !== 'all' && error.cause !== cause) return false;
      return true;
    });
    return groupErrors(filtered);
  }, [data.errors, status, cause]);

  const causes = useMemo(() => {
    const set = new Set<ErrorCause>(data.errors.map((error) => error.cause));
    return [...set];
  }, [data.errors]);

  const startFixit = (keys: string[], label: string) => {
    const ok = actions.startFixitSession(keys, label);
    if (ok) navigate('/session');
    else actions.notify('Selesaikan sesi yang sedang berjalan dulu.');
  };

  return (
    <>
      <main className="app-main" id="main" tabIndex={-1}>
        <div className="row" style={{ marginBottom: 8 }}>
          <button type="button" className="icon-btn" onClick={() => navigate('/today')} aria-label="Kembali">
            <ArrowLeft size={20} aria-hidden />
          </button>
          <span className="grow" />
          <span className="beta-badge">buku kesalahan</span>
        </div>
        <PageHead
          eyebrow="Perbaikan"
          title="Kesalahan yang bisa diperbaiki"
          description="Kesalahan bukan tanda kamu bodoh. Ini petunjuk apa yang harus dilatih. Dikelompokkan berdasarkan penyebab, bukan nomor soal."
        />

        {data.errors.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={22} aria-hidden />}
            title="Belum ada kesalahan"
            body="Setelah kamu menjawab, kesalahan akan masuk ke sini dengan penyebab dan satu rekomendasi."
            action={
              <button type="button" className="btn btn--primary" onClick={() => navigate('/today')}>
                Mulai sesi
              </button>
            }
          />
        ) : (
          <div className="stack">
            <div className="filter-row" role="group" aria-label="Filter status">
              {(
                [
                  ['open', 'Terbuka'],
                  ['resolved', 'Selesai'],
                  ['all', 'Semua'],
                ] as [StatusFilter, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="filter-chip"
                  aria-pressed={status === id}
                  onClick={() => setStatus(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="filter-row" role="group" aria-label="Filter penyebab">
              <button type="button" className="filter-chip" aria-pressed={cause === 'all'} onClick={() => setCause('all')}>
                Semua penyebab
              </button>
              {causes.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="filter-chip"
                  aria-pressed={cause === item}
                  onClick={() => setCause(item)}
                >
                  {ERROR_CAUSE[item].label}
                </button>
              ))}
            </div>

            {groups.length === 0 ? (
              <EmptyState
                icon={<NotebookPen size={22} aria-hidden />}
                title="Tidak ada kesalahan di filter ini"
                body="Coba “Semua” untuk melihat riwayat yang sudah selesai."
              />
            ) : (
              groups.map((group) => (
                <section className="error-card" key={group.groupKey}>
                  <div className="error-card__head">
                    <div className="stack-xs">
                      <span className="error-card__title">{group.label}</span>
                      <span className="error-card__meta">
                        <Chip tone={group.open > 0 ? 'warning' : 'success'}>{group.open > 0 ? `${group.open} terbuka` : 'selesai'}</Chip>
                        <span>{group.count} kejadian</span>
                        <span>·</span>
                        <span>{relativeDay(group.lastAt.slice(0, 10), todayISO())}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => setFixit({ keys: group.items.map((item) => item.cardKey), label: group.label })}
                    >
                      <Wrench size={14} aria-hidden /> Fix-it
                    </button>
                  </div>

                  <p className="caption">{group.hint}</p>
                  <div className="error-detail">
                    <strong style={{ display: 'block', marginBottom: 4 }}>Yang dilakukan</strong>
                    {group.remediation}
                  </div>

                  <details className="disclosure">
                    <summary>Lihat soal &amp; jawaban</summary>
                    <div className="disclosure__body stack-sm">
                      {group.items.slice(0, 6).map((event) => (
                        <ErrorDetail key={event.id} event={event} />
                      ))}
                    </div>
                  </details>
                </section>
              ))
            )}

            <div className="banner banner--info">
              <Info size={18} aria-hidden />
              <div>
                <strong className="banner__title">Kapan dianggap selesai?</strong>
                Setelah kamu benar 2× dalam konteks berbeda, bukan karena mengulang soal yang sama.
              </div>
            </div>
          </div>
        )}
      </main>

      <Sheet
        open={Boolean(fixit)}
        onClose={() => setFixit(null)}
        title="Fix-it 10 menit"
        description={fixit?.label}
        footer={
          <>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                if (fixit) startFixit(fixit.keys, fixit.label);
                setFixit(null);
              }}
            >
              Mulai Fix-it <ArrowRight size={16} aria-hidden />
            </button>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => setFixit(null)}>
              Tidak sekarang
            </button>
          </>
        }
      >
        <div className="stack-sm">
          <p>Kami akan memakai item serupa, bukan mengulang soal yang persis sama.</p>
          <p className="caption">
            Fokus pada penyebab: {fixit ? ERROR_CAUSE[groupErrors(data.errors).find((group) => group.label === fixit.label)?.cause ?? 'unknown_word'].remediation : ''}
          </p>
        </div>
      </Sheet>
    </>
  );
}

function ErrorDetail({ event }: { event: ErrorEvent }) {
  return (
    <div className="stack-xs" style={{ paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
      <p style={{ fontWeight: 700, fontSize: 13 }}>{event.question}</p>
      <dl className="error-detail__row">
        <dt>Jawabanmu</dt>
        <dd style={{ color: 'var(--danger)' }}>{event.answerText}</dd>
      </dl>
      <dl className="error-detail__row">
        <dt>Benar</dt>
        <dd style={{ color: 'var(--success)' }}>{event.correctText}</dd>
      </dl>
      <dl className="error-detail__row">
        <dt>Penyebab</dt>
        <dd>
          {ERROR_CAUSE[event.cause].label} · {formatDate(event.at.slice(0, 10))}
        </dd>
      </dl>
    </div>
  );
}

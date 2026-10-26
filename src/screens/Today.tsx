import { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock,
  Library,
  NotebookPen,
  Play,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import { SESSION_MODES } from '../core/types.ts';
import { recommendedMode } from '../core/planner.ts';
import { diffDays, formatDate, formatMinutes, monthsUntil, relativeDay, todayISO, dayShort } from '../core/date.ts';
import { STATUS_COPY } from '../core/readiness.ts';
import { useActions, useApp } from '../state/store.ts';
import {
  dueCards,
  lastSession,
  nextDays,
  planFor,
  previewSession,
  readinessFor,
  sessionPools,
  weekFocus,
} from '../state/derive.ts';
import { navigate } from '../lib/router.ts';
import { useNow } from '../ui/JapaneseText.tsx';
import { useOnline } from '../lib/hooks.ts';
import { BottomNav, TopBar } from '../ui/Navigation.tsx';
import { Banner, Chip, RangeBar, Sparkline } from '../ui/common.tsx';
import { Sheet } from '../ui/Sheet.tsx';

export function TodayScreen() {
  const data = useApp((store) => store.data);
  const actions = useActions();
  const online = useOnline();
  const [whyOpen, setWhyOpen] = useState(false);
  useNow(60_000);

  const today = todayISO();
  const plan = planFor(data, today);
  const readiness = readinessFor(data, today);
  if (!plan || !data.goal) {
    return (
      <div className="app-main">
        <h1>Rencana belum ada</h1>
        <p className="muted">Selesaikan onboarding untuk mulai.</p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/onboarding')}>
          Mulai onboarding
        </button>
      </div>
    );
  }

  const mode = recommendedMode(plan.dailyBudgetMinutes, plan.recovery);
  const preview = previewSession(data, mode, today);
  const fallbackPreview = previewSession(data, 'quick10', today);
  const due = dueCards(data).length;
  const pools = sessionPools(data, plan, today);
  const openErrors = data.errors.filter((error) => error.status !== 'resolved').length;
  const last = lastSession(data);
  const lastAccuracy =
    last && last.answers.length > 0
      ? Math.round((last.answers.filter((answer) => answer.correct).length / last.answers.length) * 100)
      : null;
  const status = readiness?.status ?? 'insufficient';
  const statusCopy = STATUS_COPY[status];
  const months = monthsUntil(today, data.goal.examDate);
  const mockSoon = plan.nextMock && diffDays(today, plan.nextMock.date) <= 3 && diffDays(today, plan.nextMock.date) >= 0;
  const active = data.activeSession;
  const stepsTotal = active?.plan.steps.length ?? 0;
  const stepsDone = active?.cursor ?? 0;
  const lowDue = !active && pools.due.length === 0 && pools.newItems.length === 0;

  const start = (sessionMode: typeof mode) => {
    const session = actions.startSession(sessionMode);
    if (session) navigate('/session');
  };

  return (
    <>
      <TopBar
        meta={`${data.goal.examLabel}${data.goal.examIsEstimate ? ' (est.)' : ''} · ±${months} bln`}
      />
      <main className="app-main" id="main" tabIndex={-1}>
        <h1 className="sr-only">Hari Ini</h1>
        <div className="home-grid">
          <div className="stack">
            {!online ? (
              <Banner tone="info" title="Mode offline">
                Progres tersimpan di perangkat dan akan disinkronkan saat online kembali.
              </Banner>
            ) : null}

            {plan.recovery && !data.dismissed.includes(`recovery-${today}`) ? (
              <Banner
                tone="warning"
                title={`Kamu absen ${Math.max(3, diffDays(data.lastActivityDate ?? today, today))} hari. Rencana sudah dirapikan.`}
                action={
                  <div className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => start('recovery')}>
                      Mulai lagi 10 menit
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => actions.dismiss(`recovery-${today}`)}
                    >
                      Mengerti
                    </button>
                  </div>
                }
              >
                Tidak ada tumpukan review. Item baru dikurangi 50% selama 3 hari, dan tidak ada mock hari ini.
              </Banner>
            ) : null}

            {plan.phasePinned ? (
              <Banner tone="warning" title="Kalender di depan, gate belum">
                {plan.pinnedReason} Kami menahan materi baru sampai buktinya cukup.
              </Banner>
            ) : null}

            <section className="readiness-card" aria-labelledby="readiness-heading">
              <div className="readiness-card__top">
                <div className="row">
                  <span className="card__title" id="readiness-heading">
                    Kesiapan
                  </span>
                  <Chip tone={status === 'safe' ? 'success' : status === 'at_risk' ? 'warning' : status === 'on_track' ? 'info' : 'neutral'}>
                    {statusCopy.label}
                  </Chip>
                </div>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setWhyOpen(true)}>
                  <CircleHelp size={14} aria-hidden /> Kenapa?
                </button>
              </div>

              {status === 'insufficient' || !readiness ? (
                <div className="stack-sm">
                  <p className="readiness-score__value" style={{ fontSize: '1.5rem' }}>
                    Belum cukup data
                  </p>
                  <p className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
                    Kami belum punya cukup bukti. Selesaikan sesi pertama; angka akan muncul setelah ada latihan, dan
                    peluang lulus baru muncul setelah 1 full mock + coverage 60%.
                  </p>
                  <div className="readiness-evidence">
                    <BookOpen size={14} aria-hidden /> {data.attempts.length} jawaban · {data.mocks.length} mock
                  </div>
                </div>
              ) : (
                <>
                  <div className="readiness-score">
                    <span className="readiness-score__value">{readiness.total.estimate}</span>
                    <span className="readiness-score__range">
                      / 180 · rentang {readiness.total.low}–{readiness.total.high}
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <RangeBar
                      low={readiness.total.low}
                      high={readiness.total.high}
                      estimate={readiness.total.estimate}
                      max={180}
                      gate={90}
                      label={`Estimasi total ${readiness.total.estimate} dari 180, rentang ${readiness.total.low} sampai ${readiness.total.high}, gate 90.`}
                      tone={status === 'at_risk' ? 'warning' : status === 'safe' ? 'success' : undefined}
                    />
                  </div>
                  <div className="readiness-sections">
                    <div className={`mini-gate ${readiness.gates.kr ? '' : 'mini-gate--warn'}`}>
                      <span className="caption">Knowledge + Reading</span>
                      <span className="mini-gate__value">
                        {readiness.kr.estimate}
                        <span className="tertiary">/120</span>
                        {readiness.gates.kr ? (
                          <CheckCircle2 size={14} aria-label="di atas gate" style={{ color: 'var(--success)' }} />
                        ) : (
                          <TriangleAlert size={14} aria-label="di bawah gate" style={{ color: 'var(--warning)' }} />
                        )}
                      </span>
                      <span className="caption">gate 38</span>
                    </div>
                    <div className={`mini-gate ${readiness.gates.listening ? '' : 'mini-gate--warn'}`}>
                      <span className="caption">Listening</span>
                      <span className="mini-gate__value">
                        {readiness.listening.estimate}
                        <span className="tertiary">/60</span>
                        {readiness.gates.listening ? (
                          <CheckCircle2 size={14} aria-label="di atas gate" style={{ color: 'var(--success)' }} />
                        ) : (
                          <TriangleAlert size={14} aria-label="di bawah gate" style={{ color: 'var(--warning)' }} />
                        )}
                      </span>
                      <span className="caption">gate 19</span>
                    </div>
                  </div>
                  <div className="readiness-evidence">
                    <BarChart3 size={14} aria-hidden /> {readiness.mocks} mock · coverage{' '}
                    {Math.round(readiness.coverage * 100)}% · {readiness.attempts} jawaban
                  </div>
                  {!readiness.gates.listening || !readiness.gates.kr ? (
                    <p className="caption" style={{ marginTop: 8, color: 'var(--warning)', fontWeight: 700 }}>
                      Gate belum aman. Total tinggi tidak menutup section yang di bawah ambang.
                    </p>
                  ) : null}
                </>
              )}
            </section>

            <section className="today-card" aria-labelledby="today-heading">
              <div className="today-card__head">
                <div className="stack-xs">
                  <span className="today-card__mode" id="today-heading">
                    {active ? 'Sesi berjalan' : SESSION_MODES[mode].label} · Hari ini
                  </span>
                  <span className="today-card__time">
                    {active
                      ? `±${active.plan.estimatedMinutes} menit`
                      : preview
                        ? `±${preview.estimatedMinutes} menit`
                        : '±10 menit'}
                  </span>
                </div>
                <span className="chip chip--neutral">
                  <Clock size={13} aria-hidden /> {formatMinutes(plan.dailyBudgetMinutes)}
                </span>
              </div>

              {active ? (
                <div className="stack-sm">
                  <p className="muted">
                    Kamu sudah di langkah {Math.min(stepsDone + 1, stepsTotal)} dari {stepsTotal}. Progres tersimpan.
                  </p>
                  <div className="progress">
                    <span style={{ width: `${stepsTotal ? (stepsDone / stepsTotal) * 100 : 0}%` }} />
                  </div>
                  <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => navigate('/session')}>
                    <Play size={18} aria-hidden /> Lanjutkan sesi
                  </button>
                </div>
              ) : (
                <>
                  <div className="blocks" aria-label="Komposisi sesi">
                    {preview
                      ? Object.entries(preview.blockCounts)
                          .filter(([block]) => block !== 'recap')
                          .map(([block, count]) => (
                            <span className="block-chip" key={block}>
                              {blockLabel(block)} <strong>{count}</strong>
                            </span>
                          ))
                      : null}
                    {preview && preview.blockCounts.recap ? (
                      <span className="block-chip">rangkuman</span>
                    ) : null}
                  </div>
                  <p className="caption">{preview?.reason ?? 'Sesi ringan untuk menjaga ritme.'}</p>
                  {lowDue ? (
                    <p className="caption" style={{ color: 'var(--success)' }}>
                      Tidak ada review due. Kamu bisa latihan ringan atau istirahat — istirahat tetap bagian dari
                      rencana.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn--primary btn--block btn--lg"
                    onClick={() => start(mode)}
                    disabled={!preview}
                  >
                    <Play size={18} aria-hidden /> Mulai sesi
                  </button>
                  {mode !== 'quick10' ? (
                    <button
                      type="button"
                      className="btn btn--secondary btn--block"
                      onClick={() => start('quick10')}
                      disabled={!fallbackPreview}
                    >
                      Quick 10 · {formatMinutes(10)}
                    </button>
                  ) : null}
                </>
              )}
            </section>

            {mockSoon && plan.nextMock ? (
              <Banner
                tone="info"
                title={`${plan.nextMock.label} sudah waktunya (${formatDate(plan.nextMock.date)})`}
                action={
                  <div className="row">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => navigate(`/mock/${plan.nextMock!.formId}`)}
                    >
                      Lihat mock
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => actions.dismiss(`mock-${plan.nextMock!.id}`)}
                    >
                      Nanti
                    </button>
                  </div>
                }
              >
                Satu duduk, timer ketat, audio sekali. Ini cara paling jujur mengukur posisimu.
              </Banner>
            ) : null}

            <section className="stack-sm" aria-labelledby="focus-heading">
              <div className="section-title">
                <h2 id="focus-heading">Fokus minggu ini</h2>
                <span className="caption">{weekFocus(plan)}</span>
              </div>
              <div className="focus-list">
                {(readiness?.factors ?? []).slice(0, 2).map((factor, index) => (
                  <div className="focus-item" key={factor.id}>
                    <span className="focus-item__rank">{index + 1}</span>
                    <div className="grow">
                      <p className="focus-item__title">{factor.label}</p>
                      <p className="focus-item__detail">{factor.action} · {factor.detail}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => start(factor.domain === 'listening' ? 'quick10' : 'quick10')}
                    >
                      10 mnt
                    </button>
                  </div>
                ))}
                {(readiness?.factors ?? []).length === 0 ? (
                  <div className="focus-item">
                    <span className="focus-item__rank">1</span>
                    <div className="grow">
                      <p className="focus-item__title">Selesaikan sesi pertama</p>
                      <p className="focus-item__detail">Setelah ada bukti, kami bisa menunjuk fokus yang benar.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="stack-sm" aria-labelledby="evidence-heading">
              <div className="section-title">
                <h2 id="evidence-heading">Bukti terbaru</h2>
              </div>
              <div className="card stack-sm">
                {last ? (
                  <>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <Chip tone="success">{last.answers.length > 0 ? `${lastAccuracy}% benar` : 'Sesi tersimpan'}</Chip>
                      <span className="caption">
                        {relativeDay(last.plan.date, today)} · {last.plan.mode === 'quick10' ? 'Quick 10' : SESSION_MODES[last.plan.mode].label}
                      </span>
                    </div>
                    <p className="caption">
                      {last.answers.length} jawaban · {last.plan.blockCounts.review ?? 0} review ·{' '}
                      {last.plan.blockCounts.listening ?? 0} menyimak
                    </p>
                  </>
                ) : data.mocks.length > 0 ? (
                  <p className="caption">Mock terakhir: {data.mocks.at(-1)?.report.total.estimate}/180.</p>
                ) : (
                  <p className="caption">
                    Belum ada bukti. Sesi pertama akan mengisi bagian ini — bukan dengan badge, tetapi dengan angka.
                  </p>
                )}
                {readiness && readiness.history.length >= 2 ? <Sparkline points={readiness.history} /> : null}
              </div>
            </section>

            <section className="stack-sm" aria-labelledby="week-heading">
              <div className="section-title">
                <h2 id="week-heading">7 hari ke depan</h2>
                <span className="caption">{plan.nextMock ? `${plan.nextMock.label} · ${formatDate(plan.nextMock.date)}` : 'Belum ada mock terjadwal'}</span>
              </div>
              <div className="week-strip">
                {nextDays(data, today).map((day) => (
                  <div
                    key={day.date}
                    className={`day-cell ${day.date === today ? 'day-cell--today' : ''} ${day.isRest ? 'day-cell--rest' : ''} ${day.isMock ? 'day-cell--mock' : ''}`}
                    title={`${formatDate(day.date)}${day.isRest ? ' · istirahat' : ''}${day.isMock ? ' · mock' : ''}`}
                  >
                    <span className="day-cell__dot" aria-hidden />
                    <span>{dayShort(day.date)}</span>
                    <span aria-hidden>{new Date(`${day.date}T12:00:00`).getDate()}</span>
                  </div>
                ))}
              </div>
              <p className="caption">
                Hari istirahat bukan bolos. Kalau kamu melewatkan 3 hari, rencana akan dirapikan, bukan menumpuk.
              </p>
            </section>

            <div className="stack-sm">
              <button type="button" className="quick-link" onClick={() => navigate('/review')}>
                <span className="quick-link__icon"><RotateCcw size={18} aria-hidden /></span>
                <span className="grow">
                  <span className="quick-link__title">Review hari ini{due > 0 ? ` · ${due} due` : ''}</span>
                  <span className="quick-link__sub">
                    {due > 0 ? 'Review saja, tanpa item baru.' : 'Tidak ada review due.'}
                  </span>
                </span>
                <ArrowRight size={16} aria-hidden />
              </button>
              <button type="button" className="quick-link" onClick={() => navigate('/errors')}>
                <span className="quick-link__icon"><NotebookPen size={18} aria-hidden /></span>
                <span className="grow">
                  <span className="quick-link__title">Buku kesalahan</span>
                  <span className="quick-link__sub">
                    {openErrors > 0 ? `${openErrors} kesalahan menunggu diperbaiki.` : 'Belum ada kesalahan terbuka.'}
                  </span>
                </span>
                <ArrowRight size={16} aria-hidden />
              </button>
              <button type="button" className="quick-link" onClick={() => navigate('/library')}>
                <span className="quick-link__icon"><Library size={18} aria-hidden /></span>
                <span className="grow">
                  <span className="quick-link__title">Perpustakaan</span>
                  <span className="quick-link__sub">Kana, kata, kanji, grammar, bacaan, listening.</span>
                </span>
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>

            <p className="caption" style={{ textAlign: 'center', marginTop: 8 }}>
              N4 Pilot beta · estimasi, bukan skor resmi JLPT · cakupan konten belum penuh.
            </p>
          </div>

          <aside className="stack hide-mobile" aria-label="Ringkasan cepat">
            <div className="card stack-sm">
              <span className="card__title">Hari ini</span>
              <div className="stat-grid">
                <div className="stat">
                  <span className="stat__value">{due}</span>
                  <span className="stat__label">review due</span>
                </div>
                <div className="stat">
                  <span className="stat__value">{pools.newItems.length}</span>
                  <span className="stat__label">item baru siap</span>
                </div>
              </div>
              <p className="caption">
                {plan.newItemCap} item baru/hari · {plan.reviewCap} review maks · menyimak{' '}
                {formatMinutes(plan.listeningMinutes)}
              </p>
            </div>
            <div className="card stack-sm">
              <span className="card__title">Fase sekarang</span>
              <strong>{plan.currentPhase === 'foundations' ? 'Fondasi' : plan.phases.find((phase) => phase.id === plan.currentPhase)?.label}</strong>
              <p className="caption">{plan.pinnedReason ?? weekFocus(plan)}</p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate('/plan')}>
                <CalendarDays size={14} aria-hidden /> Lihat rencana
              </button>
            </div>
          </aside>
        </div>
      </main>
      <BottomNav />

      <Sheet open={whyOpen} onClose={() => setWhyOpen(false)} title="Kenapa angkanya begini?" description="Estimasi, bukan skor resmi.">
        <div className="stack">
          <p className="muted" style={{ lineHeight: 1.6 }}>
            Kesiapan dihitung dari mastery per domain, retensi yang diprediksi pada hari ujian, coverage konten, dan
            mock sebagai anchor. Kami menampilkan rentang karena satu angka memberi kesan presisi yang tidak kami punya.
          </p>
          {readiness ? (
            <>
              <div className="stack-sm">
                <span className="card__title">Tiga faktor terbesar</span>
                {readiness.factors.map((factor) => (
                  <div className="factor-row" key={factor.id}>
                    <div className="factor-row__head">
                      <span>{factor.label}</span>
                      <span className="tabular">{Math.round(factor.contribution * 100)}%</span>
                    </div>
                    <p className="factor-row__detail">{factor.detail}</p>
                    <p className="factor-row__action">{factor.action}</p>
                  </div>
                ))}
              </div>
              <div className="banner banner--info">
                <CircleHelp size={18} aria-hidden />
                <div>
                  {readiness.canShowProbability && readiness.probability
                    ? `Peluang lulus ${Math.round(readiness.probability.low * 100)}–${Math.round(readiness.probability.high * 100)}% (${readiness.probability.confidence === 'low' ? 'bukti masih sedikit' : readiness.probability.confidence === 'medium' ? 'bukti sedang' : 'bukti cukup'}).`
                    : readiness.reasonNoProbability}
                </div>
              </div>
              <p className="caption">
                Status “Aman” baru muncul setelah 2 mock, semua gate aman, dan batas bawah total ≥95.
              </p>
            </>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}

function blockLabel(block: string): string {
  switch (block) {
    case 'recall':
      return 'recall';
    case 'review':
      return 'review';
    case 'learn':
      return 'belajar';
    case 'apply':
      return 'latihan';
    case 'listening':
      return 'menyimak';
    case 'prove':
      return 'timed';
    default:
      return block;
  }
}

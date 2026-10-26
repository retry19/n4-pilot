import { useMemo, useState } from 'react';
import { CalendarDays, Route, Settings2 } from 'lucide-react';
import { PHASE_META } from '../core/types.ts';
import { buildPlan, computeReality, PHASE_HOURS } from '../core/planner.ts';
import { diffDays, formatDate, formatMinutes, todayISO, weekDates, dayShort, weekday } from '../core/date.ts';
import { useActions, useApp } from '../state/store.ts';
import { planFor, statsFor } from '../state/derive.ts';
import { navigate } from '../lib/router.ts';
import { BottomNav, TopBar } from '../ui/Navigation.tsx';
import { Banner, Chip, PageHead } from '../ui/common.tsx';
import { Sheet as SheetComponent } from '../ui/Sheet.tsx';

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function PlanScreen() {
  const data = useApp((store) => store.data);
  const actions = useActions();
  const today = todayISO();
  const goal = data.goal;
  const plan = planFor(data, today);
  const [editOpen, setEditOpen] = useState(false);
  const [hours, setHours] = useState(goal?.hoursPerDay ?? 2.25);
  const [days, setDays] = useState(goal?.daysPerWeek ?? 6);
  const [restDays, setRestDays] = useState<number[]>(goal?.restDays ?? []);

  const reality = goal ? computeReality(goal, today) : null;
  const previewReality = useMemo(() => {
    if (!goal) return null;
    return computeReality({ ...goal, hoursPerDay: hours, daysPerWeek: days, restDays }, today);
  }, [goal, hours, days, restDays, today]);
  const previewPlan = useMemo(() => {
    if (!goal) return null;
    const allStats = statsFor(data.attempts);
    const kana = statsFor(data.attempts.filter((attempt) => attempt.domain === 'kana'));
    const vocab = statsFor(data.attempts.filter((attempt) => attempt.domain === 'vocab'));
    const listening = statsFor(data.attempts.filter((attempt) => attempt.domain === 'listening'));
    return buildPlan({
      goal: { ...goal, hoursPerDay: hours, daysPerWeek: days, restDays },
      today,
      cardCount: Object.keys(data.cards).length,
      dueCount: 0,
      overdueCount: 0,
      lastActivityDate: data.lastActivityDate,
      kanaAccuracy: kana.accuracy,
      kanaAttempts: kana.attempts,
      vocabAttempts: vocab.attempts,
      accuracy: allStats.accuracy,
      listeningAccuracy: listening.accuracy,
      coverage: 0,
      mockCount: data.mocks.length,
    });
  }, [goal, hours, days, restDays, today, data]);

  if (!goal || !plan || !reality) {
    return (
      <>
        <TopBar />
        <main className="app-main" id="main" tabIndex={-1}>
          <PageHead title="Rencana" description="Rencana belum dibuat." />
          <button type="button" className="btn btn--primary" onClick={() => navigate('/onboarding')}>
            Buat rencana
          </button>
        </main>
      </>
    );
  }

  const week = weekDates(today);
  const mockDates = new Map(plan.mockDates.map((mock) => [mock.date, mock]));
  const currentPhase = plan.phases.find((phase) => phase.id === plan.currentPhase);

  return (
    <>
      <TopBar meta={`${goal.examLabel}${goal.examIsEstimate ? ' (est.)' : ''}`} />
      <main className="app-main" id="main" tabIndex={-1}>
        <PageHead
          eyebrow="Rencana"
          title={`Menuju ${goal.examLabel}`}
          description={`${Math.round(reality.weeksToExam)} minggu · ${Math.round(reality.availableHours)} jam tersedia · target perencanaan 700 jam.`}
        />

        <div className="stack">
          <div className="card stack-sm">
            <div className="row-between">
              <div>
                <span className="card__title">Beban saat ini</span>
                <p style={{ fontSize: 22, fontWeight: 800 }}>
                  {String(goal.hoursPerDay).replace('.', ',')} jam × {goal.daysPerWeek} hari
                </p>
              </div>
              <Chip tone={reality.verdict === 'comfortable' ? 'success' : reality.verdict === 'tight' ? 'info' : 'warning'}>
                {reality.verdict === 'comfortable'
                  ? 'realistis'
                  : reality.verdict === 'tight'
                    ? 'ketat'
                    : reality.verdict === 'risky'
                      ? 'berisiko'
                      : 'belum realistis'}
              </Chip>
            </div>
            <div className="stat-grid">
              <div className="stat">
                <span className="stat__value">{String(reality.weeklyHours).replace('.', ',')} j</span>
                <span className="stat__label">per minggu</span>
              </div>
              <div className="stat">
                <span className="stat__value">{Math.round(reality.requiredHoursPerDay * 4) / 4} j</span>
                <span className="stat__label">per hari agar 700 j</span>
              </div>
              <div className="stat">
                <span className="stat__value">{formatDate(reality.projectedFinish)}</span>
                <span className="stat__label">proyeksi selesai</span>
              </div>
            </div>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => setEditOpen(true)}>
              <Settings2 size={16} aria-hidden /> Ubah ketersediaan
            </button>
          </div>

          {!plan.onTrack ? (
            <Banner tone="warning" title="Pace ini belum muat sampai ujian">
              Sisa jam baru selesai {formatDate(plan.projectedFinish)}. Butuh sekitar{' '}
              {Math.round(plan.requiredHoursPerDay * 4) / 4} jam/hari, atau geser tanggal. Ini bukan vonis — ini
              matematika.
            </Banner>
          ) : null}

          {plan.phasePinned ? (
            <Banner tone="warning" title="Rencana ditahan di fase ini">
              {plan.pinnedReason}
            </Banner>
          ) : null}

          <section className="stack-sm" aria-labelledby="phases-heading">
            <div className="section-title">
              <h2 id="phases-heading">Fase</h2>
              <span className="caption">{PHASE_HOURS[plan.currentPhase]} jam · {PHASE_META[plan.currentPhase].gate}</span>
            </div>
            <div className="stack-sm">
              {plan.phases.map((phase) => (
                <div className={`phase-card ${phase.isCurrent ? 'phase-card--current' : ''}`} key={phase.id}>
                  <div className="phase-card__head">
                    <strong>{phase.label}</strong>
                    <span className="caption">
                      {formatDate(phase.startDate)} – {formatDate(phase.endDate)}
                    </span>
                  </div>
                  <p className="caption">{PHASE_META[phase.id].outcome}</p>
                  <div className="row-between">
                    <span className="caption">Gate keluar: {PHASE_META[phase.id].gate}</span>
                    {phase.isCurrent ? <Chip tone="info">sekarang</Chip> : phase.isComplete ? <Chip tone="success">selesai</Chip> : null}
                  </div>
                  {phase.isCurrent ? (
                    <div className="progress">
                      <span
                        style={{
                          width: `${Math.min(100, Math.max(0, ((diffDays(phase.startDate, today) + 1) / Math.max(1, diffDays(phase.startDate, phase.endDate) + 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="stack-sm" aria-labelledby="week-heading">
            <div className="section-title">
              <h2 id="week-heading">Minggu ini</h2>
              <span className="caption">Hari istirahat tidak dihitung bolos</span>
            </div>
            <div className="week-grid">
              {week.map((date) => {
                const isRest = goal.restDays.includes(weekday(date));
                const mock = mockDates.get(date);
                return (
                  <div
                    key={date}
                    className="week-day"
                    data-today={date === today}
                    data-rest={isRest}
                    title={`${formatDate(date)}${isRest ? ' · istirahat' : ''}${mock ? ` · ${mock.label}` : ''}`}
                  >
                    <span>{dayShort(date)}</span>
                    <span className="week-day__num">{new Date(`${date}T12:00:00`).getDate()}</span>
                    <span aria-hidden>{isRest ? '—' : mock ? '◆' : '•'}</span>
                  </div>
                );
              })}
            </div>
            <p className="caption">
              Budget harian {formatMinutes(plan.dailyBudgetMinutes)} · menyimak minimal{' '}
              {formatMinutes(plan.listeningMinutes)} · item baru {plan.newItemCap}/hari.
            </p>
          </section>

          <section className="stack-sm" aria-labelledby="mock-heading">
            <div className="section-title">
              <h2 id="mock-heading">Mock</h2>
              <span className="caption">Dua form beta + satu mock ringan</span>
            </div>
            <div className="mock-list">
              {plan.mockDates.map((mock) => (
                <button
                  type="button"
                  className="quick-link"
                  key={mock.id}
                  onClick={() => navigate(`/mock/${mock.formId}`)}
                >
                  <span className="quick-link__icon"><CalendarDays size={18} aria-hidden /></span>
                  <span className="grow">
                    <span className="quick-link__title">{mock.label}</span>
                    <span className="quick-link__sub">{formatDate(mock.date)} · {diffDays(today, mock.date)} hari lagi</span>
                  </span>
                  <span aria-hidden>→</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card stack-sm" aria-labelledby="why-heading">
            <div className="section-title">
              <h2 id="why-heading">Kenapa rencana ini?</h2>
              <Route size={16} aria-hidden />
            </div>
            {plan.narrative.map((line) => (
              <p className="caption" style={{ lineHeight: 1.6 }} key={line}>
                • {line}
              </p>
            ))}
          </section>

          <Banner tone="info" title="Tanggal 2027 masih perkiraan">
            JLPT belum mengumumkan tanggal 2027. Semua perhitungan akan bergeser saat tanggal resmi keluar.
          </Banner>

          <div className="row">
            <button type="button" className="btn btn--secondary grow" onClick={() => navigate('/practice')}>
              Latihan
            </button>
            <button type="button" className="btn btn--secondary grow" onClick={() => navigate('/profile')}>
              Profil
            </button>
          </div>
        </div>
      </main>
      <BottomNav />

      <SheetComponent
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Ubah ketersediaan"
        description="Lihat dampaknya sebelum menyimpan."
        footer={
          <>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                actions.updateGoal({ hoursPerDay: hours, daysPerWeek: days, restDays });
                setEditOpen(false);
              }}
            >
              Simpan perubahan
            </button>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => setEditOpen(false)}>
              Batal
            </button>
          </>
        }
      >
        <div className="stack">
          <div className="budget-row">
            <label className="field__label" htmlFor="plan-hours">
              Jam per hari
            </label>
            <span className="slider-value">{String(hours).replace('.', ',')} jam</span>
          </div>
          <input
            id="plan-hours"
            type="range"
            min={0.5}
            max={6}
            step={0.25}
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
          />
          <div className="field">
            <span className="field__label">Hari belajar</span>
            <div className="segmented" role="group" aria-label="Hari belajar">
              {[3, 4, 5, 6, 7].map((value) => (
                <button key={value} type="button" aria-pressed={days === value} onClick={() => setDays(value)}>
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field__label">Hari istirahat</span>
            <div className="row wrap" style={{ gap: 6 }}>
              {DAY_LABELS.map((label, index) => {
                const active = restDays.includes(index);
                return (
                  <button
                    key={label}
                    type="button"
                    className="filter-chip"
                    aria-pressed={active}
                    onClick={() => setRestDays((current) => (active ? current.filter((day) => day !== index) : [...current, index]))}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="field__hint">Hari istirahat dihormati rencana. Tidak ada rasa bersalah yang dijadwalkan.</p>
          </div>

          {previewReality && previewPlan ? (
            <div className="card stack-sm">
              <span className="card__title">Dampak</span>
              <div className="row-between">
                <span>Jam tersedia</span>
                <strong>{Math.round(previewReality.availableHours)} jam</strong>
              </div>
              <div className="row-between">
                <span>Proyeksi selesai</span>
                <strong>{formatDate(previewReality.projectedFinish)}</strong>
              </div>
              <div className="row-between">
                <span>Status</span>
                <Chip tone={previewReality.verdict === 'comfortable' ? 'success' : previewReality.verdict === 'tight' ? 'info' : 'warning'}>
                  {previewReality.verdict}
                </Chip>
              </div>
              <p className="caption">
                {previewReality.exceedsExam
                  ? 'Masih lewat tanggal ujian. Pertimbangkan menambah jam atau menggeser tanggal.'
                  : 'Pace ini muat sampai ujian, dengan buffer yang terlihat di atas.'}
              </p>
            </div>
          ) : null}
        </div>
      </SheetComponent>
    </>
  );
}

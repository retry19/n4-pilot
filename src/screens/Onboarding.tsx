import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleHelp, Flag, Info, MapPin, ShieldCheck } from 'lucide-react';
import type { Goal, StartingPoint, TargetScore } from '../core/types.ts';
import { PHASE_META } from '../core/types.ts';
import { computeReality, EXAM_PRESETS, trackFor } from '../core/planner.ts';
import { buildPlan } from '../core/planner.ts';
import { addDays, formatDate, formatDateLong, formatMinutes, monthsUntil, todayISO } from '../core/date.ts';
import { useActions } from '../state/store.ts';
import { navigate } from '../lib/router.ts';
import { Choice } from '../ui/OnboardingChoice.tsx';

type Step = 'welcome' | 'start' | 'date' | 'budget' | 'reality' | 'preview';

const STEPS: Step[] = ['start', 'date', 'budget', 'reality', 'preview'];

const STARTING_POINTS: { id: StartingPoint; title: string; desc: string; note?: string }[] = [
  { id: 'zero', title: 'Dari nol', desc: 'Belum kenal hiragana/katakana. Kita mulai dari bunyi.' },
  { id: 'kana', title: 'Sudah kenal kana', desc: 'Bisa membaca, belum belajar grammar.' },
  { id: 'some_n5', title: 'Pernah belajar sedikit', desc: 'Punya fondasi N5, tetapi belum rapi.' },
  { id: 'mock_score', title: 'Punya skor mock', desc: 'Mau kalibrasi dan menutup gap.' },
];

function suggestedExamDate(projectedFinish: string): { date: string; label: string } {
  const candidates = [
    { date: '2027-07-04', label: 'Juli 2027' },
    { date: '2027-12-05', label: 'Desember 2027' },
    { date: '2028-07-02', label: 'Juli 2028' },
    { date: '2028-12-03', label: 'Desember 2028' },
  ];
  return candidates.find((candidate) => candidate.date >= projectedFinish) ?? candidates[candidates.length - 1]!;
}

export function OnboardingScreen() {
  const actions = useActions();
  const today = todayISO();
  const [step, setStep] = useState<Step>('welcome');
  const [startingPoint, setStartingPoint] = useState<StartingPoint>('zero');
  const [examDate, setExamDate] = useState('2027-12-05');
  const [customDate, setCustomDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(2.25);
  const [daysPerWeek, setDaysPerWeek] = useState(6);
  const [targetScore, setTargetScore] = useState<TargetScore>(90);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [realityChoice, setRealityChoice] = useState<'increase_hours' | 'shift_exam' | 'continue_risky' | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  const examPreset = EXAM_PRESETS.find((preset) => preset.date === examDate);
  const examLabel = examPreset?.label ?? (customDate ? formatDate(examDate) : 'Tanggal pilihanmu');
  const examIsEstimate = examPreset?.isEstimate ?? true;

  const draftGoal: Goal = useMemo(
    () => ({
      id: 'draft',
      createdAt: new Date().toISOString(),
      version: 1,
      examDate,
      examLabel,
      examIsEstimate,
      startingPoint,
      targetScore,
      hoursPerDay,
      daysPerWeek,
      restDays: [],
      track: trackFor(hoursPerDay, daysPerWeek),
      disclaimerAccepted: true,
    }),
    [examDate, examLabel, examIsEstimate, startingPoint, targetScore, hoursPerDay, daysPerWeek],
  );

  const reality = useMemo(() => computeReality(draftGoal, today), [draftGoal, today]);
  const plan = useMemo(
    () =>
      buildPlan({
        goal: draftGoal,
        today,
        cardCount: 0,
        dueCount: 0,
        overdueCount: 0,
        lastActivityDate: null,
        kanaAccuracy: null,
        kanaAttempts: 0,
        vocabAttempts: 0,
        accuracy: null,
        listeningAccuracy: null,
        coverage: 0,
        mockCount: 0,
      }),
    [draftGoal, today],
  );

  const stepIndex = STEPS.indexOf(step);
  const next = () => {
    const index = STEPS.indexOf(step);
    if (index >= 0 && index < STEPS.length - 1) setStep(STEPS[index + 1]!);
  };
  const prev = () => {
    if (step === 'welcome') return;
    const index = STEPS.indexOf(step);
    if (index <= 0) setStep('welcome');
    else setStep(STEPS[index - 1]!);
  };

  const finish = () => {
    actions.completeOnboarding({
      startingPoint,
      examDate,
      examLabel,
      examIsEstimate,
      hoursPerDay,
      daysPerWeek,
      targetScore,
      betaAcknowledged: true,
    });
    actions.startSession('quick10');
    navigate('/session');
  };

  const firstWeek = 'Minggu pertama: 8 kana + 10 kata + 2 listening. Kecil, tetapi selesai.';

  return (
    <div className="onboarding" id="main" role="main" tabIndex={-1}>
      <div className="onboarding__top">
        {step !== 'welcome' ? (
          <button type="button" className="icon-btn" onClick={prev} aria-label="Kembali">
            <ArrowLeft size={20} aria-hidden />
          </button>
        ) : (
          <span className="wordmark">
            <span className="wordmark__mark" aria-hidden>
              N4
            </span>
            N4 Pilot
          </span>
        )}
        <div className="progress-dots" aria-label={`Langkah ${stepIndex + 1} dari ${STEPS.length}`}>
          {STEPS.map((item, index) => (
            <span
              key={item}
              data-active={index === stepIndex}
              data-done={index < stepIndex}
            />
          ))}
        </div>
        {step === 'welcome' ? <span className="beta-badge">Beta</span> : <span style={{ width: 44 }} />}
      </div>

      {step === 'welcome' ? (
        <div className="onboarding__body">
          <div className="stack-sm">
            <span className="eyebrow">JLPT N4 · dari nol</span>
            <h1 className="onboarding__headline">Dari nol ke N4, dengan rencana yang jujur.</h1>
            <p className="onboarding__lede">
              Kita mulai dari matematikanya, bukan dari motivasi. Kamu akan tahu berapa jam yang kamu punya, apa yang
              harus dikerjakan hari ini, dan seberapa dekat kamu sebenarnya.
            </p>
          </div>
          <div className="stack">
            <div className="quick-link">
              <span className="quick-link__icon"><MapPin size={18} aria-hidden /></span>
              <span>
                <span className="quick-link__title">Rencana dari tanggal ujian</span>
                <span className="quick-link__sub">Bukan dari jumlah konten yang tak ada habisnya.</span>
              </span>
            </div>
            <div className="quick-link">
              <span className="quick-link__icon"><ShieldCheck size={18} aria-hidden /></span>
              <span>
                <span className="quick-link__title">Estimasi dengan rentang</span>
                <span className="quick-link__sub">Kami tidak akan menampilkan angka palsu.</span>
              </span>
            </div>
            <div className="quick-link">
              <span className="quick-link__icon"><Flag size={18} aria-hidden /></span>
              <span>
                <span className="quick-link__title">Section gate terlihat</span>
                <span className="quick-link__sub">Listening 19/60 adalah gate, bukan detail.</span>
              </span>
            </div>
          </div>
          <div className="onboarding__footer">
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => setStep('start')}>
              Mulai <ArrowRight size={18} aria-hidden />
            </button>
            <p className="onboarding-note">
              Beta: cakupan konten belum penuh. Kami akan menandai semua estimasi sebagai estimasi.
            </p>
          </div>
        </div>
      ) : null}

      {step === 'start' ? (
        <div className="onboarding__body">
          <div className="stack-sm">
            <h1 className="onboarding__headline">Kamu mulai dari mana?</h1>
            <p className="onboarding__lede">Tidak ada jawaban yang membuat malu. Yang penting rencananya cocok.</p>
          </div>
          <div className="choice-grid" role="group" aria-label="Titik awal">
            {STARTING_POINTS.map((item) => (
              <Choice
                key={item.id}
                title={item.title}
                description={item.desc}
                selected={startingPoint === item.id}
                onSelect={() => setStartingPoint(item.id)}
              />
            ))}
          </div>
          <div className="onboarding__footer">
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={next}>
              Lanjut <ArrowRight size={18} aria-hidden />
            </button>
            <p className="onboarding-note">
              {startingPoint === 'zero'
                ? 'Kami tidak akan memberi tes panjang. Mulai dari kana, 10 menit pertama.'
                : 'Kami akan menyesuaikan titik mulai; kamu bisa ulang diagnostic kapan saja nanti.'}
            </p>
          </div>
        </div>
      ) : null}

      {step === 'date' ? (
        <div className="onboarding__body">
          <div className="stack-sm">
            <h1 className="onboarding__headline">Kapan kamu ingin ujian?</h1>
            <p className="onboarding__lede">Tanggal menentukan seluruh rencana. Kamu bisa mengubahnya nanti.</p>
          </div>
          <div className="choice-grid" role="group" aria-label="Tanggal ujian">
            {EXAM_PRESETS.map((preset) => (
              <Choice
                key={preset.id}
                title={preset.label}
                description={preset.note}
                selected={examDate === preset.date}
                onSelect={() => {
                  setExamDate(preset.date);
                  setShowCustom(false);
                  setCustomDate('');
                }}
                badge={preset.isEstimate ? 'perkiraan' : 'resmi'}
              />
            ))}
            <Choice
              title="Tanggal lain"
              description="Pilih tanggal sendiri, misalnya ujian internal atau target pribadi."
              selected={showCustom}
              onSelect={() => {
                setShowCustom(true);
                if (customDate) setExamDate(customDate);
              }}
            />
          </div>
          {showCustom ? (
            <div className="field">
              <label className="field__label" htmlFor="custom-date">
                Tanggal ujian
              </label>
              <input
                id="custom-date"
                className="input"
                type="date"
                min={addDays(today, 14)}
                value={customDate}
                onChange={(event) => {
                  setCustomDate(event.target.value);
                  if (event.target.value) setExamDate(event.target.value);
                }}
              />
            </div>
          ) : null}
          <div className="banner banner--info">
            <Info size={18} aria-hidden />
            <div>
              <strong className="banner__title">Soal tanggal 2027</strong>
              JLPT belum mengumumkan tanggal 2027. Semua tanggal 2027 di sini berlabel “perkiraan” dan akan kami
              perbarui saat pengumuman resmi keluar.
            </div>
          </div>
          <div className="onboarding__footer">
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={next}>
              Lanjut <ArrowRight size={18} aria-hidden />
            </button>
            <p className="onboarding-note">
              {formatDateLong(examDate)} · {Math.round(reality.weeksToExam)} minggu dari sekarang
            </p>
          </div>
        </div>
      ) : null}

      {step === 'budget' ? (
        <div className="onboarding__body">
          <div className="stack-sm">
            <h1 className="onboarding__headline">Berapa waktu yang benar-benar kamu punya?</h1>
            <p className="onboarding__lede">Jujur lebih penting daripada ambisius. Rencana bisa diubah kapan saja.</p>
          </div>

          <div className="card stack">
            <div className="budget-row">
              <label className="field__label" htmlFor="hours">
                Jam per hari
              </label>
              <span className="slider-value">{String(hoursPerDay).replace('.', ',')} jam</span>
            </div>
            <input
              id="hours"
              type="range"
              min={0.5}
              max={5}
              step={0.25}
              value={hoursPerDay}
              onChange={(event) => setHoursPerDay(Number(event.target.value))}
              aria-valuetext={`${String(hoursPerDay).replace('.', ',')} jam per hari`}
            />
            <div className="row-between caption" aria-hidden>
              <span>30 menit</span>
              <span>5 jam</span>
            </div>

            <div className="field">
              <span className="field__label">Hari belajar per minggu</span>
              <div className="segmented" role="group" aria-label="Hari belajar per minggu">
                {[3, 4, 5, 6, 7].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={daysPerWeek === value}
                    onClick={() => setDaysPerWeek(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="budget-row">
              <span className="muted">Total per minggu</span>
              <span className="budget-total">{String((hoursPerDay * daysPerWeek).toFixed(2).replace(/\.?0+$/, '')).replace('.', ',')} jam</span>
            </div>
          </div>

          <div className="card stack-sm">
            <span className="field__label">Target skor</span>
            <div className="segmented" role="group" aria-label="Target skor">
              {[
                { value: 90 as TargetScore, label: 'Lulus 90' },
                { value: 110 as TargetScore, label: 'Aman 110' },
                { value: 130 as TargetScore, label: 'Kuat 130' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={targetScore === option.value}
                  onClick={() => setTargetScore(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="onboarding-note">
              Target di atas 90 tidak mengubah gate. Listening tetap minimal 19/60.
            </p>
          </div>

          <div className="onboarding__footer">
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={next}>
              Lihat rencanaku <ArrowRight size={18} aria-hidden />
            </button>
            <p className="onboarding-note">
              {formatMinutes(hoursPerDay * 60)} × {daysPerWeek} hari = {Math.round(reality.availableHours)} jam sampai
              ujian.
            </p>
          </div>
        </div>
      ) : null}

      {step === 'reality' ? (
        <div className="onboarding__body">
          <div className="stack-sm">
            <h1 className="onboarding__headline">Ini matematikanya.</h1>
            <p className="onboarding__lede">
              Bukan penilaian atas usahamu. Ini jarak antara waktu yang kamu punya dan waktu yang biasanya dibutuhkan.
            </p>
          </div>

          <div className="reality-compare">
            <div className="reality-cell">
              <span className="reality-cell__label">Target perencanaan</span>
              <p className="reality-cell__value">700 jam</p>
              <p className="onboarding-note">Buffer dari 575–1.000 jam untuk review dan mock.</p>
            </div>
            <div className={`reality-cell ${reality.verdict === 'comfortable' ? '' : 'reality-cell--warn'}`}>
              <span className="reality-cell__label">Waktumu</span>
              <p className="reality-cell__value">{Math.round(reality.availableHours)} jam</p>
              <p className="onboarding-note">{Math.round(reality.weeksToExam)} minggu × {String(reality.weeklyHours).replace('.', ',')} jam</p>
            </div>
          </div>

          <div className={`banner banner--${reality.verdict === 'comfortable' ? 'success' : reality.verdict === 'tight' ? 'info' : 'warning'}`}>
            <CircleHelp size={18} aria-hidden />
            <div>
              <strong className="banner__title">{reality.headline}</strong>
              <p style={{ marginTop: 4 }}>{reality.mathLine}</p>
              <p style={{ marginTop: 4 }}>
                Dengan pace ini, kamu butuh sekitar {Math.round(reality.monthsMin)}–{Math.round(reality.monthsMax)} bulan.
                Proyeksi selesai: {formatDate(reality.projectedFinish)}.
              </p>
            </div>
          </div>

          <div className="choice-grid" role="group" aria-label="Pilihan reality check">
            {reality.options.map((option) => {
              return (
                <Choice
                  key={option.id}
                  title={option.title}
                  description={`${option.detail} ${option.effect}`}
                  badge={option.recommended ? 'disarankan' : undefined}
                  selected={realityChoice === option.id}
                  onSelect={() => {
                    setRealityChoice(option.id);
                    if (option.id === 'increase_hours' && option.hoursPerDay) {
                      setHoursPerDay(option.hoursPerDay);
                      setRiskAccepted(false);
                    }
                    if (option.id === 'shift_exam') {
                      const suggested = suggestedExamDate(reality.projectedFinish);
                      setExamDate(suggested.date);
                      setShowCustom(false);
                      setCustomDate('');
                      setRiskAccepted(false);
                    }
                    if (option.id === 'continue_risky') {
                      setRiskAccepted(true);
                    }
                  }}
                />
              );
            })}
          </div>

          {riskAccepted ? (
            <div className="banner banner--warning">
              <Info size={18} aria-hidden />
              <div>
                Kami akan menandai rencana ini sebagai berisiko dan memprioritaskan gate di atas cakupan penuh. Itu
                pilihan yang sah — asal kamu tahu konsekuensinya.
              </div>
            </div>
          ) : null}

          <div className="onboarding__footer">
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={next}>
              Lihat rencana yang cocok <ArrowRight size={18} aria-hidden />
            </button>
            <p className="onboarding-note">
              Tidak ada vonis di sini. Hanya risiko, opsi, dan konsekuensi.
            </p>
          </div>
        </div>
      ) : null}

      {step === 'preview' ? (
        <div className="onboarding__body">
          <div className="stack-sm">
            <h1 className="onboarding__headline">Rencanamu menuju {formatDate(examDate)}.</h1>
            <p className="onboarding__lede">
              {monthsUntil(today, examDate)} bulan · {Math.round(reality.availableHours)} jam tersedia ·{' '}
              {Math.round(plan.weeksToExam)} minggu.
            </p>
          </div>

          <div className="card">
            <div className="phase-timeline">
              {plan.phases.map((phase) => (
                <div key={phase.id} className={`phase ${phase.isCurrent ? 'phase--current' : ''} ${phase.isComplete ? 'phase--done' : ''}`}>
                  <div className="phase__rail">
                    <span className="phase__dot" />
                  </div>
                  <div>
                    <p className="phase__title">{phase.label}</p>
                    <p className="phase__meta">
                      {formatDate(phase.startDate)} – {formatDate(phase.endDate)}
                    </p>
                    <p className="phase__meta">{PHASE_META[phase.id].gate}</p>
                  </div>
                  <span className="phase__hours">{phase.hours} j</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card stack-sm">
            <span className="card__title">Mock & checkpoint</span>
            <div className="mock-list">
              {plan.mockDates.map((mock) => (
                <div className="mock-row" key={mock.id}>
                  <span>{mock.label}</span>
                  <strong>{formatDate(mock.date)}</strong>
                </div>
              ))}
            </div>
            <p className="onboarding-note">{firstWeek}</p>
          </div>

          <div className="banner banner--info">
            <Info size={18} aria-hidden />
            <div>
              <strong className="banner__title">Ini versi beta.</strong>
              Konten masih seed (60 kata, 24 kanji, 14 pola, 5 bacaan, 10 listening). Kami tidak akan bilang “siap N4”
              sampai cakupan dan mock-nya cukup.
            </div>
          </div>

          <div className="onboarding__footer">
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={finish}>
              Mulai 10 menit pertama <ArrowRight size={18} aria-hidden />
            </button>
            <p className="onboarding-note">
              Sesi pertama: 3 review awal, 3 kana, 2 listening. Tanpa paywall.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

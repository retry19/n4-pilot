/**
 * Plan engine: turns an exam date + real availability into an honest schedule.
 *
 * Model:
 *  - The curriculum needs 700 planning hours (DESIGN §7.3). Phase budgets are
 *    fixed; time per phase is `phaseHours / weeklyHours`.
 *  - The plan is a forecast, never a promise. If the projection misses the exam
 *    date, we say so and offer three concrete options (PRD E1).
 *  - Phase progression is gated by evidence, not only by the calendar. If the
 *    calendar says "N4 Core A" but the kana gate is not met, we pin the learner
 *    to the earlier phase and explain why.
 *  - Recovery mode is triggered by missed days (≥3), not by a streak counter.
 */
import type {
  GateCheck,
  Goal,
  PlanInput,
  PlanPhase,
  PlanSnapshot,
  PhaseId,
  PlannedMock,
  RealityCheck,
  RealityOption,
} from './types.ts';
import { PHASE_META, PHASE_ORDER } from './types.ts';
import { addDays, diffDays, formatDate, formatMinutes, todayISO } from './date.ts';
import { clamp } from './util.ts';

export const PLANNING_HOURS = 700;
export const REQUIRED_LOWER = 575;
export const REQUIRED_UPPER = 1000;

/** DESIGN §7.3 phase hours, normalized so the total equals 700. */
const PHASE_WEIGHTS: Record<PhaseId, number> = {
  foundations: 30 / 642.5,
  n5_bridge: 95 / 642.5,
  n4_core_a: 140 / 642.5,
  n4_core_b: 175 / 642.5,
  integration: 115 / 642.5,
  exam_sim: 70 / 642.5,
  taper: 17.5 / 642.5,
};

export const PHASE_HOURS: Record<PhaseId, number> = Object.fromEntries(
  PHASE_ORDER.map((phase) => [phase, Math.round(PHASE_WEIGHTS[phase] * PLANNING_HOURS)]),
) as Record<PhaseId, number>;

/** How much of the curriculum a learner with prior knowledge can skip. */
const STARTING_OFFSET_HOURS = {
  zero: 0,
  kana: 18,
  some_n5: 95,
  mock_score: 140,
} as const;

export const EXAM_PRESETS = [
  {
    id: '2026-12',
    date: '2026-12-06',
    label: 'Desember 2026',
    isEstimate: false,
    note: 'Resmi · pendaftaran sudah tutup (31 Agu–7 Sep 2026)',
  },
  {
    id: '2027-07',
    date: '2027-07-04',
    label: 'Juli 2027',
    isEstimate: true,
    note: 'Perkiraan · hanya masuk akal dengan 3+ jam/hari',
  },
  {
    id: '2027-12',
    date: '2027-12-05',
    label: 'Desember 2027',
    isEstimate: true,
    note: 'Perkiraan · target default yang jujur untuk 2–2,5 jam/hari',
  },
] as const;

export function trackFor(hoursPerDay: number, daysPerWeek: number): Goal['track'] {
  const weekly = hoursPerDay * daysPerWeek;
  if (weekly >= 27) return 'intensive';
  if (weekly >= 18) return 'sprint';
  return 'sustainable';
}

export function monthsForHours(hours: number, weeklyHours: number): number {
  if (weeklyHours <= 0) return 0;
  return (hours / weeklyHours) * (7 / 30.44);
}

export function computeReality(goal: Goal, today: string): RealityCheck {
  const weeklyHours = goal.hoursPerDay * goal.daysPerWeek;
  const daysToExam = Math.max(0, diffDays(today, goal.examDate));
  const weeksToExam = daysToExam / 7;
  const availableHours = weeklyHours * weeksToExam;
  const requiredHoursPerDay = weeksToExam > 0 ? PLANNING_HOURS / (weeksToExam * goal.daysPerWeek) : PLANNING_HOURS;
  const requiredHoursPerDayLower = weeksToExam > 0 ? REQUIRED_LOWER / (weeksToExam * goal.daysPerWeek) : REQUIRED_LOWER;

  const monthsMin = monthsForHours(REQUIRED_LOWER, weeklyHours);
  const monthsMax = monthsForHours(REQUIRED_UPPER, weeklyHours);
  const weeksToFinish = weeklyHours > 0 ? PLANNING_HOURS / weeklyHours : Infinity;
  const projectedFinish = Number.isFinite(weeksToFinish)
    ? addDays(today, Math.round(weeksToFinish * 7))
    : goal.examDate;
  const exceedsExam = projectedFinish > goal.examDate;

  let verdict: RealityCheck['verdict'];
  if (availableHours >= PLANNING_HOURS) verdict = 'comfortable';
  else if (availableHours >= REQUIRED_LOWER) verdict = 'tight';
  else if (availableHours >= REQUIRED_LOWER * 0.8) verdict = 'risky';
  else verdict = 'unrealistic';

  const headline =
    verdict === 'comfortable'
      ? 'Ini realistis, dengan buffer.'
      : verdict === 'tight'
        ? 'Bisa, tetapi tanpa banyak ruang untuk sakit atau bolos.'
        : verdict === 'risky'
          ? 'Ini ketat. Kami akan menandai risikonya.'
          : 'Dengan waktu ini, target tanggalnya belum realistis.';

  const mathLine = `${formatNumber(goal.hoursPerDay)} jam × ${goal.daysPerWeek} hari = ${formatNumber(weeklyHours)} jam/minggu. Sampai ujian: ${Math.round(availableHours)} jam. Target perencanaan kami ${PLANNING_HOURS} jam.`;

  const options: RealityOption[] = [
    {
      id: 'increase_hours',
      title: `Tambah jadi ${formatNumber(requiredHoursPerDay)} jam/hari`,
      detail: `Agar 700 jam muat sebelum ${formatDate(goal.examDate)}.`,
      effect: 'Rencana tetap 12 fase; beban harian naik.',
      recommended: requiredHoursPerDay <= 4.5,
      hoursPerDay: roundQuarter(requiredHoursPerDay),
    },
    {
      id: 'shift_exam',
      title: 'Geser ujian',
      detail: `Pace sekarang butuh sekitar ${Math.round(monthsForHours(PLANNING_HOURS, weeklyHours))} bulan.`,
      effect: `Siap sekitar ${formatDate(projectedFinish)}.`,
      recommended: true,
      examDate: projectedFinish,
    },
    {
      id: 'continue_risky',
      title: 'Lanjut dengan risiko',
      detail: 'Kami akan menandai rencana ini sebagai berisiko dan menurunkan jumlah item baru.',
      effect: 'Rencana lebih pendek dari cakupan; prioritas ke gate, bukan cakupan penuh.',
      recommended: false,
    },
  ];

  return {
    weeklyHours,
    daysToExam,
    weeksToExam,
    availableHours,
    requiredLower: REQUIRED_LOWER,
    requiredTarget: PLANNING_HOURS,
    requiredUpper: REQUIRED_UPPER,
    requiredHoursPerDay,
    requiredHoursPerDayLower,
    verdict,
    headline,
    mathLine,
    monthsMin,
    monthsMax,
    projectedFinish,
    exceedsExam,
    options,
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',').replace(/,?0+$/, '');
}

function roundQuarter(value: number): number {
  return clamp(Math.ceil(value * 4) / 4, 0.5, 8);
}

// ---------------------------------------------------------------------------
// Gates
// ---------------------------------------------------------------------------

interface GateStats {
  kanaAttempts: number;
  kanaAccuracy: number | null;
  vocabAttempts: number;
  accuracy: number | null;
  listeningAccuracy: number | null;
  coverage: number;
  mockCount: number;
  totalAttempts: number;
}

/** Evidence required to *leave* a phase. */
export function entryGate(phase: PhaseId, stats: GateStats): GateCheck {
  const label = PHASE_META[phase].label;
  switch (phase) {
    case 'foundations':
      return {
        phase,
        passed: true,
        label,
        detail: 'Titik awal — tidak ada gate masuk.',
      };
    case 'n5_bridge':
      return {
        phase,
        passed: stats.kanaAttempts >= 20 && (stats.kanaAccuracy ?? 0) >= 0.95,
        label,
        detail:
          stats.kanaAttempts >= 20
            ? `Akurasi kana ${Math.round((stats.kanaAccuracy ?? 0) * 100)}% (target 95%).`
            : 'Butuh minimal 20 jawaban kana untuk menilai gate.',
      };
    case 'n4_core_a':
      return {
        phase,
        passed: stats.vocabAttempts >= 40 && (stats.accuracy ?? 0) >= 0.7,
        label,
        detail:
          stats.vocabAttempts >= 40
            ? `Akurasi latihan ${Math.round((stats.accuracy ?? 0) * 100)}% (target 70%).`
            : 'Butuh 40 jawaban latihan untuk menilai gate.',
      };
    case 'n4_core_b':
      return {
        phase,
        passed: (stats.accuracy ?? 0) >= 0.75 && (stats.listeningAccuracy ?? 0) >= 0.6,
        label,
        detail: `Akurasi ${Math.round((stats.accuracy ?? 0) * 100)}%, menyimak ${Math.round((stats.listeningAccuracy ?? 0) * 100)}%.`,
      };
    case 'integration':
      return {
        phase,
        passed: stats.coverage >= 0.6 && (stats.listeningAccuracy ?? 0) >= 0.65,
        label,
        detail: `Coverage ${Math.round(stats.coverage * 100)}% (target 60%), menyimak ${Math.round((stats.listeningAccuracy ?? 0) * 100)}%.`,
      };
    case 'exam_sim':
      return {
        phase,
        passed: stats.mockCount >= 1,
        label,
        detail: stats.mockCount >= 1 ? 'Mock pertama sudah selesai.' : 'Butuh 1 full mock.',
      };
    case 'taper':
      return {
        phase,
        passed: stats.mockCount >= 2,
        label,
        detail: stats.mockCount >= 2 ? 'Dua mock sudah selesai.' : 'Butuh 2 full mock untuk masuk taper.',
      };
  }
}

/** Highest phase the evidence allows. */
export function allowedPhaseIndex(stats: GateStats): number {
  for (let i = 1; i < PHASE_ORDER.length; i += 1) {
    const phase = PHASE_ORDER[i]!;
    if (!entryGate(phase, stats).passed) return i - 1;
  }
  return PHASE_ORDER.length - 1;
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function buildPhases(goal: Goal, startDate: string): PlanPhase[] {
  const weeklyHours = Math.max(0.5, goal.hoursPerDay * goal.daysPerWeek);
  let cursor = startDate;
  let offset = STARTING_OFFSET_HOURS[goal.startingPoint];
  const phases: PlanPhase[] = [];

  for (const phase of PHASE_ORDER) {
    let hours = PHASE_HOURS[phase];
    if (offset > 0) {
      const consumed = Math.min(offset, hours * 0.85);
      hours -= consumed;
      offset -= consumed;
    }
    const days = Math.max(1, Math.round((hours / weeklyHours) * 7));
    const endDate = addDays(cursor, days - 1);
    phases.push({
      id: phase,
      label: PHASE_META[phase].label,
      startDate: cursor,
      endDate,
      hours: Math.round(hours),
      isCurrent: false,
      isComplete: false,
    });
    cursor = addDays(endDate, 1);
  }
  return phases;
}

function phaseIndexForDate(phases: PlanPhase[], today: string): number {
  const index = phases.findIndex((phase) => today >= phase.startDate && today <= phase.endDate);
  if (index >= 0) return index;
  if (today < phases[0]!.startDate) return 0;
  return phases.length - 1;
}

function planMocks(phases: PlanPhase[], goal: Goal): PlannedMock[] {
  const integration = phases.find((p) => p.id === 'integration');
  const examSim = phases.find((p) => p.id === 'exam_sim');
  const taper = phases.find((p) => p.id === 'taper');
  const mocks: PlannedMock[] = [];
  if (integration) {
    mocks.push({
      id: 'mock-a',
      formId: 'form-a',
      label: 'Mock A',
      date: addDays(integration.startDate, Math.max(3, Math.floor(diffDays(integration.startDate, integration.endDate) * 0.35))),
      phase: 'integration',
    });
  }
  if (examSim) {
    mocks.push({
      id: 'mock-b',
      formId: 'form-b',
      label: 'Mock B',
      date: addDays(examSim.startDate, Math.max(2, Math.floor(diffDays(examSim.startDate, examSim.endDate) * 0.3))),
      phase: 'exam_sim',
    });
  }
  if (taper) {
    mocks.push({
      id: 'mock-c',
      formId: 'form-a',
      label: 'Mock ringan',
      date: addDays(goal.examDate, -7),
      phase: 'taper',
    });
  }
  return mocks.sort((a, b) => a.date.localeCompare(b.date));
}

export function buildPlan(input: PlanInput): PlanSnapshot {
  const { goal, today } = input;
  const weeklyHours = Math.max(0.5, goal.hoursPerDay * goal.daysPerWeek);
  const daysToExam = Math.max(0, diffDays(today, goal.examDate));
  const weeksToExam = daysToExam / 7;

  const stats: GateStats = {
    kanaAttempts: input.kanaAttempts,
    kanaAccuracy: input.kanaAccuracy,
    vocabAttempts: input.vocabAttempts,
    accuracy: input.accuracy,
    listeningAccuracy: input.listeningAccuracy,
    coverage: clamp(input.coverage, 0, 1),
    mockCount: input.mockCount,
    totalAttempts: input.kanaAttempts + input.vocabAttempts,
  };

  const startDate = goal.createdAt ? todayISO(new Date(goal.createdAt)) : today;
  const phases = buildPhases(goal, startDate);
  const scheduledIndex = phaseIndexForDate(phases, today);
  const evidenceIndex = allowedPhaseIndex(stats);
  const currentIndex = Math.min(scheduledIndex, evidenceIndex);
  const pinned = evidenceIndex < scheduledIndex;

  const currentPhase = PHASE_ORDER[currentIndex]!;
  const meta = PHASE_META[currentPhase];

  // Recovery: ≥3 days since the last activity is a signal, not a moral failure.
  const missedDays = input.lastActivityDate ? Math.max(0, diffDays(input.lastActivityDate, today)) : 0;
  const recovery = input.lastActivityDate !== null && missedDays >= 3;
  const recoveryDays = recovery ? 3 : 0;

  let newItemCap = meta.newCap;
  let reviewCap = meta.reviewCap;
  if (recovery) {
    newItemCap = Math.floor(newItemCap * 0.5);
    reviewCap = Math.floor(reviewCap * 0.8);
  }
  if ((input.accuracy ?? 1) < 0.7 && input.vocabAttempts >= 20) {
    newItemCap = Math.max(0, Math.floor(newItemCap * 0.6));
  }
  if ((input.listeningAccuracy ?? 1) < 0.6) {
    reviewCap = Math.floor(reviewCap * 0.9);
  }

  const dailyBudgetMinutes = Math.round(goal.hoursPerDay * 60);
  const listeningRatio = Math.max(0.2, meta.listeningRatio);

  const completion = clamp(input.coverage, 0, 1);
  const remainingHours = PLANNING_HOURS * (1 - completion);
  const requiredHoursPerDay =
    weeksToExam > 0 ? remainingHours / (weeksToExam * goal.daysPerWeek) : remainingHours;

  const projectedFinish = addDays(today, Math.round((remainingHours / weeklyHours) * 7));
  const onTrack = projectedFinish <= goal.examDate;

  const mockDates = planMocks(phases, goal);
  const nextMock = mockDates.find((mock) => mock.date >= today) ?? null;

  const gate = pinned ? entryGate(currentPhase, stats) : null;

  const narrative: string[] = [];
  narrative.push(
    `Kami memakai ${PLANNING_HOURS} jam untuk kurikulum, bukan ${REQUIRED_LOWER} jam batas bawah. Buffer ini untuk review, mock, sakit, dan hidup.`,
  );
  narrative.push(
    `Dengan ${formatNumber(goal.hoursPerDay)} jam × ${goal.daysPerWeek} hari (${formatNumber(weeklyHours)} jam/minggu), fase ${meta.label} butuh sekitar ${Math.max(1, Math.round(PHASE_HOURS[currentPhase] / weeklyHours))} minggu.`,
  );
  if (pinned) {
    narrative.push(
      `Kalender sudah sampai fase berikutnya, tetapi gate "${gate?.label}" belum terpenuhi. Kami menahan materi baru sampai bukti cukup: ${gate?.detail}`,
    );
  }
  if (recovery) {
    narrative.push(
      `Kamu absen ${missedDays} hari. Rencana sudah dirapikan: item baru −50%, review disebar, tidak ada mock dalam 2 hari.`,
    );
  }
  if (!onTrack) {
    narrative.push(
      `Dengan pace ini, sisa ${Math.round(remainingHours)} jam baru selesai ${formatDate(projectedFinish)} — lewat ${formatDate(goal.examDate)}. Butuh sekitar ${formatNumber(requiredHoursPerDay)} jam/hari, atau geser tanggal.`,
    );
  }
  if (nextMock) {
    narrative.push(`Mock berikutnya: ${nextMock.label} pada ${formatDate(nextMock.date)}.`);
  }

  const updatedPhases = phases.map((phase, index) => ({
    ...phase,
    isCurrent: index === currentIndex,
    isComplete: index < currentIndex,
  }));

  return {
    createdAt: new Date().toISOString(),
    goalVersion: goal.version,
    startDate,
    examDate: goal.examDate,
    phases: updatedPhases,
    currentPhase,
    scheduledPhase: PHASE_ORDER[scheduledIndex]!,
    daysToExam,
    phasePinned: pinned,
    pinnedReason: pinned ? (gate?.detail ?? null) : null,
    weeklyHours,
    dailyBudgetMinutes,
    newItemCap,
    reviewCap,
    listeningMinutes: Math.round(dailyBudgetMinutes * listeningRatio),
    recovery,
    recoveryDays,
    nextMock,
    mockDates,
    weeksToExam,
    onTrack,
    requiredHoursPerDay,
    projectedFinish,
    narrative,
  };
}

/** Pick the session length that matches the day's real budget. */
export function recommendedMode(dailyBudgetMinutes: number, recovery: boolean): 'quick10' | 'core45' | 'deep90' | 'sprint150' | 'recovery' {
  if (recovery) return 'recovery';
  if (dailyBudgetMinutes <= 15) return 'quick10';
  if (dailyBudgetMinutes <= 60) return 'core45';
  if (dailyBudgetMinutes <= 110) return 'deep90';
  return 'sprint150';
}

export { formatMinutes };

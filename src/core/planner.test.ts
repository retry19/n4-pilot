import { describe, it, expect } from '../testkit.ts';
import type { Goal, PlanInput } from './types.ts';
import { buildPlan, computeReality, PHASE_HOURS, PLANNING_HOURS, recommendedMode } from './planner.ts';
import { diffDays } from './date.ts';
import { TODAY } from './test-helpers.ts';

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    createdAt: '2026-10-26T00:00:00.000Z',
    version: 1,
    examDate: '2027-12-05',
    examLabel: 'Desember 2027',
    examIsEstimate: true,
    startingPoint: 'zero',
    targetScore: 90,
    hoursPerDay: 2.25,
    daysPerWeek: 6,
    restDays: [0],
    track: 'sustainable',
    disclaimerAccepted: true,
    ...overrides,
  };
}

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    goal: makeGoal(),
    today: TODAY,
    cardCount: 300,
    dueCount: 12,
    overdueCount: 0,
    lastActivityDate: '2026-10-25',
    kanaAccuracy: 0.6,
    kanaAttempts: 5,
    vocabAttempts: 10,
    accuracy: 0.65,
    listeningAccuracy: 0.5,
    coverage: 0.12,
    mockCount: 0,
    ...overrides,
  };
}

describe('Reality check', () => {
  it('is comfortable at 2.25h × 6 days for December 2027', () => {
    const reality = computeReality(makeGoal(), TODAY);
    expect(reality.weeklyHours).toBe(13.5);
    expect(reality.verdict).toBe('comfortable');
    expect(reality.availableHours).toBeGreaterThan(PLANNING_HOURS);
    expect(reality.monthsMin).toBeLessThan(reality.monthsMax);
  });

  it('flags 1.5h × 6 days as risky, not comfortable', () => {
    const reality = computeReality(makeGoal({ hoursPerDay: 1.5 }), TODAY);
    expect(reality.verdict).toBe('risky');
    expect(reality.availableHours).toBeLessThan(575);
    expect(reality.options.map((o) => o.id)).toEqual(['increase_hours', 'shift_exam', 'continue_risky']);
    expect(reality.headline).toMatch(/risiko|risik/i);
  });

  it('calls out an unserious budget as unrealistic', () => {
    const reality = computeReality(makeGoal({ hoursPerDay: 1, daysPerWeek: 3 }), TODAY);
    expect(reality.verdict).toBe('unrealistic');
    expect(reality.availableHours).toBeLessThan(575 * 0.8);
  });

  it('never shows the word "gagal" in the reality copy', () => {
    const reality = computeReality(makeGoal({ hoursPerDay: 0.5, daysPerWeek: 3 }), TODAY);
    const copy = [reality.headline, reality.mathLine, ...reality.options.map((o) => o.title + o.detail)].join(' ');
    expect(copy.toLowerCase()).not.toContain('gagal');
  });
});

describe('Plan generator', () => {
  it('allocates 700 hours across phases, ending near the exam', () => {
    const total = Object.values(PHASE_HOURS).reduce((sum, hours) => sum + hours, 0);
    expect(total).toBeGreaterThanOrEqual(695);
    expect(total).toBeLessThanOrEqual(705);

    const plan = buildPlan(makeInput());
    expect(plan.phases).toHaveLength(7);
    expect(plan.phases[0]!.startDate).toBe('2026-10-26');
    const span = diffDays(plan.phases[0]!.startDate, plan.phases.at(-1)!.endDate);
    expect(span).toBeGreaterThan(330);
    expect(span).toBeLessThan(400);
  });

  it('starts a new absolute beginner at Foundations', () => {
    const plan = buildPlan(makeInput());
    expect(plan.currentPhase).toBe('foundations');
    expect(plan.phasePinned).toBe(false);
    expect(plan.newItemCap).toBeGreaterThan(0);
    expect(plan.listeningMinutes).toBeGreaterThanOrEqual(12);
  });

  it('pins an over-scheduled learner to the phase their evidence supports', () => {
    const plan = buildPlan(
      makeInput({
        goal: makeGoal({ createdAt: '2026-01-01T00:00:00.000Z' }),
        coverage: 0.05,
        vocabAttempts: 4,
        kanaAttempts: 2,
        lastActivityDate: '2026-10-25',
      }),
    );
    expect(plan.currentPhase).toBe('foundations');
    expect(plan.phasePinned).toBe(true);
    expect(plan.pinnedReason).toBeTruthy();
    expect(plan.narrative.join(' ')).toMatch(/gate/i);
  });

  it('enters recovery after three missed days and halves new items', () => {
    const normal = buildPlan(makeInput({ lastActivityDate: '2026-10-25' }));
    const recovery = buildPlan(makeInput({ lastActivityDate: '2026-10-22' }));
    expect(recovery.recovery).toBe(true);
    expect(recovery.newItemCap).toBeLessThanOrEqual(Math.ceil(normal.newItemCap * 0.5));
    expect(recovery.narrative.join(' ')).toMatch(/absen 4 hari|dirapikan/i);
  });

  it('does not mark recovery for a brand new learner', () => {
    const plan = buildPlan(makeInput({ lastActivityDate: null }));
    expect(plan.recovery).toBe(false);
  });

  it('schedules two full mocks plus a light taper mock', () => {
    const plan = buildPlan(makeInput());
    const full = plan.mockDates.filter((mock) => mock.label.startsWith('Mock A') || mock.label.startsWith('Mock B'));
    expect(full).toHaveLength(2);
    expect(plan.mockDates.at(-1)!.label).toBe('Mock ringan');
    expect(plan.nextMock).not.toBeNull();
  });

  it('warns honestly when the pace misses the exam date', () => {
    const plan = buildPlan(
      makeInput({
        goal: makeGoal({ hoursPerDay: 1, daysPerWeek: 4, examDate: '2027-07-04' }),
        kanaAttempts: 40,
        kanaAccuracy: 0.98,
        vocabAttempts: 300,
        accuracy: 0.8,
        listeningAccuracy: 0.7,
        coverage: 0.1,
        mockCount: 2,
      }),
    );
    expect(plan.onTrack).toBe(false);
    expect(plan.projectedFinish > plan.examDate).toBe(true);
    expect(plan.narrative.join(' ')).toMatch(/jam\/hari|geser/i);
  });

  it('recommends a session mode that matches the daily budget', () => {
    expect(recommendedMode(10, false)).toBe('quick10');
    expect(recommendedMode(45, false)).toBe('core45');
    expect(recommendedMode(90, false)).toBe('deep90');
    expect(recommendedMode(135, false)).toBe('sprint150');
    expect(recommendedMode(135, true)).toBe('recovery');
  });
});

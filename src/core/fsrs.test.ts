import { describe, it, expect } from '../testkit.ts';
import {
  autoRating,
  intervalForStability,
  isLeech,
  newState,
  previewIntervals,
  retrievability,
  schedule,
} from './fsrs.ts';
import { addDays, addMinutes } from './date.ts';

const NOW = new Date('2026-10-26T09:00:00.000Z');

describe('FSRS scheduler', () => {
  it('starts as a new card and schedules the first Good review in days', () => {
    const fresh = newState(NOW);
    expect(fresh.phase).toBe('new');
    expect(fresh.reps).toBe(0);

    const next = schedule(fresh, 3, NOW, { examDate: '2027-12-05' });
    expect(next.reps).toBe(1);
    expect(next.phase).toBe('review');
    expect(next.scheduledDays).toBeGreaterThanOrEqual(3);
    expect(next.scheduledDays).toBeLessThanOrEqual(5);
  });

  it('relearns a lapsed card in 10 minutes', () => {
    const fresh = schedule(newState(NOW), 3, NOW, { examDate: '2027-12-05' });
    const later = new Date('2026-10-30T09:00:00.000Z');
    const lapsed = schedule(fresh, 1, later, { examDate: '2027-12-05' });
    expect(lapsed.phase).toBe('relearning');
    expect(lapsed.lapses).toBe(1);
    const minutes = (new Date(lapsed.due).getTime() - later.getTime()) / 60_000;
    expect(minutes).toBeCloseTo(10, 0);
  });

  it('returns ~0.9 retrievability after stability days', () => {
    const state = { ...newState(NOW), reps: 2, stability: 10, difficulty: 5, lastReview: NOW.toISOString(), phase: 'review' as const };
    const afterTenDays = new Date(NOW.getTime() + 10 * 86_400_000);
    expect(retrievability(state, afterTenDays)).toBeCloseTo(0.9, 2);
    expect(retrievability(state, new Date(NOW.getTime() + 30 * 86_400_000))).toBeLessThan(0.9);
  });

  it('maps stability to interval at desired retention', () => {
    expect(intervalForStability(10, 0.9)).toBe(10);
    expect(intervalForStability(10, 0.8)).toBeGreaterThan(10);
    expect(intervalForStability(1, 0.95)).toBeLessThan(1 + 1);
  });

  it('never schedules past the exam date', () => {
    const examDate = '2026-11-20';
    const state = { ...newState(NOW), reps: 5, stability: 60, difficulty: 5, lastReview: NOW.toISOString(), phase: 'review' as const };
    const next = schedule(state, 3, NOW, { examDate, examWeight: 0.6 });
    expect(new Date(next.due).getTime()).toBeLessThanOrEqual(new Date(`${examDate}T23:59:59`).getTime());
  });

  it('pulls high-weight items into the final window before the exam', () => {
    const examDate = '2026-11-05';
    const now = new Date('2026-10-28T09:00:00.000Z');
    const state = { ...newState(now), reps: 4, stability: 30, difficulty: 5, lastReview: now.toISOString(), phase: 'review' as const };
    const next = schedule(state, 3, now, { examDate, examWeight: 0.95, key: 'vocab:v-1:recognition' });
    const due = new Date(next.due);
    expect(due.getTime()).toBeLessThan(new Date(`${examDate}T23:59:59`).getTime());
    expect(due.getTime()).toBeGreaterThan(now.getTime());
  });

  it('auto-grades multiple choice by correctness and speed', () => {
    expect(autoRating(false, 2000, 10000, false)).toBe(1);
    expect(autoRating(true, 2000, 10000, true)).toBe(3);
    expect(autoRating(true, 1500, 10000, false)).toBe(4);
    expect(autoRating(true, 12000, 10000, false)).toBe(2);
  });

  it('flags leeches after repeated lapses', () => {
    const fresh = newState(NOW);
    expect(isLeech(fresh)).toBe(false);
    expect(isLeech({ ...fresh, lapses: 4, reps: 10 })).toBe(true);
    expect(isLeech({ ...fresh, lapses: 0, reps: 9, stability: 0.5 })).toBe(true);
  });

  it('previews all four rating intervals with human labels', () => {
    const preview = previewIntervals(newState(NOW), NOW, { examDate: '2027-12-05' });
    expect(preview.again).toMatch(/mnt/);
    for (const key of ['hard', 'good', 'easy'] as const) {
      expect(preview[key]).toMatch(/hr|bln/);
    }
  });

  it('rejects an exam date in the past by keeping reviews bounded', () => {
    const next = schedule(newState(NOW), 3, NOW, { examDate: '2026-10-25' });
    expect(new Date(next.due).getTime()).toBeGreaterThanOrEqual(NOW.getTime());
  });

  it('adds minutes correctly for learning steps', () => {
    expect(addMinutes('2026-10-26T09:00:00.000Z', 10)).toBe('2026-10-26T09:10:00.000Z');
  });
});

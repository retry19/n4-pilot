/**
 * App store (zustand). One document, explicit mutations, debounced persistence.
 *
 * Every answer flows through `applyAnswer`, so FSRS scheduling, attempt logs,
 * error taxonomy, readiness history and coverage can never drift apart.
 */
import { create } from 'zustand';
import type {
  ActiveMock,
  AppState,
  Attempt,
  AttemptSource,
  ErrorCause,
  ErrorEvent,
  Goal,
  MockAnswer,
  MockReport,
  MockSectionId,
  SessionMode,
  SessionPlan,
  SessionRecord,
  Settings,
  StudyCard,
} from '../core/types.ts';
import { MOCK_SECTIONS, SESSION_MODES } from '../core/types.ts';
import { autoRating, isDue, newState, schedule } from '../core/fsrs.ts';
import { classifyError, createErrorEvent, resolveErrorsForCorrect } from '../core/errors.ts';
import { todayISO } from '../core/date.ts';
import { id } from '../core/util.ts';
import { CARD_BY_KEY, CURRICULUM, MOCK_FORM_BY_ID, MOCK_FORMS } from '../content/index.ts';
import { scoreMock } from '../core/mock.ts';
import { composeSession } from '../core/session.ts';
import { buildPlan } from '../core/planner.ts';
import { pickN } from '../core/util.ts';
import { planFor, readinessFor, sessionPools, statsFor } from './derive.ts';
import {
  clearPersisted,
  createInitialState,
  exportState,
  importState,
  loadState,
  persistSoon,
} from './persistence.ts';

const SCHEDULABLE = new Set(CURRICULUM.map((unit) => unit.card.key));

export interface AnswerResult {
  correct: boolean;
  card: StudyCard | null;
  cause: ErrorCause | null;
  explanation: string;
  evidence?: string;
  contrast?: string;
}

interface Store {
  data: AppState;
  hydrated: boolean;
  toast: string | null;
  actions: {
    hydrate: () => void;
    notify: (message: string) => void;
    updateSettings: (patch: Partial<Settings>) => void;
    completeOnboarding: (input: {
      startingPoint: Goal['startingPoint'];
      examDate: string;
      examLabel: string;
      examIsEstimate: boolean;
      hoursPerDay: number;
      daysPerWeek: number;
      targetScore: Goal['targetScore'];
      betaAcknowledged: boolean;
    }) => void;
    updateGoal: (patch: Partial<Goal>) => void;
    startSession: (mode: SessionMode) => SessionPlan | null;
    answerStep: (stepId: string, optionId: string, ms: number) => AnswerResult | null;
    advanceStep: () => void;
    completeSession: () => void;
    leaveSession: () => void;
    discardSession: () => void;
    reviewAnswer: (cardKey: string, optionId: string, ms: number) => AnswerResult | null;
    addToReview: (itemId: string) => boolean;
    startMock: (formId: string) => boolean;
    answerMock: (cardKey: string, optionId: string) => void;
    flagMock: (cardKey: string) => void;
    setMockCardIndex: (index: number) => void;
    finishMockSection: () => void;
    beginMockSection: () => void;
    submitMock: () => MockReport | null;
    abortMock: () => void;
    startFixitSession: (cardKeys: string[], label: string) => boolean;
    startDrill: (domain: 'vocabulary' | 'grammar_reading' | 'listening') => boolean;
    dismiss: (key: string) => void;
    resetAll: () => void;
    exportJson: () => string;
    importJson: (json: string) => boolean;
    refreshPlan: () => void;
  };
}

function upsertReadiness(data: AppState): AppState {
  const readiness = readinessFor(data);
  if (!readiness) return data;
  const point = readiness.history.at(-1);
  if (!point) return data;
  const history = [...data.readinessHistory.filter((entry) => entry.date !== point.date), point].slice(-30);
  return { ...data, readinessHistory: history };
}

function noteStudyDay(data: AppState, today: string): AppState {
  const studyDates = data.studyDates.includes(today) ? data.studyDates : [...data.studyDates, today].slice(-400);
  return {
    ...data,
    studyDates,
    lastActivityDate: !data.lastActivityDate || today > data.lastActivityDate ? today : data.lastActivityDate,
  };
}

function markErrorResolution(errors: ErrorEvent[], card: StudyCard, at: string): ErrorEvent[] {
  const tags = new Set(card.tags);
  const groupKeys = new Set(
    errors
      .filter((error) => {
        if (error.status === 'resolved') return false;
        if (error.itemId === card.itemId) return true;
        const tag = error.groupKey.split(':')[1];
        return error.domain === card.domain && tag !== undefined && tags.has(tag);
      })
      .map((error) => error.groupKey),
  );
  let next = errors;
  for (const groupKey of groupKeys) {
    next = resolveErrorsForCorrect(next, groupKey, card.key, at);
  }
  return next;
}

function applyAnswer(
  data: AppState,
  card: StudyCard,
  optionId: string,
  ms: number,
  source: AttemptSource,
  now: Date,
): { data: AppState; result: AnswerResult } {
  const today = todayISO(now);
  const prior = data.attempts.filter((attempt) => attempt.itemId === card.itemId);
  const correct = optionId === card.correct;
  const firstExposure = prior.length === 0;
  const attempt: Attempt = {
    id: id('att'),
    at: now.toISOString(),
    date: today,
    cardKey: card.key,
    itemId: card.itemId,
    domain: card.domain,
    itemType: card.itemType,
    modality: card.modality,
    correct,
    ms,
    source,
    optionId,
    firstExposure,
  };

  let cards = data.cards;
  let cardMeta = data.cardMeta;
  let reviewLogs = data.reviewLogs;
  let cause: ErrorCause | null = null;

  const schedulable = SCHEDULABLE.has(card.key) || Boolean(data.cardMeta[card.key]);
  if (schedulable) {
    const previous = data.cards[card.key] ?? newState(now);
    const rating = autoRating(correct, ms, card.timeTargetSeconds * 1000, previous.reps === 0);
    const next = schedule(previous, rating, now, {
      examDate: data.goal?.examDate ?? null,
      examWeight: card.examWeight,
      key: card.key,
    });
    cards = { ...data.cards, [card.key]: next };
    cardMeta = {
      ...data.cardMeta,
      [card.key]: { itemId: card.itemId, domain: card.domain, modality: card.modality, itemType: card.itemType },
    };
    reviewLogs = [
      ...data.reviewLogs,
      {
        id: id('rev'),
        at: now.toISOString(),
        cardKey: card.key,
        rating,
        correct,
        ms,
        source,
        scheduledDays: next.scheduledDays,
      },
    ].slice(-5000);
  }

  let errors = data.errors;
  if (!correct) {
    cause = classifyError({
      card,
      priorAttempts: prior.length,
      priorCorrect: prior.filter((item) => item.correct).length,
      ms,
      isMock: source === 'mock',
    });
    const wrong = card.options.find((option) => option.id === optionId)?.text ?? '—';
    const right = card.options.find((option) => option.id === card.correct)?.text ?? '—';
    const event = createErrorEvent({
      card,
      chosenOptionId: optionId,
      cause,
      at: now.toISOString(),
      domain: card.domain,
      itemType: card.itemType,
      question: card.prompt.question || card.prompt.ja || card.prompt.text || 'Soal',
      answerText: wrong,
      correctText: right,
    });
    errors = [event, ...data.errors].slice(-400);
  } else {
    errors = markErrorResolution(data.errors, card, now.toISOString());
  }

  const nextData = noteStudyDay(
    {
      ...data,
      attempts: [...data.attempts, attempt].slice(-6000),
      cards,
      cardMeta,
      reviewLogs,
      errors,
    },
    today,
  );

  return {
    data: nextData,
    result: {
      correct,
      card,
      cause,
      explanation: card.explanation,
      evidence: card.evidence,
      contrast: card.contrast,
    },
  };
}

export const useApp = create<Store>()((set, get) => {
  const persistAndSet = (updater: (data: AppState) => AppState) => {
    set((store) => {
      const data = updater(store.data);
      persistSoon(data);
      return { data };
    });
  };

  return {
    data: loadState(),
    hydrated: false,
    toast: null,
    actions: {
      hydrate: () => {
        const data = get().data;
        const plan = planFor(data);
        set({ hydrated: true, data: { ...data, plan: plan ?? data.plan } });
      },

      notify: (message) => {
        set({ toast: message });
        setTimeout(() => {
          if (get().toast === message) set({ toast: null });
        }, 2800);
      },

      updateSettings: (patch) => {
        persistAndSet((data) => ({ ...data, settings: { ...data.settings, ...patch } }));
      },

      completeOnboarding: (input) => {
        persistAndSet((data) => {
          const now = new Date();
          const today = todayISO(now);
          const goal: Goal = {
            id: id('goal'),
            createdAt: now.toISOString(),
            version: 1,
            examDate: input.examDate,
            examLabel: input.examLabel,
            examIsEstimate: input.examIsEstimate,
            startingPoint: input.startingPoint,
            targetScore: input.targetScore,
            hoursPerDay: input.hoursPerDay,
            daysPerWeek: input.daysPerWeek,
            restDays: [],
            track: input.hoursPerDay * input.daysPerWeek >= 27 ? 'intensive' : input.hoursPerDay * input.daysPerWeek >= 18 ? 'sprint' : 'sustainable',
            disclaimerAccepted: true,
          };
          const withGoal = {
            ...data,
            goal,
            profile: { ...data.profile, onboardingComplete: true, betaAcknowledged: input.betaAcknowledged },
          };
          const plan = buildPlan({
            goal,
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
          });
          return { ...withGoal, plan };
        });
      },

      updateGoal: (patch) => {
        persistAndSet((data) => {
          if (!data.goal) return data;
          const goal: Goal = { ...data.goal, ...patch, version: data.goal.version + 1 };
          const plan = planFor({ ...data, goal });
          return { ...data, goal, plan: plan ?? data.plan };
        });
        get().actions.notify('Rencana diperbarui. Progresmu tetap aman.');
      },

      startSession: (mode) => {
        const data = get().data;
        if (data.activeSession) return data.activeSession.plan;
        const plan = planFor(data);
        if (!plan) return null;
        const pools = sessionPools(data, plan, todayISO());
        const session = composeSession({
          today: todayISO(),
          phase: plan.currentPhase,
          goalVersion: plan.goalVersion,
          mode,
          budgetMinutes: SESSION_MODES[mode].minutes,
          reviewCap: plan.reviewCap,
          newItemCap: plan.newItemCap,
          listeningMinutes: plan.listeningMinutes,
          recovery: plan.recovery,
          pools,
        });
        const record: SessionRecord = {
          id: session.id,
          plan: session,
          startedAt: new Date().toISOString(),
          endedAt: null,
          cursor: 0,
          answers: [],
          completed: false,
          correct: 0,
          total: 0,
        };
        persistAndSet((current) => ({
          ...current,
          activeSession: record,
          quick10UsedDates:
            mode === 'quick10' || mode === 'recovery'
              ? [...new Set([...current.quick10UsedDates, todayISO()])].slice(-60)
              : current.quick10UsedDates,
        }));
        return session;
      },

      answerStep: (stepId, optionId, ms) => {
        const data = get().data;
        const record = data.activeSession;
        if (!record) return null;
        const step = record.plan.steps[record.cursor];
        if (!step || step.id !== stepId) return null;
        if (!step.cardKey) {
          get().actions.advanceStep();
          return null;
        }
        // Answering must NOT advance the cursor: the learner needs to read the
        // feedback before the next card replaces it.
        if (record.answers.some((answer) => answer.stepId === stepId)) return null;
        const card = CARD_BY_KEY.get(step.cardKey);
        if (!card) {
          get().actions.advanceStep();
          return null;
        }
        const applied = applyAnswer(data, card, optionId, ms, 'session', new Date());
        const answer = {
          stepId,
          cardKey: card.key,
          optionId,
          correct: applied.result.correct,
          ms,
          at: new Date().toISOString(),
          selfRated: false,
        };
        persistAndSet((current) => ({
          ...applied.data,
          activeSession: current.activeSession
            ? {
                ...current.activeSession,
                answers: [...current.activeSession.answers, answer],
                correct: current.activeSession.correct + (applied.result.correct ? 1 : 0),
                total: current.activeSession.total + 1,
              }
            : null,
        }));
        return applied.result;
      },

      advanceStep: () => {
        const data = get().data;
        if (!data.activeSession) return;
        persistAndSet((current) => {
          if (!current.activeSession) return current;
          return {
            ...current,
            activeSession: {
              ...current.activeSession,
              cursor: Math.min(current.activeSession.cursor + 1, current.activeSession.plan.steps.length),
            },
          };
        });
      },

      completeSession: () => {
        const data = get().data;
        const record = data.activeSession;
        if (!record) return;
        persistAndSet((current) => {
          if (!current.activeSession) return current;
          const finished: SessionRecord = {
            ...current.activeSession,
            endedAt: new Date().toISOString(),
            completed: true,
          };
          const sessions = [...current.sessions, finished].slice(-60);
          const next = { ...current, sessions, activeSession: null };
          return upsertReadiness(next);
        });
        const answered = record.answers.length;
        const correct = record.answers.filter((answer) => answer.correct).length;
        get().actions.notify(
          answered > 0
            ? `Sesi selesai · ${correct}/${answered} benar. Progres tersimpan.`
            : 'Sesi selesai. Besok kita lanjut.',
        );
      },

      leaveSession: () => {
        persistSoon(get().data);
      },

      discardSession: () => {
        persistAndSet((data) => ({ ...data, activeSession: null }));
      },

      reviewAnswer: (cardKey, optionId, ms) => {
        const data = get().data;
        const card = CARD_BY_KEY.get(cardKey);
        if (!card) return null;
        const applied = applyAnswer(data, card, optionId, ms, 'review', new Date());
        persistAndSet(() => applied.data);
        return applied.result;
      },

      addToReview: (itemId) => {
        const data = get().data;
        const unit = CURRICULUM.find((candidate) => candidate.itemId === itemId);
        if (!unit) return false;
        if (data.cards[unit.card.key]) {
          get().actions.notify('Item ini sudah ada di review.');
          return false;
        }
        const now = new Date();
        persistAndSet((current) => ({
          ...current,
          cards: { ...current.cards, [unit.card.key]: { ...newState(now), due: now.toISOString() } },
          cardMeta: {
            ...current.cardMeta,
            [unit.card.key]: {
              itemId: unit.card.itemId,
              domain: unit.card.domain,
              modality: unit.card.modality,
              itemType: unit.card.itemType,
            },
          },
        }));
        get().actions.notify('Ditambahkan ke review.');
        return true;
      },

      startMock: (formId) => {
        const form = MOCK_FORM_BY_ID.get(formId);
        if (!form) return false;
        const now = new Date().toISOString();
        persistAndSet((data) => ({
          ...data,
          activeMock: {
            formId,
            startedAt: now,
            sectionIndex: 0,
            sectionStartedAt: now,
            currentCardIndex: 0,
            answers: {},
            minutesUsed: { vocabulary: 0, grammar_reading: 0, listening: 0 },
            phase: 'running',
            breakStartedAt: null,
          },
        }));
        return true;
      },

      setMockCardIndex: (index) => {
        persistAndSet((data) =>
          data.activeMock ? { ...data, activeMock: { ...data.activeMock, currentCardIndex: Math.max(0, index) } } : data,
        );
      },

      answerMock: (cardKey, optionId) => {
        persistAndSet((data) => {
          if (!data.activeMock) return data;
          return {
            ...data,
            activeMock: {
              ...data.activeMock,
              answers: { ...data.activeMock.answers, [cardKey]: { optionId, flagged: data.activeMock.answers[cardKey]?.flagged ?? false } },
            },
          };
        });
      },

      flagMock: (cardKey) => {
        persistAndSet((data) => {
          if (!data.activeMock) return data;
          const existing = data.activeMock.answers[cardKey];
          return {
            ...data,
            activeMock: {
              ...data.activeMock,
              answers: {
                ...data.activeMock.answers,
                [cardKey]: { optionId: existing?.optionId ?? '', flagged: !existing?.flagged },
              },
            },
          };
        });
      },

      finishMockSection: () => {
        const data = get().data;
        const active = data.activeMock;
        if (!active) return;
        const section = MOCK_SECTIONS[active.sectionIndex];
        if (!section) return;
        const minutes = Math.max(1, Math.round((Date.now() - new Date(active.sectionStartedAt).getTime()) / 60_000));
        const minutesUsed = { ...active.minutesUsed, [section.id]: minutes };
        if (active.sectionIndex >= MOCK_SECTIONS.length - 1) {
          persistAndSet((current) =>
            current.activeMock ? { ...current, activeMock: { ...current.activeMock, minutesUsed } } : current,
          );
          get().actions.submitMock();
          return;
        }
        persistAndSet((current) =>
          current.activeMock
            ? {
                ...current,
                activeMock: {
                  ...current.activeMock,
                  minutesUsed,
                  phase: 'break',
                  breakStartedAt: new Date().toISOString(),
                },
              }
            : current,
        );
      },

      beginMockSection: () => {
        persistAndSet((data) => {
          if (!data.activeMock) return data;
          return {
            ...data,
            activeMock: {
              ...data.activeMock,
              sectionIndex: Math.min(data.activeMock.sectionIndex + 1, MOCK_SECTIONS.length - 1),
              sectionStartedAt: new Date().toISOString(),
              currentCardIndex: 0,
              phase: 'running',
              breakStartedAt: null,
            },
          };
        });
      },

      submitMock: () => {
        const data = get().data;
        const active = data.activeMock;
        if (!active) return null;
        const form = MOCK_FORM_BY_ID.get(active.formId);
        if (!form) return null;
        const now = new Date();
        const cards = [...form.sections.vocabulary, ...form.sections.grammar_reading, ...form.sections.listening];
        const answers: MockAnswer[] = [];
        for (const card of cards) {
          const entry = active.answers[card.key];
          if (!entry?.optionId) continue;
          answers.push({ cardKey: card.key, optionId: entry.optionId, flagged: entry.flagged, ms: 30_000 });
        }
        const minutes = { ...active.minutesUsed };
        const section = MOCK_SECTIONS[active.sectionIndex];
        if (section) {
          minutes[section.id] = Math.max(
            minutes[section.id],
            Math.round((Date.now() - new Date(active.sectionStartedAt).getTime()) / 60_000),
          );
        }
        const report = scoreMock(form, answers, minutes, now.toISOString());

        let next: AppState = {
          ...data,
          mocks: [
            ...data.mocks,
            {
              id: id('mock'),
              formId: form.id,
              startedAt: active.startedAt,
              submittedAt: now.toISOString(),
              answers,
              report,
              sectionMinutes: minutes,
            },
          ].slice(-12),
          activeMock: null,
        };

        // Wrong answers become error-notebook entries with a taxonomy cause.
        for (const card of cards) {
          const answer = answers.find((item) => item.cardKey === card.key);
          if (!answer || answer.optionId === card.correct) continue;
          const prior = next.attempts.filter((attempt) => attempt.itemId === card.itemId);
          const cause = classifyError({
            card,
            priorAttempts: prior.length,
            priorCorrect: prior.filter((item) => item.correct).length,
            ms: 30_000,
            isMock: true,
          });
          const wrong = card.options.find((option) => option.id === answer.optionId)?.text ?? '—';
          const right = card.options.find((option) => option.id === card.correct)?.text ?? '—';
          next = {
            ...next,
            errors: [
              createErrorEvent({
                card,
                chosenOptionId: answer.optionId,
                cause,
                at: now.toISOString(),
                domain: card.domain,
                itemType: card.itemType,
                question: card.prompt.question || card.prompt.ja || card.prompt.text || 'Soal',
                answerText: wrong,
                correctText: right,
              }),
              ...next.errors,
            ].slice(-400),
          };
        }

        // Mock attempts are evidence (coverage, accuracy) but must not schedule SRS.
        const mockAttempts: Attempt[] = answers.map((answer) => {
          const card = CARD_BY_KEY.get(answer.cardKey)!;
          return {
            id: id('att'),
            at: now.toISOString(),
            date: todayISO(now),
            cardKey: card.key,
            itemId: card.itemId,
            domain: card.domain,
            itemType: card.itemType,
            modality: card.modality,
            correct: answer.optionId === card.correct,
            ms: answer.ms,
            source: 'mock',
            optionId: answer.optionId,
            firstExposure: !next.attempts.some((attempt) => attempt.itemId === card.itemId),
          };
        });

        next = noteStudyDay({ ...next, attempts: [...next.attempts, ...mockAttempts].slice(-6000) }, todayISO(now));
        next = upsertReadiness(next);
        persistAndSet(() => next);
        return report;
      },

      abortMock: () => {
        persistAndSet((data) => ({ ...data, activeMock: null }));
      },

      startFixitSession: (cardKeys, label) => {
        const data = get().data;
        if (data.activeSession) return false;
        const plan = planFor(data);
        if (!plan) return false;
        const cards = cardKeys
          .map((key) => CARD_BY_KEY.get(key))
          .filter((card): card is StudyCard => Boolean(card));
        if (cards.length === 0) return false;
        const session = composeSession({
          today: todayISO(),
          phase: plan.currentPhase,
          goalVersion: plan.goalVersion,
          mode: 'fixit',
          budgetMinutes: 10,
          reviewCap: 6,
          newItemCap: 0,
          listeningMinutes: 0,
          recovery: false,
          reason: `Fix-it · ${label}`,
          pools: { due: [], newItems: [], apply: [], listening: [], fixit: cards },
        });
        const record: SessionRecord = {
          id: session.id,
          plan: session,
          startedAt: new Date().toISOString(),
          endedAt: null,
          cursor: 0,
          answers: [],
          completed: false,
          correct: 0,
          total: 0,
        };
        persistAndSet((current) => ({ ...current, activeSession: record }));
        return true;
      },

      startDrill: (domain) => {
        const data = get().data;
        if (data.activeSession) return false;
        const form = MOCK_FORMS[0]!;
        const pool = form.sections[domain];
        const cards = pickN(pool, Math.min(10, pool.length), `drill-${domain}-${todayISO()}`);
        if (cards.length === 0) return false;
        const label =
          domain === 'vocabulary' ? 'Kosakata' : domain === 'grammar_reading' ? 'Grammar & Membaca' : 'Menyimak';
        const steps: SessionRecord['plan']['steps'] = cards.map((card, index) => ({
          id: `drill-${index + 1}`,
          block: 'prove',
          kind:
            card.domain === 'listening'
              ? 'listening'
              : card.domain === 'reading'
                ? 'reading'
                : 'card',
          cardKey: card.key,
          itemId: card.itemId,
          estimateSeconds: 60,
        }));
        steps.push({ id: 'drill-recap', block: 'recap', kind: 'recap', estimateSeconds: 30 });
        const plan: SessionPlan = {
          id: id('drill'),
          createdAt: new Date().toISOString(),
          date: todayISO(),
          mode: 'drill',
          goalVersion: data.goal?.version ?? 1,
          steps,
          blockCounts: { prove: cards.length, recap: 1 },
          estimatedMinutes: 10,
          reason: `Drill ${label} · ${cards.length} soal format ujian`,
          recovery: false,
        };
        const record: SessionRecord = {
          id: plan.id,
          plan,
          startedAt: new Date().toISOString(),
          endedAt: null,
          cursor: 0,
          answers: [],
          completed: false,
          correct: 0,
          total: 0,
        };
        persistAndSet((current) => ({ ...current, activeSession: record }));
        return true;
      },

      dismiss: (key) => {
        persistAndSet((data) => ({
          ...data,
          dismissed: data.dismissed.includes(key) ? data.dismissed : [...data.dismissed, key],
        }));
      },

      resetAll: () => {
        clearPersisted();
        set({ data: createInitialState(), toast: null });
      },

      exportJson: () => exportState(get().data),

      importJson: (json) => {
        const imported = importState(json);
        if (!imported) return false;
        set({ data: imported });
        persistSoon(imported);
        return true;
      },

      refreshPlan: () => {
        const data = get().data;
        const plan = planFor(data);
        if (!plan) return;
        persistAndSet((current) => ({ ...current, plan }));
      },
    },
  };
});

export function useActions(): Store['actions'] {
  return useApp((store) => store.actions);
}

/** Mock timer remaining seconds for the current section, derived (never decremented). */
export function mockRemainingSeconds(active: ActiveMock, now: Date = new Date()): number {
  const section = MOCK_SECTIONS[active.sectionIndex];
  if (!section || active.phase === 'break') return 0;
  const elapsed = (now.getTime() - new Date(active.sectionStartedAt).getTime()) / 1000;
  return Math.max(0, section.minutes * 60 - elapsed);
}

export function mockSectionId(active: ActiveMock): MockSectionId | null {
  return MOCK_SECTIONS[active.sectionIndex]?.id ?? null;
}

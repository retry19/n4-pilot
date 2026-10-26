/**
 * Scenario fixtures: reproducible AppState for QA, readiness debugging and
 * route smoke tests. No user data is touched; states are built in memory and
 * optionally written to `fixtures/` as importable JSON.
 *
 * Usage:
 *   npm run scenario                 # list
 *   npm run scenario -- two-mocks    # write fixtures/two-mocks.json
 *   npm run scenario -- --all
 *   npm run scenario -- exam-week --today 2026-10-26
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DAY = 86_400_000;

let cached = null;
async function load() {
  if (cached) return cached;
  const url = (relative) => pathToFileURL(path.join(ROOT, relative)).href;
  const [content, mock, derive, persistence, date] = await Promise.all([
    import(url('src/content/index.ts')),
    import(url('src/core/mock.ts')),
    import(url('src/state/derive.ts')),
    import(url('src/state/persistence.ts')),
    import(url('src/core/date.ts')),
  ]);
  cached = { content, mock, derive, persistence, date };
  return cached;
}

function at(base, dayOffset, minuteOffset = 0) {
  return new Date(base.getTime() + dayOffset * DAY + minuteOffset * 60_000).toISOString();
}

function cardState({ due, lastReview, stability = 10, difficulty = 5, reps = 4, lapses = 0, phase = 'review' }) {
  return {
    due,
    stability,
    difficulty,
    scheduledDays: 7,
    reps,
    lapses,
    phase,
    lastReview,
  };
}

function pickByDomain(content, domain, count) {
  const seen = new Set();
  const cards = [];
  for (const card of content.ALL_CARDS) {
    if (card.domain !== domain || seen.has(card.itemId)) continue;
    seen.add(card.itemId);
    cards.push(card);
    if (cards.length >= count) break;
  }
  return cards;
}

function addCard(state, card, values) {
  state.cards[card.key] = cardState(values);
  state.cardMeta[card.key] = {
    itemId: card.itemId,
    domain: card.domain,
    modality: card.modality,
    itemType: card.itemType,
  };
}

function makeAttempt(state, card, index, atIso, correct, source, todayIso) {
  state.attempts.push({
    id: `att-${state.profile.id}-${index}`,
    at: atIso,
    date: todayIso(new Date(atIso)),
    cardKey: card.key,
    itemId: card.itemId,
    domain: card.domain,
    itemType: card.itemType,
    modality: card.modality,
    correct,
    ms: 2600 + (index % 9) * 420,
    source,
    optionId: correct ? card.correct : (card.options.find((option) => option.id !== card.correct)?.id ?? null),
    firstExposure: false,
  });
}

function makeMock(state, form, { krRatio, lsRatio, submittedAt, dayOffset, scoreMock, base, id }) {
  const answers = [];
  const fill = (cards, ratio) => {
    cards.forEach((card, index) => {
      const correct = index < Math.round(cards.length * ratio);
      answers.push({
        cardKey: card.key,
        optionId: correct ? card.correct : (card.options.find((option) => option.id !== card.correct)?.id ?? card.correct),
        flagged: false,
        ms: 30_000,
      });
    });
  };
  fill(form.sections.vocabulary, krRatio);
  fill(form.sections.grammar_reading, krRatio);
  fill(form.sections.listening, lsRatio);
  const minutes = { vocabulary: 22, grammar_reading: 51, listening: 33 };
  const report = scoreMock(form, answers, minutes, submittedAt);
  state.mocks.push({
    id: id ?? `mock-${state.profile.id}-${dayOffset}`,
    formId: form.id,
    startedAt: at(base, dayOffset, -110),
    submittedAt,
    answers,
    report,
    sectionMinutes: minutes,
  });
}

function seedAttempts(state, content, { base, todayIso, plan, accuracy, source = 'session' }) {
  let index = state.attempts.length;
  for (const entry of plan) {
    const cards = pickByDomain(content, entry.domain, entry.count);
    cards.forEach((card, cardIndex) => {
      const atIso = at(base, -((cardIndex % 12) + 1), 5 + (cardIndex % 40));
      // Distribute correctness across the actual set, not index/100.
      const correct = (cardIndex + 0.5) / cards.length <= entry.accuracy;
      makeAttempt(state, card, index, atIso, correct, source, todayIso);
      index += 1;
    });
  }
}

function seedCards(state, content, { base, perDomain, dueSoon = true, leech = false }) {
  for (const [domain, count] of Object.entries(perDomain)) {
    const cards = pickByDomain(content, domain, count);
    cards.forEach((card, index) => {
      const isLeech = leech && index < 5;
      addCard(state, card, {
        due: leech && index < 5 ? at(base, 0, -30) : dueSoon && index % 4 === 0 ? at(base, 0, 10) : at(base, 2 + (index % 5)),
        lastReview: at(base, -(2 + (index % 6))),
        stability: isLeech ? 0.6 : 4 + (index % 20),
        difficulty: 4 + (index % 4),
        reps: isLeech ? 12 : 3 + (index % 6),
        lapses: isLeech ? 5 : index % 3,
        phase: isLeech ? 'relearning' : 'review',
      });
    });
  }
}

function history(state, derive, today) {
  const readiness = derive.readinessFor(state, today);
  if (!readiness) return;
  const point = readiness.history.at(-1);
  if (!point) return;
  const { addDays } = cached.date;
  state.readinessHistory = [
    { date: addDays(today, -21), total: Math.max(0, point.total - 18), kr: Math.max(0, point.kr - 12), listening: Math.max(0, point.listening - 6) },
    { date: addDays(today, -14), total: Math.max(0, point.total - 10), kr: Math.max(0, point.kr - 7), listening: Math.max(0, point.listening - 3) },
    { date: addDays(today, -7), total: Math.max(0, point.total - 4), kr: Math.max(0, point.kr - 3), listening: Math.max(0, point.listening - 1) },
    point,
  ];
}

function baseState({ persistence, today, name, goalOffsetDays = 365, examDate = '2027-12-05' }) {
  const { toISODate } = cached.date;
  const state = persistence.createInitialState();
  state.profile = {
    id: `scenario-${name}`,
    createdAt: `${toISODate(new Date(new Date(`${today}T09:00:00`).getTime() - goalOffsetDays * DAY))}T09:00:00.000Z`,
    displayName: null,
    onboardingComplete: true,
    betaAcknowledged: true,
  };
  state.goal = {
    id: `goal-${name}`,
    createdAt: state.profile.createdAt,
    version: 1,
    examDate,
    examLabel: examDate === '2027-12-05' ? 'Desember 2027' : 'Tanggal target',
    examIsEstimate: true,
    startingPoint: 'zero',
    targetScore: 90,
    hoursPerDay: 2.25,
    daysPerWeek: 6,
    restDays: [0],
    track: 'sustainable',
    disclaimerAccepted: true,
  };
  state.lastActivityDate = today;
  state.studyDates = Array.from({ length: 12 }, (_, index) => toISODate(new Date(new Date(`${today}T09:00:00`).getTime() - index * DAY)));
  return state;
}

async function build(name, today) {
  const { content, mock, derive, persistence, date } = await load();
  const base = new Date(`${today}T09:00:00`);
  const todayIso = date.todayISO;
  const commonAttempts = [
    { domain: 'kana', count: 100, accuracy: 0.98 },
    { domain: 'vocab', count: 60, accuracy: 0.82 },
    { domain: 'kanji', count: 24, accuracy: 0.78 },
    { domain: 'grammar', count: 14, accuracy: 0.8 },
    { domain: 'reading', count: 5, accuracy: 0.75 },
    { domain: 'listening', count: 10, accuracy: 0.7 },
  ];

  if (name === 'new') {
    const state = baseState({ persistence, today, name: 'new', goalOffsetDays: 0 });
    state.plan = derive.planFor(state, today);
    return state;
  }

  if (name === 'recovery') {
    const state = baseState({ persistence, today, name: 'recovery', goalOffsetDays: 120 });
    state.lastActivityDate = date.addDays(today, -4);
    state.studyDates = Array.from({ length: 5 }, (_, i) => date.addDays(today, -(i + 4)));
    seedCards(state, content, { base, perDomain: { kana: 24, vocab: 12, grammar: 3, kanji: 4 }, dueSoon: true });
    seedAttempts(state, content, {
      base,
      todayIso,
      accuracy: 0.68,
      plan: [
        { domain: 'kana', count: 24, accuracy: 0.7 },
        { domain: 'vocab', count: 12, accuracy: 0.65 },
        { domain: 'grammar', count: 3, accuracy: 0.6 },
        { domain: 'kanji', count: 4, accuracy: 0.7 },
      ],
    });
    state.plan = derive.planFor(state, today);
    return state;
  }

  if (name === 'leech') {
    const state = baseState({ persistence, today, name: 'leech', goalOffsetDays: 200 });
    seedCards(state, content, { base, perDomain: { kana: 30, vocab: 20, grammar: 6, kanji: 8 }, dueSoon: true, leech: true });
    seedAttempts(state, content, {
      base,
      todayIso,
      accuracy: 0.62,
      plan: [
        { domain: 'kana', count: 30, accuracy: 0.85 },
        { domain: 'vocab', count: 20, accuracy: 0.5 },
        { domain: 'grammar', count: 6, accuracy: 0.55 },
        { domain: 'kanji', count: 8, accuracy: 0.55 },
        { domain: 'listening', count: 8, accuracy: 0.6 },
      ],
    });
    for (const [index, key] of Object.keys(state.cards).slice(0, 6).entries()) {
      const card = content.CARD_BY_KEY.get(key);
      if (!card) continue;
      state.errors.push({
        id: `err-leech-${index}`,
        at: at(base, -3, index),
        itemId: card.itemId,
        cardKey: card.key,
        domain: card.domain,
        itemType: card.itemType,
        cause: index % 2 === 0 ? 'unknown_word' : 'memory',
        status: 'open',
        wrongOptionId: null,
        correctOptionId: card.correct,
        groupKey: `memory:${card.tags[0] ?? card.itemType}`,
        correctAfter: [],
        resolvedAt: null,
        question: card.prompt.question,
        answerText: 'salah',
        correctText: card.options.find((option) => option.id === card.correct)?.text ?? '',
      });
    }
    state.plan = derive.planFor(state, today);
    return state;
  }

  if (name === 'exam-week') {
    const examDate = date.addDays(today, 9);
    const state = baseState({ persistence, today, name: 'exam-week', goalOffsetDays: 354, examDate });
    seedCards(state, content, { base, perDomain: { kana: 60, vocab: 40, grammar: 10, kanji: 16 } });
    seedAttempts(state, content, { base, todayIso, accuracy: 0.86, plan: commonAttempts });
    const formA = content.MOCK_FORMS[0];
    const formB = content.MOCK_FORMS[1];
    makeMock(state, formA, { krRatio: 0.88, lsRatio: 0.9, submittedAt: at(base, -5), dayOffset: -5, scoreMock: mock.scoreMock, base, id: 'scenario-exam-mock-a' });
    makeMock(state, formB, { krRatio: 0.86, lsRatio: 0.88, submittedAt: at(base, -2), dayOffset: -2, scoreMock: mock.scoreMock, base, id: 'scenario-exam-mock-b' });
    history(state, derive, today);
    state.plan = derive.planFor(state, today);
    return state;
  }

  // two-mocks + listening-gate share the same rich practice history
  const gate = name === 'listening-gate';
  const state = baseState({ persistence, today, name, goalOffsetDays: 300 });
  seedCards(state, content, { base, perDomain: { kana: 50, vocab: 36, grammar: 9, kanji: 14 } });
  seedAttempts(state, content, {
    base,
    todayIso,
    accuracy: gate ? 0.84 : 0.82,
    plan: gate
      ? commonAttempts.map((entry) => (entry.domain === 'listening' ? { ...entry, accuracy: 0.3 } : entry))
      : commonAttempts,
  });
  const formA = content.MOCK_FORMS[0];
  const formB = content.MOCK_FORMS[1];
  makeMock(state, formA, {
    krRatio: gate ? 0.9 : 0.8,
    lsRatio: gate ? 0.15 : 0.78,
    submittedAt: at(base, -10),
    dayOffset: -10,
    scoreMock: mock.scoreMock,
    base,
    id: `scenario-${name}-mock-a`,
  });
  makeMock(state, formB, {
    krRatio: gate ? 0.88 : 0.82,
    lsRatio: gate ? 0.18 : 0.8,
    submittedAt: at(base, -4),
    dayOffset: -4,
    scoreMock: mock.scoreMock,
    base,
    id: `scenario-${name}-mock-b`,
  });
  history(state, derive, today);
  state.plan = derive.planFor(state, today);
  return state;
}

export const SCENARIOS = [
  { id: 'new', label: 'Pengguna baru', description: 'Onboarded, belum ada attempt/mock. Readiness harus “belum cukup data”.' },
  { id: 'recovery', label: 'Bolos 4 hari', description: 'Review tertinggal, item baru dikurangi, banner recovery.' },
  { id: 'listening-gate', label: 'Gate listening gagal', description: 'K+R kuat, listening di bawah 19, 2 mock. Status tidak boleh “Aman”.' },
  { id: 'two-mocks', label: 'Dua mock kuat', description: 'Coverage tinggi, 2 mock, gate aman. Kandidat “Aman”.' },
  { id: 'leech', label: 'Leech menumpuk', description: 'Enam kartu lapses ≥4, buku kesalahan terisi.' },
  { id: 'exam-week', label: 'Minggu ujian', description: 'Ujian 9 hari lagi, 2 mock, fase taper, cap item baru 0.' },
];

export async function buildScenario(name, { today = null } = {}) {
  const scenario = SCENARIOS.find((entry) => entry.id === name);
  if (!scenario) throw new Error(`scenario tidak dikenal: ${name}`);
  const date = await load();
  const day = today ?? date.date.todayISO();
  const state = await build(name, day);
  return { scenario, state, today: day };
}

export function writeScenarioFile({ scenario, state, today }, outDir) {
  const dir = path.resolve(outDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${scenario.id}.json`);
  const payload = {
    app: 'n4-pilot',
    scenario: scenario.id,
    exportedAt: new Date().toISOString(),
    today,
    state,
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}

export { DAY };

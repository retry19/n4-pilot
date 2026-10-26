/**
 * Domain types for N4 Pilot.
 *
 * Vocabulary used throughout:
 *  - "card"   : a schedulable prompt (item × modality), the unit FSRS reviews.
 *  - "item"   : canonical content (kana character, word, kanji, grammar point…).
 *  - "step"   : one screen inside a session.
 *  - "attempt": one answered question; the evidence readiness is computed from.
 *
 * All timestamps are ISO strings. Calendar days are `YYYY-MM-DD` (local day).
 */

// ---------------------------------------------------------------------------
// Exam model (JLPT N4, format 2026)
// ---------------------------------------------------------------------------

/** Scoring sections: Knowledge+Reading (120) and Listening (60). */
export type ScoringSection = 'kr' | 'listening';

export const EXAM = {
  totalMax: 180,
  krMax: 120,
  listeningMax: 60,
  passTotal: 90,
  krGate: 38,
  listeningGate: 19,
  vocabMinutes: 25,
  grammarReadingMinutes: 55,
  listeningMinutes: 35,
} as const;

export type Domain = 'kana' | 'vocab' | 'kanji' | 'grammar' | 'reading' | 'listening';

export const DOMAIN_LABEL: Record<Domain, string> = {
  kana: 'Kana',
  vocab: 'Kosakata',
  kanji: 'Kanji',
  grammar: 'Grammar',
  reading: 'Membaca',
  listening: 'Menyimak',
};

/** JLPT N4 item types only. No "long reading", no "general outline". */
export type ItemType =
  | 'kana_recognition'
  | 'kanji_reading'
  | 'orthography'
  | 'context_expression'
  | 'paraphrase'
  | 'usage'
  | 'grammar_form'
  | 'sentence_ordering'
  | 'text_grammar'
  | 'reading_short'
  | 'reading_mid'
  | 'info_retrieval'
  | 'task_based'
  | 'key_points'
  | 'verbal_expressions'
  | 'quick_response';

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  kana_recognition: 'Baca kana',
  kanji_reading: 'Baca kanji',
  orthography: 'Ejaan',
  context_expression: 'Konteks',
  paraphrase: 'Parafrase',
  usage: 'Penggunaan',
  grammar_form: 'Bentuk grammar',
  sentence_ordering: 'Susun kalimat',
  text_grammar: 'Kohesi teks',
  reading_short: 'Bacaan pendek',
  reading_mid: 'Bacaan sedang',
  info_retrieval: 'Cari informasi',
  task_based: 'Tugas',
  key_points: 'Poin kunci',
  verbal_expressions: 'Ungkapan',
  quick_response: 'Respons cepat',
};

export type Modality = 'recognition' | 'recall' | 'listening' | 'production';

/** Card scheduling state (FSRS). */
export type SchedulerPhase = 'new' | 'learning' | 'review' | 'relearning';

export type Rating = 1 | 2 | 3 | 4; // Again | Hard | Good | Easy

export const RATING_LABEL: Record<Rating, string> = {
  1: 'Lupa total',
  2: 'Susah',
  3: 'Ingat',
  4: 'Langsung ingat',
};

export interface FsrsState {
  due: string;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  phase: SchedulerPhase;
  lastReview: string | null;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export type Level = 'n5' | 'n4';

/** `{漢字|かんじ}` inline ruby syntax used across content. */
export type RubyText = string;

export interface KanaItem {
  id: string;
  kana: string;
  romaji: string;
  script: 'hiragana' | 'katakana';
  /** Row in the gojūon table, e.g. "a", "ka", "ya". */
  row: string;
  group: 'base' | 'dakuten' | 'yoon';
  audio: string;
  mnemonic: string;
  confusableWith?: string[];
}

export interface WordExample {
  ja: RubyText;
  reading: string;
  id: string;
}

export interface VocabItem {
  id: string;
  word: string;
  reading: string;
  romaji: string;
  meaning: string;
  pos: 'nomina' | 'verba' | 'i-adj' | 'na-adj' | 'adverbia' | 'partikel' | 'ungkapan';
  level: Level;
  audio: string;
  example: WordExample;
  kanjiIds: string[];
  tags: string[];
  /** 1 = most frequent / most exam-critical. */
  frequency: 1 | 2 | 3;
}

export interface KanjiWord {
  word: string;
  reading: string;
  meaning: string;
}

export interface KanjiItem {
  id: string;
  kanji: string;
  meaning: string;
  on: string[];
  kun: string[];
  radical: string;
  strokes: number;
  level: Level;
  words: KanjiWord[];
  mnemonic: string;
  mistake: string;
  vocabId?: string;
}

export interface GrammarExample {
  ja: RubyText;
  reading: string;
  id: string;
}

export interface DrillOption {
  id: string;
  text: string;
}

export interface GrammarDrill {
  id: string;
  kind: 'cloze' | 'ordering';
  prompt: string;
  /** For ordering drills: the shuffled fragments the learner arranges. */
  fragments?: string[];
  options: DrillOption[];
  correct: string;
  explanation: string;
  itemType: ItemType;
}

export interface GrammarItem {
  id: string;
  pattern: string;
  meaning: string;
  formation: string;
  nuance: string;
  level: Level;
  examples: GrammarExample[];
  contrast: { pattern: string; note: string };
  commonError: string;
  drills: GrammarDrill[];
  tags: string[];
}

export interface ReadingQuestion {
  id: string;
  prompt: string;
  options: DrillOption[];
  correct: string;
  explanation: string;
  evidence: string;
}

export interface ReadingPassage {
  id: string;
  type: 'short' | 'mid' | 'info';
  title: string;
  body: RubyText;
  /** Full kana reading, used when furigana is set to "all". */
  reading: string;
  level: Level;
  timerSeconds: number;
  questions: ReadingQuestion[];
  audio?: string;
}

export interface ListeningOption {
  id: string;
  text: string;
}

export interface ListeningItem {
  id: string;
  type: 'task_based' | 'key_points' | 'verbal_expressions' | 'quick_response';
  instruction: string;
  /** Spoken by TTS; also the transcript shown after answering. */
  script: string;
  scriptReading: string;
  question: string;
  options: ListeningOption[];
  correct: string;
  explanation: string;
  seconds: number;
  context: string;
  tags: string[];
}

/**
 * A ready-to-render question. The session player, drills and mock runner all
 * consume this shape so feedback stays consistent everywhere.
 */
export interface StudyCard {
  key: string;
  itemId: string;
  domain: Domain;
  modality: Modality;
  itemType: ItemType;
  section: ScoringSection;
  prompt: CardPrompt;
  options: DrillOption[];
  correct: string;
  explanation: string;
  contrast?: string;
  evidence?: string;
  /** How much this item type is worth in the exam (0–1). */
  examWeight: number;
  difficulty: 1 | 2 | 3;
  tags: string[];
  audio?: string;
  timeTargetSeconds: number;
}

export interface CardPrompt {
  /** Large Japanese text (word, kana, pattern, sentence fragment). */
  ja?: RubyText;
  reading?: string;
  /** Latin text (romaji, Indonesian prompt). */
  text?: string;
  question: string;
  /** Shown above the question, e.g. a passage or context. */
  context?: string;
  contextReading?: string;
  /** True when the prompt itself is audio-first. */
  audioFirst?: boolean;
}

export interface Concept {
  key: string;
  itemId: string;
  domain: Domain;
  title: string;
  heading: RubyText;
  reading?: string;
  audio?: string;
  /** "What it means" in Indonesian. */
  meaning: string;
  /** How it is formed / used. */
  detail?: string;
  examples: { ja: RubyText; reading: string; id: string }[];
  note?: string;
  contrast?: string;
  /** Second step: a check question. */
  check: StudyCard;
}

// ---------------------------------------------------------------------------
// Mock exam
// ---------------------------------------------------------------------------

export type MockSectionId = 'vocabulary' | 'grammar_reading' | 'listening';

export const MOCK_SECTIONS: { id: MockSectionId; label: string; minutes: number; scoring: ScoringSection }[] = [
  { id: 'vocabulary', label: 'Bahasa & Kosakata', minutes: 25, scoring: 'kr' },
  { id: 'grammar_reading', label: 'Grammar & Membaca', minutes: 55, scoring: 'kr' },
  { id: 'listening', label: 'Menyimak', minutes: 35, scoring: 'listening' },
];

export interface MockForm {
  id: string;
  label: string;
  variant: 'A' | 'B';
  sections: Record<MockSectionId, StudyCard[]>;
  note: string;
}

export interface MockAnswer {
  cardKey: string;
  optionId: string;
  flagged: boolean;
  ms: number;
}

export interface MockSectionResult {
  section: MockSectionId;
  correct: number;
  total: number;
  raw: number;
  estimate: number;
  low: number;
  high: number;
  minutesUsed: number;
}

export interface MockReport {
  formId: string;
  submittedAt: string;
  /** Combined Knowledge + Reading result (sections 1 + 2). */
  kr: MockSectionResult;
  listening: MockSectionResult;
  /** Per-section breakdown for the report screen. */
  sections: MockSectionResult[];
  total: { estimate: number; low: number; high: number };
  gates: { kr: boolean; listening: boolean; total: boolean };
  status: 'above' | 'gate_failed' | 'weak';
  wins: string[];
  leaks: string[];
  itemTypes: { itemType: ItemType; correct: number; total: number }[];
  evidence: number;
}

// ---------------------------------------------------------------------------
// Goal, plan, session
// ---------------------------------------------------------------------------

export type StartingPoint = 'zero' | 'kana' | 'some_n5' | 'mock_score';
export type TargetScore = 90 | 110 | 130;

export interface Goal {
  id: string;
  createdAt: string;
  version: number;
  examDate: string;
  examLabel: string;
  examIsEstimate: boolean;
  startingPoint: StartingPoint;
  targetScore: TargetScore;
  hoursPerDay: number;
  daysPerWeek: number;
  /** 0 = Sunday … 6 = Saturday. Rest days are honoured by the planner. */
  restDays: number[];
  track: 'sustainable' | 'sprint' | 'intensive';
  disclaimerAccepted: boolean;
}

export type PhaseId =
  | 'foundations'
  | 'n5_bridge'
  | 'n4_core_a'
  | 'n4_core_b'
  | 'integration'
  | 'exam_sim'
  | 'taper';

export const PHASE_ORDER: PhaseId[] = [
  'foundations',
  'n5_bridge',
  'n4_core_a',
  'n4_core_b',
  'integration',
  'exam_sim',
  'taper',
];

export const PHASE_META: Record<
  PhaseId,
  { label: string; short: string; outcome: string; gate: string; reviewRatio: number; newRatio: number; applyRatio: number; listeningRatio: number; proveRatio: number; newCap: number; reviewCap: number }
> = {
  foundations: {
    label: 'Fondasi',
    short: 'Fondasi',
    outcome: 'Kana otomatis, bunyi, 150 kata pertama',
    gate: '95% akurasi kana',
    reviewRatio: 0.3,
    newRatio: 0.35,
    applyRatio: 0.15,
    listeningRatio: 0.2,
    proveRatio: 0,
    newCap: 12,
    reviewCap: 60,
  },
  n5_bridge: {
    label: 'Jembatan N5',
    short: 'N5',
    outcome: '500 kata, 100 kanji, 40 grammar dasar',
    gate: 'Mini-section ≥60%, retensi ≥80%',
    reviewRatio: 0.3,
    newRatio: 0.3,
    applyRatio: 0.2,
    listeningRatio: 0.2,
    proveRatio: 0,
    newCap: 20,
    reviewCap: 100,
  },
  n4_core_a: {
    label: 'N4 Inti A',
    short: 'N4 A',
    outcome: '900 kata, 180 kanji, 70 grammar',
    gate: 'Drill section stabil',
    reviewRatio: 0.3,
    newRatio: 0.25,
    applyRatio: 0.25,
    listeningRatio: 0.2,
    proveRatio: 0,
    newCap: 25,
    reviewCap: 120,
  },
  n4_core_b: {
    label: 'N4 Inti B',
    short: 'N4 B',
    outcome: 'Semua item type N4, coverage ≥90%',
    gate: 'Listening ≥ gate',
    reviewRatio: 0.3,
    newRatio: 0.2,
    applyRatio: 0.3,
    listeningRatio: 0.2,
    proveRatio: 0,
    newCap: 25,
    reviewCap: 140,
  },
  integration: {
    label: 'Integrasi',
    short: 'Integrasi',
    outcome: 'Reading/listening timed, mock pertama',
    gate: 'Tidak ada section di bawah gate',
    reviewRatio: 0.25,
    newRatio: 0.1,
    applyRatio: 0.35,
    listeningRatio: 0.3,
    proveRatio: 0,
    newCap: 15,
    reviewCap: 160,
  },
  exam_sim: {
    label: 'Simulasi ujian',
    short: 'Simulasi',
    outcome: 'Mock penuh, pacing, perbaikan error',
    gate: 'Stabil di 2 mock berturut-turut',
    reviewRatio: 0.3,
    newRatio: 0,
    applyRatio: 0.4,
    listeningRatio: 0.3,
    proveRatio: 0,
    newCap: 0,
    reviewCap: 120,
  },
  taper: {
    label: 'Minggu tenang',
    short: 'Taper',
    outcome: 'Review high-yield, tidur, logistik',
    gate: 'Tidak ada materi baru',
    reviewRatio: 0.4,
    newRatio: 0,
    applyRatio: 0.2,
    listeningRatio: 0.2,
    proveRatio: 0.2,
    newCap: 0,
    reviewCap: 80,
  },
};

export interface PlanPhase {
  id: PhaseId;
  label: string;
  startDate: string;
  endDate: string;
  hours: number;
  isCurrent: boolean;
  isComplete: boolean;
}

export interface PlannedMock {
  id: string;
  formId: string;
  label: string;
  date: string;
  phase: PhaseId;
}

export interface PlanSnapshot {
  createdAt: string;
  goalVersion: number;
  startDate: string;
  examDate: string;
  phases: PlanPhase[];
  currentPhase: PhaseId;
  scheduledPhase: PhaseId;
  daysToExam: number;
  phasePinned: boolean;
  pinnedReason: string | null;
  weeklyHours: number;
  dailyBudgetMinutes: number;
  newItemCap: number;
  reviewCap: number;
  listeningMinutes: number;
  recovery: boolean;
  recoveryDays: number;
  nextMock: PlannedMock | null;
  mockDates: PlannedMock[];
  weeksToExam: number;
  onTrack: boolean;
  requiredHoursPerDay: number;
  projectedFinish: string;
  narrative: string[];
}

export type SessionMode = 'quick10' | 'core45' | 'deep90' | 'sprint150' | 'recovery' | 'fixit' | 'drill';

export const SESSION_MODES: Record<SessionMode, { minutes: number; label: string; blurb: string }> = {
  quick10: { minutes: 10, label: 'Quick 10', blurb: '10 menit, tetap berarti' },
  core45: { minutes: 45, label: 'Sesi inti', blurb: '45 menit, satu putaran penuh' },
  deep90: { minutes: 90, label: 'Sesi dalam', blurb: '90 menit, untuk hari lapang' },
  sprint150: { minutes: 150, label: 'Sprint', blurb: '150 menit + section drill' },
  recovery: { minutes: 10, label: 'Mulai lagi', blurb: '10 menit untuk kembali' },
  fixit: { minutes: 10, label: 'Fix-it', blurb: '10 menit memperbaiki pola error' },
  drill: { minutes: 10, label: 'Drill seksi', blurb: '10 soal format ujian, timed' },
};

export type BlockId = 'recall' | 'review' | 'learn' | 'apply' | 'listening' | 'prove' | 'recap';

export interface SessionStep {
  id: string;
  block: BlockId;
  kind: 'card' | 'concept' | 'reading' | 'listening' | 'recap';
  cardKey?: string;
  conceptKey?: string;
  itemId?: string;
  /** Derived estimate so the UI can show time remaining honestly. */
  estimateSeconds: number;
}

export interface SessionPlan {
  id: string;
  createdAt: string;
  date: string;
  mode: SessionMode;
  goalVersion: number;
  steps: SessionStep[];
  blockCounts: Record<string, number>;
  estimatedMinutes: number;
  reason: string;
  recovery: boolean;
}

export interface SessionRecord {
  id: string;
  plan: SessionPlan;
  startedAt: string;
  endedAt: string | null;
  /** Index of the step currently awaiting an answer. */
  cursor: number;
  answers: StepAnswer[];
  completed: boolean;
  correct: number;
  total: number;
}

export interface StepAnswer {
  stepId: string;
  cardKey: string;
  optionId: string | null;
  correct: boolean;
  ms: number;
  at: string;
  selfRated: boolean;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type AttemptSource = 'session' | 'review' | 'drill' | 'mock' | 'fixit';

export interface Attempt {
  id: string;
  at: string;
  date: string;
  cardKey: string;
  itemId: string;
  domain: Domain;
  itemType: ItemType;
  modality: Modality;
  correct: boolean;
  ms: number;
  source: AttemptSource;
  optionId: string | null;
  /** True when this was the first time the learner saw the item. */
  firstExposure: boolean;
}

export interface ReviewLog {
  id: string;
  at: string;
  cardKey: string;
  rating: Rating;
  correct: boolean;
  ms: number;
  source: AttemptSource;
  scheduledDays: number;
}

export type ErrorCause =
  | 'unknown_word'
  | 'kanji_misread'
  | 'kana_misread'
  | 'grammar_pattern'
  | 'nuance'
  | 'parsing'
  | 'listening_decoding'
  | 'memory'
  | 'time'
  | 'format'
  | 'distractor'
  | 'careless';

export const ERROR_CAUSE: Record<ErrorCause, { label: string; hint: string; remediation: string }> = {
  unknown_word: {
    label: 'Kata belum dikenal',
    hint: 'Kamu belum pernah atau jarang melihat kata ini.',
    remediation: 'Tambahkan kata + konteks ke review, lalu baca ulang kalimatnya.',
  },
  kanji_misread: {
    label: 'Salah baca kanji',
    hint: 'Artinya mungkin tahu, tetapi reading-nya tertukar.',
    remediation: 'Latih kanji di dalam kata + audio, bukan reading terisolasi.',
  },
  kana_misread: {
    label: 'Salah baca kana',
    hint: 'Bentuk kana mirip (shi/tsu, so/n, ru/ro).',
    remediation: 'Drill pasangan yang tertukar; baca dengan suara.',
  },
  grammar_pattern: {
    label: 'Pola grammar',
    hint: 'Bentuk atau sambungan pola belum melekat.',
    remediation: 'Lihat worked example, lalu ulangi 3 soal berpola sama.',
  },
  nuance: {
    label: 'Nuansa',
    hint: 'Dua opsi terasa mirip; kontrasnya belum jelas.',
    remediation: 'Bandingkan pasangan pola; fokus pada perbedaan pemakaian.',
  },
  parsing: {
    label: 'Parsing kalimat',
    hint: 'Potongan kalimat belum tersusun benar.',
    remediation: 'Petakan partikel dulu, baru urutkan frasa.',
  },
  listening_decoding: {
    label: 'Dekode audio',
    hint: 'Katanya mungkin dikenal, tetapi bunyinya belum tertangkap.',
    remediation: 'Dictation 1 kalimat + shadowing; ulangi tanpa transkrip.',
  },
  memory: {
    label: 'Lupa (dulu bisa)',
    hint: 'Pernah benar, sekarang lupa. Ini normal, bukan kegagalan.',
    remediation: 'Review terjadwal; tambah satu contoh baru agar maknanya mengikat.',
  },
  time: {
    label: 'Waktu',
    hint: 'Jawaban benar tetapi terlalu lambat untuk ujian.',
    remediation: 'Timed drill pendek; target 45 detik per item kosakata.',
  },
  format: {
    label: 'Format soal',
    hint: 'Instruksi atau tipe opsi terbaca salah.',
    remediation: 'Baca ulang instruksi; latih format spesifik ini.',
  },
  distractor: {
    label: 'Jebakan opsi',
    hint: 'Opsi mirip menarik perhatian.',
    remediation: 'Baca semua opsi dulu; tandai kata kunci pembeda.',
  },
  careless: {
    label: 'Kurang teliti',
    hint: 'Satu ketukan/typo, bukan gap pengetahuan.',
    remediation: 'Perlambat 2 detik sebelum menekan jawaban.',
  },
};

export interface ErrorEvent {
  id: string;
  at: string;
  itemId: string;
  cardKey: string;
  domain: Domain;
  itemType: ItemType;
  cause: ErrorCause;
  status: 'open' | 'in_progress' | 'resolved';
  wrongOptionId: string | null;
  correctOptionId: string;
  /** Group key: cause + skill, so "に/で" groups together. */
  groupKey: string;
  /** Two correct answers in different contexts resolve an error. */
  correctAfter: string[];
  resolvedAt: string | null;
  question: string;
  answerText: string;
  correctText: string;
}

// ---------------------------------------------------------------------------
// Readiness
// ---------------------------------------------------------------------------

export type EvidenceLevel = 'insufficient' | 'initial' | 'estimate' | 'stable' | 'strong';
export type ReadinessStatus = 'insufficient' | 'at_risk' | 'on_track' | 'safe';

export interface DomainReadiness {
  domain: Domain;
  mastery: number; // 0–100
  attempts: number;
  correct: number;
  coverage: number; // 0–1 share of pool seen
  retention: number; // 0–1 predicted recall on exam day
  weight: number;
}

export interface ReadinessFactor {
  id: string;
  label: string;
  detail: string;
  contribution: number; // 0–1 relative
  domain: Domain;
  action: string;
}

export interface Readiness {
  computedAt: string;
  evidence: EvidenceLevel;
  status: ReadinessStatus;
  attempts: number;
  mocks: number;
  coverage: number;
  kr: { estimate: number; low: number; high: number };
  listening: { estimate: number; low: number; high: number };
  total: { estimate: number; low: number; high: number };
  probability: { value: number; low: number; high: number; confidence: 'low' | 'medium' | 'high' } | null;
  gates: { kr: boolean; listening: boolean; total: boolean };
  domains: DomainReadiness[];
  factors: ReadinessFactor[];
  canShowProbability: boolean;
  reasonNoProbability: string | null;
  nextAction: { title: string; detail: string; route: string };
  history: ReadinessPoint[];
  lastMockAt: string | null;
}

export interface ReadinessPoint {
  date: string;
  total: number;
  kr: number;
  listening: number;
}

export interface MockAttempt {
  id: string;
  formId: string;
  startedAt: string;
  submittedAt: string;
  answers: MockAnswer[];
  report: MockReport;
  sectionMinutes: Record<MockSectionId, number>;
}

export interface ActiveMockAnswer {
  optionId: string;
  flagged: boolean;
}

/**
 * Mock state lives in the store so a refresh or crash keeps the timer honest.
 * The timer is derived from `sectionStartedAt`, never from a decrementing value.
 */
export interface ActiveMock {
  formId: string;
  startedAt: string;
  sectionIndex: number;
  sectionStartedAt: string;
  /** Index of the question shown in the runner (persists across reloads). */
  currentCardIndex: number;
  answers: Record<string, ActiveMockAnswer>;
  minutesUsed: Record<MockSectionId, number>;
  phase: 'running' | 'break';
  breakStartedAt: string | null;
}

// ---------------------------------------------------------------------------
// User state (persisted)
// ---------------------------------------------------------------------------

export type FuriganaMode = 'all' | 'tap' | 'off';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  furigana: FuriganaMode;
  romaji: boolean;
  audioAutoplay: boolean;
  reduceMotion: boolean;
  theme: ThemeMode;
  sound: boolean;
  haptics: boolean;
  textScale: 1 | 1.15 | 1.3;
}

export interface Profile {
  id: string;
  createdAt: string;
  displayName: string | null;
  onboardingComplete: boolean;
  betaAcknowledged: boolean;
}

export interface AppState {
  schemaVersion: number;
  profile: Profile;
  settings: Settings;
  goal: Goal | null;
  plan: PlanSnapshot | null;
  cards: Record<string, FsrsState>;
  cardMeta: Record<string, { itemId: string; domain: Domain; modality: Modality; itemType: ItemType }>;
  attempts: Attempt[];
  reviewLogs: ReviewLog[];
  errors: ErrorEvent[];
  sessions: SessionRecord[];
  activeSession: SessionRecord | null;
  mocks: MockAttempt[];
  activeMock: ActiveMock | null;
  readinessHistory: ReadinessPoint[];
  lastActivityDate: string | null;
  studyDates: string[];
  quick10UsedDates: string[];
  dismissed: string[];
}

export interface PlanInput {
  goal: Goal;
  today: string;
  cardCount: number;
  dueCount: number;
  overdueCount: number;
  lastActivityDate: string | null;
  kanaAccuracy: number | null;
  kanaAttempts: number;
  vocabAttempts: number;
  accuracy: number | null;
  listeningAccuracy: number | null;
  coverage: number;
  mockCount: number;
}

export interface RealityOption {
  id: 'increase_hours' | 'shift_exam' | 'continue_risky';
  title: string;
  detail: string;
  effect: string;
  recommended: boolean;
  /** Suggested values the UI can apply in one tap. */
  hoursPerDay?: number;
  examDate?: string;
}

export interface RealityCheck {
  weeklyHours: number;
  daysToExam: number;
  weeksToExam: number;
  availableHours: number;
  requiredLower: number;
  requiredTarget: number;
  requiredUpper: number;
  requiredHoursPerDay: number;
  requiredHoursPerDayLower: number;
  verdict: 'comfortable' | 'tight' | 'risky' | 'unrealistic';
  headline: string;
  mathLine: string;
  monthsMin: number;
  monthsMax: number;
  projectedFinish: string;
  exceedsExam: boolean;
  options: RealityOption[];
}

export interface GateCheck {
  phase: PhaseId;
  passed: boolean;
  label: string;
  detail: string;
}

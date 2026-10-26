/**
 * Local-first persistence.
 *
 * The MVP stores one versioned document in localStorage. Reads are synchronous
 * (home renders from cache in <1s), writes are debounced. The shape is validated
 * on load so a half-written or outdated document can never crash the app.
 *
 * Migration path for V1: move the same document into IndexedDB (Dexie) and keep
 * the append-only review log; this adapter is the only file that changes.
 */
import type { AppState, Settings } from '../core/types.ts';

export const STORAGE_KEY = 'n4pilot.state';
export const SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS: Settings = {
  furigana: 'all',
  romaji: true,
  audioAutoplay: false,
  reduceMotion: false,
  theme: 'system',
  sound: true,
  haptics: true,
  textScale: 1,
};

function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function createInitialState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: {
      id: newId('learner'),
      createdAt: new Date().toISOString(),
      displayName: null,
      onboardingComplete: false,
      betaAcknowledged: false,
    },
    settings: { ...DEFAULT_SETTINGS },
    goal: null,
    plan: null,
    cards: {},
    cardMeta: {},
    attempts: [],
    reviewLogs: [],
    errors: [],
    sessions: [],
    activeSession: null,
    mocks: [],
    activeMock: null,
    readinessHistory: [],
    lastActivityDate: null,
    studyDates: [],
    quick10UsedDates: [],
    dismissed: [],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Coerce an unknown parsed document into a safe AppState. */
export function normalizeState(input: unknown): AppState {
  const base = createInitialState();
  if (!isObject(input)) return base;
  const state = input as Partial<AppState>;
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: isObject(state.profile) ? { ...base.profile, ...state.profile } : base.profile,
    settings: isObject(state.settings) ? { ...DEFAULT_SETTINGS, ...state.settings } : base.settings,
    goal: isObject(state.goal) ? (state.goal as AppState['goal']) : null,
    plan: isObject(state.plan) ? (state.plan as AppState['plan']) : null,
    cards: isObject(state.cards) ? (state.cards as AppState['cards']) : {},
    cardMeta: isObject(state.cardMeta) ? (state.cardMeta as AppState['cardMeta']) : {},
    attempts: Array.isArray(state.attempts) ? state.attempts : [],
    reviewLogs: Array.isArray(state.reviewLogs) ? state.reviewLogs : [],
    errors: Array.isArray(state.errors) ? state.errors : [],
    sessions: Array.isArray(state.sessions) ? state.sessions : [],
    activeSession: isObject(state.activeSession) ? (state.activeSession as AppState['activeSession']) : null,
    mocks: Array.isArray(state.mocks) ? state.mocks : [],
    activeMock: isObject(state.activeMock) ? (state.activeMock as AppState['activeMock']) : null,
    readinessHistory: Array.isArray(state.readinessHistory) ? state.readinessHistory : [],
    lastActivityDate: typeof state.lastActivityDate === 'string' ? state.lastActivityDate : null,
    studyDates: Array.isArray(state.studyDates) ? state.studyDates.filter((d): d is string => typeof d === 'string') : [],
    quick10UsedDates: Array.isArray(state.quick10UsedDates) ? state.quick10UsedDates.filter((d): d is string => typeof d === 'string') : [],
    dismissed: Array.isArray(state.dismissed) ? state.dismissed.filter((d): d is string => typeof d === 'string') : [],
  };
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return createInitialState();
  }
}

let pending: ReturnType<typeof setTimeout> | null = null;
let latest: AppState | null = null;

export function persistSoon(state: AppState): void {
  latest = state;
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    if (latest) persistNow(latest);
  }, 250);
}

export function persistNow(state: AppState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Quota exceeded: keep the app usable, surface a console warning for devs.
    console.warn('[n4pilot] gagal menyimpan progres', error);
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'n4-pilot', state }, null, 2);
}

export function importState(json: string): AppState | null {
  try {
    const parsed = JSON.parse(json) as { state?: unknown };
    const candidate = parsed.state ?? parsed;
    const normalized = normalizeState(candidate);
    if (!normalized.profile.onboardingComplete && !normalized.goal) return null;
    return normalized;
  } catch {
    return null;
  }
}

export function clearPersisted(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export const DEFAULT_SETTINGS_EXPORT = DEFAULT_SETTINGS;

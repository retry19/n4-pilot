/**
 * Calendar helpers.
 *
 * The learner lives in a local calendar day, so plan/session logic uses
 * `YYYY-MM-DD` strings interpreted as *local* days at 12:00 (noon avoids DST
 * edges). Timestamps are ISO datetimes for logs.
 */

export const DAY_MS = 86_400_000;

export function nowISO(now: Date = new Date()): string {
  return now.toISOString();
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** Parse a calendar day at local noon. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseISODate(value);
  return !Number.isNaN(date.getTime()) && toISODate(date) === value;
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function addMinutes(timestamp: string, minutes: number): string {
  return new Date(new Date(timestamp).getTime() + minutes * 60_000).toISOString();
}

/** Whole days from `a` to `b` (b − a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / DAY_MS);
}

export function diffWeeks(a: string, b: string): number {
  return diffDays(a, b) / 7;
}

export function weekday(iso: string): number {
  return parseISODate(iso).getDay();
}

/** Monday-based start of week. */
export function startOfWeek(iso: string): string {
  const day = weekday(iso);
  const delta = day === 0 ? -6 : 1 - day;
  return addDays(iso, delta);
}

export function weekDates(iso: string): string[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function isBefore(a: string, b: string): boolean {
  return a < b;
}

export function isBetween(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/** "5 Des 2027" */
export function formatDate(iso: string): string {
  const date = parseISODate(iso);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Minggu, 5 Desember 2027" */
export function formatDateLong(iso: string): string {
  const date = parseISODate(iso);
  return `${DAYS_LONG[date.getDay()]}, ${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Des 2027" */
export function formatMonthYear(iso: string): string {
  const date = parseISODate(iso);
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export function monthName(iso: string): string {
  return MONTHS_LONG[parseISODate(iso).getMonth()]!;
}

export function dayName(iso: string): string {
  return DAYS_LONG[weekday(iso)]!;
}

export function dayShort(iso: string): string {
  return DAYS_SHORT[weekday(iso)]!;
}

/** "Hari ini" / "Besok" / "3 hari lagi" / "2 hari lalu". */
export function relativeDay(date: string, today: string): string {
  const delta = diffDays(today, date);
  if (delta === 0) return 'Hari ini';
  if (delta === 1) return 'Besok';
  if (delta === -1) return 'Kemarin';
  if (delta > 1) return `${delta} hari lagi`;
  return `${Math.abs(delta)} hari lalu`;
}

/** Human duration: "45 menit", "1 jam 30 menit". */
export function formatMinutes(minutes: number): string {
  const rounded = Math.max(1, Math.round(minutes));
  if (rounded < 60) return `${rounded} menit`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours} jam` : `${hours} jam ${rest} menit`;
}

/** Countdown clock: "04:32" / "1:04:32". */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** "13 bulan" (approximate, for exam context only). */
export function monthsUntil(from: string, to: string): number {
  return Math.max(0, Math.round(diffDays(from, to) / 30.44));
}

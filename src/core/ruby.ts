/**
 * Ruby text (`{漢字|かんじ}`) parsing.
 *
 * Content stores furigana inline so a sentence cannot drift from its reading.
 * The renderer turns these segments into <ruby> elements; the furigana setting
 * decides whether readings are always visible, only on tap, or hidden.
 */

export interface RubySegment {
  text: string;
  reading?: string;
}

const RUBY_PATTERN = /\{([^|{}]+)\|([^{}]+)\}/g;

export function parseRuby(input: string): RubySegment[] {
  const segments: RubySegment[] = [];
  let cursor = 0;
  for (const match of input.matchAll(RUBY_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ text: input.slice(cursor, index) });
    segments.push({ text: match[1]!, reading: match[2]! });
    cursor = index + match[0].length;
  }
  if (cursor < input.length) segments.push({ text: input.slice(cursor) });
  return segments;
}

export function stripRuby(input: string): string {
  return input.replace(RUBY_PATTERN, '$1');
}

export function hasRuby(input: string): boolean {
  RUBY_PATTERN.lastIndex = 0;
  return RUBY_PATTERN.test(input);
}

/** Validate a ruby string: balanced braces, non-empty readings, no nesting. */
export function validateRuby(input: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const opens = (input.match(/\{/g) ?? []).length;
  const closes = (input.match(/\}/g) ?? []).length;
  if (opens !== closes) errors.push(`kurung kurawal tidak seimbang (${opens} buka, ${closes} tutup)`);
  const matches = [...input.matchAll(RUBY_PATTERN)];
  if (matches.length !== opens) errors.push('ada blok ruby yang tidak cocok dengan pola {kanji|kana}');
  for (const match of matches) {
    if (!match[2]!.trim()) errors.push('reading kosong');
    if (/[一-龯]/.test(match[2]!)) errors.push(`reading mengandung kanji: ${match[2]}`);
  }
  return { ok: errors.length === 0, errors };
}

/** Replace the first ruby span whose base is part of `word` with a blank. */
export function blankRuby(input: string, word: string): { text: string; replaced: boolean } {
  let replaced = false;
  const text = input.replace(RUBY_PATTERN, (match, base: string) => {
    if (!replaced && (base.startsWith(word.slice(0, 1)) || word.startsWith(base))) {
      replaced = true;
      return '（　）';
    }
    return match;
  });
  if (replaced) return { text, replaced };
  if (input.includes(word)) return { text: input.replace(word, '（　）'), replaced: true };
  return { text: input, replaced: false };
}

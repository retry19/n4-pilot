import { describe, it, expect } from '../testkit.ts';
import { blankRuby, parseRuby, stripRuby, validateRuby } from './ruby.ts';

describe('Ruby text', () => {
  it('splits plain text and ruby spans', () => {
    const segments = parseRuby('{私|わたし}は{学生|がくせい}です。');
    expect(segments.map((segment) => segment.text)).toEqual(['私', 'は', '学生', 'です。']);
    expect(segments[0]!.reading).toBe('わたし');
    expect(segments[1]!.reading).toBeUndefined();
  });

  it('strips readings for explanations and search', () => {
    expect(stripRuby('{会社|かいしゃ}まで{電車|でんしゃ}で行きます。')).toBe('会社まで電車で行きます。');
  });

  it('validates balanced, kana-only rubies', () => {
    expect(validateRuby('{食|た}べる').ok).toBe(true);
    expect(validateRuby('{食|たべる').ok).toBe(false);
    expect(validateRuby('{食|食べる}').ok).toBe(false);
  });

  it('blanks the target word inside a ruby sentence', () => {
    const result = blankRuby('{私|わたし}は{会社員|かいしゃいん}です。', '会社員');
    expect(result.replaced).toBe(true);
    expect(result.text).toBe('{私|わたし}は（　）です。');
  });

  it('blanks an inflected verb stem', () => {
    const result = blankRuby('毎朝、コーヒーを{飲|の}みます。', '飲む');
    expect(result.replaced).toBe(true);
    expect(result.text).toBe('毎朝、コーヒーを（　）みます。');
  });

  it('leaves text untouched when the word is missing', () => {
    const result = blankRuby('これはペンです。', '本');
    expect(result.replaced).toBe(false);
    expect(result.text).toBe('これはペンです。');
  });
});

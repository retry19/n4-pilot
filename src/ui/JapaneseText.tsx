import { useEffect, useState } from 'react';
import { parseRuby, stripRuby } from '../core/ruby.ts';
import type { FuriganaMode } from '../core/types.ts';

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return matches;
}

/**
 * Renders Japanese text with furigana according to the learner's setting.
 * "tap" mode never hides the text — it only asks before revealing readings.
 */
export function JapaneseText({
  text,
  mode = 'all',
  className = '',
  as: Tag = 'span',
}: {
  text: string;
  mode?: FuriganaMode;
  className?: string;
  as?: 'span' | 'p' | 'div';
}) {
  const [revealed, setRevealed] = useState(mode !== 'tap');
  useEffect(() => {
    setRevealed(mode !== 'tap');
  }, [mode, text]);

  if (mode === 'off') {
    return (
      <Tag className={`jp ${className}`} lang="ja">
        {stripRuby(text)}
      </Tag>
    );
  }

  if (mode === 'tap' && !revealed) {
    return (
      <Tag className={`jp ${className}`} lang="ja">
        {stripRuby(text)}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          style={{ marginLeft: 8, verticalAlign: 'middle' }}
          onClick={() => setRevealed(true)}
          aria-label="Tampilkan bantuan baca"
        >
          Bantuan baca
        </button>
      </Tag>
    );
  }

  return (
    <Tag className={`jp ${className}`} lang="ja">
      {parseRuby(text).map((segment, index) =>
        segment.reading ? (
          <ruby key={`${segment.text}-${index}`}>
            {segment.text}
            <rt>{segment.reading}</rt>
          </ruby>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        ),
      )}
    </Tag>
  );
}

/** Plain Japanese without furigana, for compact rows. */
export function PlainJapanese({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`jp ${className}`} lang="ja">
      {stripRuby(text)}
    </span>
  );
}

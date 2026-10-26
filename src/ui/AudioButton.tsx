import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, RotateCcw } from 'lucide-react';
import { audio } from '../lib/audio.ts';

/**
 * Audio control. Practice mode allows replay and speed; exam mode is a single
 * play. If the device cannot speak Japanese we say so and never block the item.
 */
export function AudioButton({
  text,
  label = 'Putar audio',
  allowSpeed = false,
  once = false,
  compact = false,
}: {
  text: string;
  label?: string;
  allowSpeed?: boolean;
  once?: boolean;
  compact?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [rate, setRate] = useState(1);
  const [played, setPlayed] = useState(false);
  const supported = audio.supported;
  const hasVoice = audio.hasJapaneseVoice;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      audio.cancel();
    };
  }, []);

  if (!supported) {
    return (
      <p className="audio-note" role="note">
        Audio tidak tersedia di perangkat ini. Gunakan transkrip di bawah.
      </p>
    );
  }

  if (once && played && !playing) {
    return (
      <p className="audio-note" role="note">
        Audio hanya diputar sekali di mode ujian. Transkrip tersedia setelah menjawab.
      </p>
    );
  }

  const play = async () => {
    setPlaying(true);
    setFailed(false);
    const ok = await audio.speak(text, { rate });
    if (!mounted.current) return;
    setPlaying(false);
    setPlayed(true);
    if (!ok) setFailed(true);
  };

  return (
    <div className="stack-xs">
      <div className="audio-row">
        <button
          type="button"
          className={`audio-btn ${playing ? 'audio-btn--playing' : ''}`}
          onClick={() => (playing ? audio.cancel() : void play())}
          aria-label={playing ? 'Hentikan audio' : label}
        >
          {playing ? <Pause size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
          {compact ? null : playing ? 'Memutar…' : label}
        </button>
        {allowSpeed ? (
          <div className="speed" role="group" aria-label="Kecepatan audio">
            {[0.75, 1, 1.25].map((value) => (
              <button key={value} type="button" aria-pressed={rate === value} onClick={() => setRate(value)}>
                {value}×
              </button>
            ))}
          </div>
        ) : null}
        {failed ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void play()}>
            <RotateCcw size={14} aria-hidden /> Coba lagi
          </button>
        ) : null}
      </div>
      {!hasVoice ? (
        <p className="audio-note">
          Suara Jepang tidak terpasang di perangkat ini. Baca transkripnya — jangan lewati latihannya.
        </p>
      ) : null}
      {failed ? (
        <p className="audio-note" role="alert">
          Audio tidak bisa diputar. Coba lagi, atau baca transkrip.
        </p>
      ) : null}
    </div>
  );
}

export function PlayIcon() {
  return <Play size={18} aria-hidden />;
}

/**
 * Audio: device speech synthesis, with an honest fallback.
 *
 * The seed ships no recorded audio, so items carry kana text and the device
 * voices it. If there is no Japanese voice the UI says so and shows the
 * transcript instead of pretending to play something.
 */
export interface SpeakOptions {
  rate?: number;
}

class AudioService {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    if (!('speechSynthesis' in window)) return;
    this.synth = window.speechSynthesis;
    this.pickVoice();
    this.synth.addEventListener?.('voiceschanged', () => this.pickVoice());
  }

  private pickVoice(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    this.voice = voices.find((voice) => voice.lang?.toLowerCase().startsWith('ja')) ?? null;
  }

  get supported(): boolean {
    this.init();
    return Boolean(this.synth);
  }

  get hasJapaneseVoice(): boolean {
    this.init();
    this.pickVoice();
    return Boolean(this.voice);
  }

  get voiceName(): string | null {
    this.init();
    return this.voice?.name ?? null;
  }

  /** Resolves true when speech actually finished. */
  speak(text: string, options: SpeakOptions = {}): Promise<boolean> {
    this.init();
    if (!this.synth || !text.trim()) return Promise.resolve(false);
    this.synth.cancel();
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = options.rate ?? 1;
        utterance.pitch = 1;
        if (this.voice) utterance.voice = this.voice;
        utterance.onend = () => finish(true);
        utterance.onerror = () => finish(false);
        this.synth!.speak(utterance);
        // Some Android voices never fire `end`; do not hang the UI.
        window.setTimeout(() => finish(false), Math.min(30_000, 1200 + text.length * 220));
      } catch {
        finish(false);
      }
    });
  }

  cancel(): void {
    this.synth?.cancel();
  }
}

export const audio = new AudioService();

export function vibrate(pattern: number | number[] = 8): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Haptics are optional; never let them break an answer.
  }
}

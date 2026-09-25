export type AlarmKind = 'start' | 'break' | 'ready';

let audio: AudioContext | null = null;

/** Short synthesized chimes, identical tones to the original timer. */
export function playAlarm(kind: AlarmKind): void {
  try {
    if (!audio) {
      const Ctor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      audio = new Ctor();
    }
    const ctx = audio;
    if (ctx.state === 'suspended') void ctx.resume();
    const tones = kind === 'break' ? [880, 660, 880] : [660, 880];
    const base = ctx.currentTime;
    tones.forEach((hz, i) => {
      const t = base + i * 0.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  } catch {
    /* audio is best-effort */
  }
}

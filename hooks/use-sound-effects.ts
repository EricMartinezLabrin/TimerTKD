import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

type SoundType = 'scoreUp' | 'scoreDown' | 'foulUp' | 'foulDown' | 'timerStart' | 'timerPause';

/**
 * Hook that provides a `playSound` function using the Web Audio API directly.
 * Each action produces a genuinely distinct sound through different waveforms,
 * pitch patterns, and timing — not just different frequencies.
 */
export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    if (Platform.OS !== 'web') return null;
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext || (window as unknown as WebkitWindow).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    // Resume if suspended (browser autoplay policy)
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playSound = useCallback((type: SoundType) => {
    const ctx = getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (type) {
      // ── Score UP: Quick ascending double-beep (two bright square-wave pips) ──
      case 'scoreUp': {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        // First pip — C6 (1047 Hz)
        const osc1 = ctx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(1047, now);
        osc1.connect(gain);
        osc1.start(now);
        osc1.stop(now + 0.06);

        // Second pip — E6 (1319 Hz) — higher = ascending feel
        const gain2 = ctx.createGain();
        gain2.connect(ctx.destination);
        gain2.gain.setValueAtTime(0.20, now + 0.07);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1319, now + 0.07);
        osc2.connect(gain2);
        osc2.start(now + 0.07);
        osc2.stop(now + 0.18);
        break;
      }

      // ── Score DOWN: Descending slide (sine portamento from high to low) ──
      case 'scoreDown': {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.20, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }

      // ── Foul UP: Sharp staccato buzz (sawtooth, short, aggressive) ──
      case 'foulUp': {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(520, now + 0.03);
        osc.frequency.setValueAtTime(440, now + 0.06);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      // ── Foul DOWN: Soft low triangle thud (deep, gentle) ──
      case 'foulDown': {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.20);
        break;
      }

      // ── Timer START: Rising sweep (sine sweeps up, energetic) ──
      case 'timerStart': {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      // ── Timer PAUSE: Falling sweep (triangle drops down, calming) ──
      case 'timerPause': {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.25);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.30);
        break;
      }
    }
  }, [getCtx]);

  return { playSound };
}

// Webkit compat type
interface WebkitWindow {
  webkitAudioContext: typeof AudioContext;
}

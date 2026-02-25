import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

type SoundType = 'scoreUp' | 'scoreDown' | 'foulUp' | 'foulDown' | 'timerStart' | 'timerPause' | 'matchEnd';

const SOUNDS: Record<SoundType, any> = {
  scoreUp: require('@/assets/sounds/scoreUp.wav'),
  scoreDown: require('@/assets/sounds/scoreDown.wav'),
  foulUp: require('@/assets/sounds/foulUp.wav'),
  foulDown: require('@/assets/sounds/foulDown.wav'),
  timerStart: require('@/assets/sounds/timerStart.wav'),
  timerPause: require('@/assets/sounds/timerPause.wav'),
  matchEnd: require('@/assets/sounds/matchEnd.wav'),
};

/**
 * Hook that provides a `playSound` function using `expo-av`.
 * This works uniformly on Android, iOS, and Web.
 */
export function useSoundEffects() {
  const soundsRef = useRef<Record<SoundType, Audio.Sound | null>>({
    scoreUp: null,
    scoreDown: null,
    foulUp: null,
    foulDown: null,
    timerStart: null,
    timerPause: null,
    matchEnd: null,
  });

  useEffect(() => {
    // Pre-load all sounds
    const loadSounds = async () => {
      // Ensure shared audio mode permits playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      }).catch(() => {});

      for (const [key, assetInfo] of Object.entries(SOUNDS)) {
        try {
          const { sound } = await Audio.Sound.createAsync(assetInfo);
          soundsRef.current[key as SoundType] = sound;
        } catch (e) {
          console.warn(`Error loading sound ${key}:`, e);
        }
      }
    };

    loadSounds();

    return () => {
      // Cleanup sounds on unmount
      Object.values(soundsRef.current).forEach((sound) => {
        if (sound) {
          sound.unloadAsync().catch(() => {});
        }
      });
    };
  }, []);

  const playSound = useCallback(async (type: SoundType) => {
    const sound = soundsRef.current[type];
    if (sound) {
      try {
        await sound.stopAsync(); // En caso de que se toque repetidamente rápido
        await sound.playAsync();
      } catch (e) {
        console.warn(`Error playing sound ${type}:`, e);
      }
    }
  }, []);

  return { playSound };
}

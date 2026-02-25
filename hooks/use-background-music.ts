import { useEffect, useRef, useState, useCallback } from 'react';
import { Audio } from 'expo-av';

const MUSIC_ASSETS = [
  require('@/assets/music/Berserkers_Unidos.mp3'),
  require('@/assets/music/El_Camino_de_Berserkers.mp3'),
];

export function useBackgroundMusic() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  const isPlayingRef = useRef(false);
  const isEnabledRef = useRef(true);
  const volumeRef = useRef(0.7); // Default to 70% volume
  const [volume, setVolumeState] = useState(0.7);
  const [isEnabled, setIsEnabledState] = useState(true);

  const setVolume = useCallback(async (v: number) => {
    // Clamp between 0 and 1
    const safeVolume = Math.max(0, Math.min(1, v));
    setVolumeState(safeVolume);
    volumeRef.current = safeVolume;
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(safeVolume).catch(() => {});
    }
  }, []);

  const setIsEnabled = useCallback(async (enabled: boolean) => {
    setIsEnabledState(enabled);
    isEnabledRef.current = enabled;
    if (soundRef.current) {
      if (enabled && isPlayingRef.current) {
        await soundRef.current.playAsync().catch(() => {});
      } else {
        await soundRef.current.pauseAsync().catch(() => {});
      }
    }
  }, []);

  const setIsPlaying = useCallback(async (play: boolean) => {
    isPlayingRef.current = play;
    if (soundRef.current) {
      if (play && isEnabledRef.current) {
        soundRef.current.playAsync().then(() => {
          // If the audio context was suspended on web, playAsync attempts to resume it.
        }).catch((e) => {
          console.warn("Background music play failed:", e);
        });
      } else {
        soundRef.current.pauseAsync().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let localSound: Audio.Sound | null = null;

    const loadAndPlayNext = async () => {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        }).catch(() => {});

        const { sound } = await Audio.Sound.createAsync(
          MUSIC_ASSETS[currentSongIndex],
          {
            shouldPlay: isPlayingRef.current && isEnabledRef.current,
            volume: volumeRef.current,
          }
        );

        if (isCancelled) {
          sound.unloadAsync().catch(() => {});
          return;
        }

        soundRef.current = sound;
        localSound = sound;

        sound.setOnPlaybackStatusUpdate((status) => {
          if ('didJustFinish' in status && status.didJustFinish) {
            // Unload current and trigger next song load
            sound.unloadAsync().catch(() => {});
            setCurrentSongIndex((prev) => (prev + 1) % MUSIC_ASSETS.length);
          }
        });
      } catch (e) {
        console.warn("Failed to load background music", e);
      }
    };

    loadAndPlayNext();

    return () => {
      isCancelled = true;
      if (localSound) {
        localSound.unloadAsync().catch(() => {});
        if (soundRef.current === localSound) {
          soundRef.current = null;
        }
      }
    };
  }, [currentSongIndex]);

  return {
    setIsPlaying,
    volume,
    setVolume,
    isEnabled,
    setIsEnabled,
  };
}

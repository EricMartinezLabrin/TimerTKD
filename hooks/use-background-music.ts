import { useEffect, useRef, useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Paths, File } from 'expo-file-system';

const STORAGE_KEY = '@custom_music_playlist';

export type CustomTrack = {
  id: string;
  name: string;
  uri: string;
  isCustom: true;
};

export type DefaultTrack = {
  id: string;
  name: string;
  source: any;
  isCustom: false;
};

export type Track = DefaultTrack | CustomTrack;

const DEFAULT_MUSIC_ASSETS: DefaultTrack[] = [
  { id: 'default_1', name: 'Berserkers Unidos', source: require('@/assets/music/Berserkers_Unidos.mp3'), isCustom: false },
  { id: 'default_2', name: 'El Camino de Berserkers', source: require('@/assets/music/El_Camino_de_Berserkers.mp3'), isCustom: false },
];

export function useBackgroundMusic() {
  const soundRef = useRef<Audio.Sound | null>(null);
  
  const [customTracks, setCustomTracks] = useState<CustomTrack[]>([]);
  const playlist = [...DEFAULT_MUSIC_ASSETS, ...customTracks];
  
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  const isPlayingRef = useRef(false);
  const isEnabledRef = useRef(true);
  const volumeRef = useRef(0.7); // Default to 70% volume
  const [volume, setVolumeState] = useState(0.7);
  const [isEnabled, setIsEnabledState] = useState(true);

  // Load custom tracks on init
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        setCustomTracks(JSON.parse(data));
      }
    }).catch(console.warn);
  }, []);

  const addCustomTrack = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const newFile = new File(Paths.document, `${Date.now()}_${asset.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`);
      
      await new File(asset.uri).copy(newFile);

      const newTrack: CustomTrack = {
        id: Date.now().toString(),
        name: asset.name,
        uri: newFile.uri,
        isCustom: true,
      };

      const newTracks = [...customTracks, newTrack];
      setCustomTracks(newTracks);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTracks));
    } catch (e) {
      console.warn("Error adding custom track", e);
    }
  };

  const removeCustomTrack = async (id: string) => {
    const trackToRemove = customTracks.find(t => t.id === id);
    if (trackToRemove) {
      try {
        await new File(trackToRemove.uri).delete();
      } catch {}
    }
    const newTracks = customTracks.filter(t => t.id !== id);
    setCustomTracks(newTracks);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTracks));
    
    // adjust current index safely if we were playing the deleted track or a track after it
    // simple fallback: reset to 0 to prevent out of bounds
    setCurrentSongIndex(0); 
  };

  const playSongAtIndex = (index: number) => {
    if (index >= 0 && index < playlist.length) {
      setCurrentSongIndex(index);
    }
  };

  const setVolume = useCallback(async (v: number) => {
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
        soundRef.current.playAsync().then(() => {}).catch((e) => {
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

        // Safely bound index
        const actualIndex = currentSongIndex < playlist.length ? currentSongIndex : 0;
        const track = playlist[actualIndex];
        const source = track.isCustom ? { uri: track.uri } : track.source;

        const { sound } = await Audio.Sound.createAsync(
          source,
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
            sound.unloadAsync().catch(() => {});
            setCurrentSongIndex((prev) => (prev + 1) % playlist.length);
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
  }, [currentSongIndex, customTracks.length]);

  return {
    setIsPlaying,
    volume,
    setVolume,
    isEnabled,
    setIsEnabled,
    playlist,
    currentSongIndex,
    playSongAtIndex,
    addCustomTrack,
    removeCustomTrack,
  };
}

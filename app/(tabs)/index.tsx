import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import { Animated, Modal, PanResponder, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import { useBackgroundMusic } from '@/hooks/use-background-music';

const DEFAULT_TIME_SECONDS = 60;
const OVERLAY_DURATION_MS = 5000;
const VIDEO_ASSETS = [
  require('@/assets/images/berserkers_1.webm'),
  require('@/assets/images/berserkers_2.webm'),
];

type CompetitorColor = 'azul' | 'rojo';

export default function HomeScreen() {
  const [blueScore, setBlueScore] = useState(0);
  const [redScore, setRedScore] = useState(0);
  const [blueFouls, setBlueFouls] = useState(0);
  const [redFouls, setRedFouls] = useState(0);
  const [blueName, setBlueName] = useState('Azul');
  const [redName, setRedName] = useState('Rojo');
  const [isSwapped, setIsSwapped] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const [durationInput, setDurationInput] = useState(String(DEFAULT_TIME_SECONDS));
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_TIME_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [activeVideoSource, setActiveVideoSource] = useState<VideoSource>(null);
  const videoOpacity = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const hasStartedOverlayAnimation = useRef(false);
  const sourceSwapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startVideoOverlayAnimationRef = useRef(startVideoOverlayAnimation);

  const { playSound } = useSoundEffects();
  const music = useBackgroundMusic();

  startVideoOverlayAnimationRef.current = startVideoOverlayAnimation;

  const videoPlayer = useVideoPlayer(null, (player) => {
    player.loop = false;
    player.volume = isVideoMuted ? 0 : 1;
  });

  useEffect(() => {
    videoPlayer.volume = isVideoMuted ? 0 : 1;
  }, [isVideoMuted, videoPlayer]);

  useEffect(() => {
    if (!activeVideoSource) {
      return;
    }

    videoPlayer.replace(activeVideoSource);
    videoPlayer.play();

    if (animationFallbackTimeoutRef.current) {
      clearTimeout(animationFallbackTimeoutRef.current);
    }

    animationFallbackTimeoutRef.current = setTimeout(() => {
      startVideoOverlayAnimationRef.current();
    }, 420);

    return () => {
      if (animationFallbackTimeoutRef.current) {
        clearTimeout(animationFallbackTimeoutRef.current);
        animationFallbackTimeoutRef.current = null;
      }
    };
  }, [activeVideoSource, videoPlayer]);

  const musicTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isRunning) {
      // Upon starting, delay music until video overlay finishes (5000ms)
      musicTimeoutRef.current = setTimeout(() => {
        music.setIsPlaying(true);
      }, OVERLAY_DURATION_MS);
    } else {
      // Whenever stopped or paused, immediately clear any pending timeout and pause music
      if (musicTimeoutRef.current) {
        clearTimeout(musicTimeoutRef.current);
        musicTimeoutRef.current = null;
      }
      music.setIsPlaying(false);
    }

    return () => {
      if (musicTimeoutRef.current) {
        clearTimeout(musicTimeoutRef.current);
      }
    };
  }, [isRunning, music.setIsPlaying]);

  function startVideoOverlayAnimation() {
    if (hasStartedOverlayAnimation.current) {
      return;
    }

    hasStartedOverlayAnimation.current = true;

    // Cross-fade: logo out, video in
    videoOpacity.stopAnimation();
    logoOpacity.stopAnimation();

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(videoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // After video duration, cross-fade back: video out, logo in
      Animated.sequence([
        Animated.delay(OVERLAY_DURATION_MS - 800),
        Animated.parallel([
          Animated.timing(videoOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
        ]),
      ]).start(() => {
        setActiveVideoSource(null);
        hasStartedOverlayAnimation.current = false;
        if (animationFallbackTimeoutRef.current) {
          clearTimeout(animationFallbackTimeoutRef.current);
          animationFallbackTimeoutRef.current = null;
        }
      });
    });
  }

  const showRandomStartVideo = () => {
    const randomIndex = Math.floor(Math.random() * VIDEO_ASSETS.length);
    if (sourceSwapTimeoutRef.current) {
      clearTimeout(sourceSwapTimeoutRef.current);
      sourceSwapTimeoutRef.current = null;
    }

    // Force source refresh so the overlay appears even when the random pick repeats.
    setActiveVideoSource(null);
    sourceSwapTimeoutRef.current = setTimeout(() => {
      setActiveVideoSource(VIDEO_ASSETS[randomIndex]);
      sourceSwapTimeoutRef.current = null;
    }, 30);

    hasStartedOverlayAnimation.current = false;
    videoOpacity.stopAnimation();
    videoOpacity.setValue(0);
    logoOpacity.stopAnimation();
    logoOpacity.setValue(1);
  };

  const handleToggleTimer = () => {
    setIsRunning((previous) => {
      const nextIsRunning = !previous;
      if (nextIsRunning) {
        playSound('timerStart');
        showRandomStartVideo();
      } else {
        playSound('timerPause');
      }
      return nextIsRunning;
    });
  };

  const handleResetMatch = () => {
    setIsRunning(false);
    setBlueScore(0);
    setRedScore(0);
    setBlueFouls(0);
    setRedFouls(0);

    const parsedSeconds = Number.parseInt(durationInput, 10);
    const safeSeconds = Number.isFinite(parsedSeconds) && parsedSeconds > 0 ? parsedSeconds : DEFAULT_TIME_SECONDS;
    setRemainingSeconds(safeSeconds);

    setActiveVideoSource(null);
    hasStartedOverlayAnimation.current = false;
    videoOpacity.stopAnimation();
    videoOpacity.setValue(0);
    logoOpacity.stopAnimation();
    logoOpacity.setValue(1);
  };

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          setIsRunning(false);
          playSound('matchEnd');
          // Reset countdown safely to input duration or default
          const parsedSeconds = Number.parseInt(durationInput, 10);
          return Number.isFinite(parsedSeconds) && parsedSeconds > 0 ? parsedSeconds : DEFAULT_TIME_SECONDS;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, remainingSeconds, durationInput, playSound]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [remainingSeconds]);

  const applyDuration = () => {
    const parsedSeconds = Number.parseInt(durationInput, 10);
    const safeSeconds = Number.isFinite(parsedSeconds) && parsedSeconds > 0 ? parsedSeconds : DEFAULT_TIME_SECONDS;
    setRemainingSeconds(safeSeconds);
    setDurationInput(String(safeSeconds));
    setIsRunning(false);
  };

  const increaseScore = (color: CompetitorColor) => {
    playSound('scoreUp');
    if (color === 'azul') {
      setBlueScore((value) => value + 1);
      return;
    }

    setRedScore((value) => value + 1);
  };

  const decreaseScore = (color: CompetitorColor) => {
    playSound('scoreDown');
    if (color === 'azul') {
      setBlueScore((value) => Math.max(0, value - 1));
      return;
    }

    setRedScore((value) => Math.max(0, value - 1));
  };

  const handleIncreaseFoul = (color: CompetitorColor) => {
    playSound('foulUp');
    if (color === 'azul') {
      setBlueFouls((value) => value + 1);
    } else {
      setRedFouls((value) => value + 1);
    }
  };

  const handleDecreaseFoul = (color: CompetitorColor) => {
    playSound('foulDown');
    if (color === 'azul') {
      setBlueFouls((value) => Math.max(0, value - 1));
    } else {
      setRedFouls((value) => Math.max(0, value - 1));
    }
  };

  const handleSwap = () => {
    setIsSwapped((prev) => !prev);
  };

  const handleCast = async () => {
    if (Platform.OS === 'web') {
      try {
        // Use the Presentation API if available (Chrome)
        if ('presentation' in navigator && (navigator as PresentationNavigator).presentation?.defaultRequest !== undefined) {
          const request = new PresentationRequest([window.location.href]);
          await request.start();
          return;
        }

        // Fallback: open in a new window to cast via browser tab casting
        window.open(window.location.href, '_blank');
      } catch {
        // User cancelled or not supported
      }
      return;
    }

    // On native, we'll show a simple alert hinting use screen mirroring (no native Chromecast SDK without extra deps)
    const { Alert } = await import('react-native');
    Alert.alert(
      'Compartir pantalla',
      'Usa la función de duplicar pantalla (Screen Mirroring) de tu dispositivo para transmitir a un Chromecast o TV compatible.',
      [{ text: 'Entendido' }]
    );
  };

  // Determine which competitor data goes on left vs right
  const leftCompetitor = isSwapped
    ? {
        label: redName,
        score: redScore,
        fouls: redFouls,
        onChangeLabel: setRedName,
        onIncreaseScore: () => increaseScore('rojo'),
        onDecreaseScore: () => decreaseScore('rojo'),
        onIncreaseFoul: () => handleIncreaseFoul('rojo'),
        onDecreaseFoul: () => handleDecreaseFoul('rojo'),
        pencilSide: 'right' as const,
      }
    : {
        label: blueName,
        score: blueScore,
        fouls: blueFouls,
        onChangeLabel: setBlueName,
        onIncreaseScore: () => increaseScore('azul'),
        onDecreaseScore: () => decreaseScore('azul'),
        onIncreaseFoul: () => handleIncreaseFoul('azul'),
        onDecreaseFoul: () => handleDecreaseFoul('azul'),
        pencilSide: 'left' as const,
      };

  const rightCompetitor = isSwapped
    ? {
        label: blueName,
        score: blueScore,
        fouls: blueFouls,
        onChangeLabel: setBlueName,
        onIncreaseScore: () => increaseScore('azul'),
        onDecreaseScore: () => decreaseScore('azul'),
        onIncreaseFoul: () => handleIncreaseFoul('azul'),
        onDecreaseFoul: () => handleDecreaseFoul('azul'),
        pencilSide: 'left' as const,
      }
    : {
        label: redName,
        score: redScore,
        fouls: redFouls,
        onChangeLabel: setRedName,
        onIncreaseScore: () => increaseScore('rojo'),
        onDecreaseScore: () => decreaseScore('rojo'),
        onIncreaseFoul: () => handleIncreaseFoul('rojo'),
        onDecreaseFoul: () => handleDecreaseFoul('rojo'),
        pencilSide: 'right' as const,
      };

  // Background colors based on swap state
  const leftBgColor = isSwapped ? '#dc2626' : '#0b51ff';
  const rightBgColor = isSwapped ? '#0b51ff' : '#dc2626';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={[styles.leftHalf, { backgroundColor: leftBgColor }]} />
        <View style={[styles.rightHalf, { backgroundColor: rightBgColor }]} />
      </View>

      <View style={styles.container}>
        <View style={styles.topControlsRow}>
          <View style={styles.timerCompact}>
            <Text style={styles.timerCompactText}>{formattedTime}</Text>
            <Pressable style={styles.controlIconButton} onPress={handleToggleTimer}>
              <Ionicons name={isRunning ? 'pause' : 'play'} size={20} color="#ffffff" />
            </Pressable>
            <Pressable style={styles.controlIconButton} onPress={handleResetMatch}>
              <Ionicons name="refresh" size={20} color="#ffffff" />
            </Pressable>
          </View>

          <View style={styles.topRightButtons}>
            <Pressable style={styles.castButton} onPress={handleCast}>
              <Ionicons name="tv-outline" size={16} color="#ffffff" />
            </Pressable>

            <Pressable style={styles.infoButton} onPress={() => setIsHelpVisible(true)}>
              <Text style={styles.infoIcon}>i</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.scoreboardRow}>
          <CompetitorCard
            label={leftCompetitor.label}
            score={leftCompetitor.score}
            fouls={leftCompetitor.fouls}
            pencilSide={leftCompetitor.pencilSide}
            onChangeLabel={leftCompetitor.onChangeLabel}
            onIncreaseScore={leftCompetitor.onIncreaseScore}
            onDecreaseScore={leftCompetitor.onDecreaseScore}
            onIncreaseFoul={leftCompetitor.onIncreaseFoul}
            onDecreaseFoul={leftCompetitor.onDecreaseFoul}
          />

          <CompetitorCard
            label={rightCompetitor.label}
            score={rightCompetitor.score}
            fouls={rightCompetitor.fouls}
            pencilSide={rightCompetitor.pencilSide}
            onChangeLabel={rightCompetitor.onChangeLabel}
            onIncreaseScore={rightCompetitor.onIncreaseScore}
            onDecreaseScore={rightCompetitor.onDecreaseScore}
            onIncreaseFoul={rightCompetitor.onIncreaseFoul}
            onDecreaseFoul={rightCompetitor.onDecreaseFoul}
          />

          <View pointerEvents="none" style={styles.logoCenterOverlay}>
            <View style={styles.logoVideoContainer}>
              <Animated.View style={[styles.logoInner, { opacity: logoOpacity }]}>
                <Image source={require('@/assets/images/Berserkers_logo.webp')} style={styles.logo} contentFit="contain" />
              </Animated.View>

              {activeVideoSource ? (
                <Animated.View style={[styles.videoInner, { opacity: videoOpacity }]}>
                  <VideoView
                    player={videoPlayer}
                    nativeControls={false}
                    contentFit="cover"
                    style={[StyleSheet.absoluteFillObject, { backgroundColor: 'transparent' }]}
                    onFirstFrameRender={() => startVideoOverlayAnimationRef.current()}
                  />
                </Animated.View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.bottomFabRow}>
          <Pressable style={styles.configFab} onPress={handleSwap}>
            <Ionicons name="swap-horizontal" size={20} color="#ffffff" />
          </Pressable>
          <Pressable style={styles.configFab} onPress={() => setIsVideoMuted((v) => !v)}>
            <Ionicons name={isVideoMuted ? 'volume-mute' : 'volume-high'} size={20} color="#ffffff" />
          </Pressable>
          <Pressable style={styles.configFab} onPress={() => setIsConfigVisible(true)}>
            <Ionicons name="settings-sharp" size={22} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isConfigVisible}
        onRequestClose={() => setIsConfigVisible(false)}>
        <View style={styles.configOverlay}>
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>Tiempo (segundos)</Text>
            <View style={styles.configControls}>
              <TextInput
                style={styles.configInput}
                keyboardType="number-pad"
                value={durationInput}
                onChangeText={setDurationInput}
                placeholder="60"
                placeholderTextColor="rgba(255,255,255,0.55)"
              />
              <Pressable
                style={styles.configApplyButton}
                onPress={() => {
                  applyDuration();
                  setIsConfigVisible(false);
                }}>
                <Text style={styles.configApplyText}>Guardar</Text>
              </Pressable>
            </View>

            <View style={styles.configDivider} />

            <View style={styles.musicConfigRow}>
              <Text style={styles.configTitle}>Música de fondo</Text>
              <Switch
                value={music.isEnabled}
                onValueChange={music.setIsEnabled}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#0b51ff' }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.musicVolumeRow}>
              <Pressable style={styles.volumeButton} onPress={() => music.setVolume(music.volume - 0.1)}>
                <Ionicons name="volume-low" size={24} color="#ffffff" />
              </Pressable>
              <Text style={styles.musicVolumeText}>{Math.round(music.volume * 100)}%</Text>
              <Pressable style={styles.volumeButton} onPress={() => music.setVolume(music.volume + 0.1)}>
                <Ionicons name="volume-high" size={24} color="#ffffff" />
              </Pressable>
            </View>

            <Pressable style={styles.closeButton} onPress={() => setIsConfigVisible(false)}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isHelpVisible}
        onRequestClose={() => setIsHelpVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Instrucciones</Text>
            <Text style={styles.modalText}>• Tap corto: suma 1 punto.</Text>
            <Text style={styles.modalText}>• Swipe arriba (↑): suma 1 punto.</Text>
            <Text style={styles.modalText}>• Swipe derecha (→): suma 1 punto.</Text>
            <Text style={styles.modalText}>• Swipe abajo (↓): resta 1 punto.</Text>
            <Text style={styles.modalText}>• Swipe izquierda (←): resta 1 punto.</Text>

            <Pressable style={styles.closeButton} onPress={() => setIsHelpVisible(false)}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Type declarations for the Web Presentation API (not in standard TS lib)
declare class PresentationRequest {
  constructor(urls: string[]);
  start(): Promise<unknown>;
}

interface PresentationNavigator {
  presentation?: {
    defaultRequest: unknown;
  };
}

type CompetitorCardProps = {
  label: string;
  score: number;
  fouls: number;
  pencilSide: 'left' | 'right';
  onChangeLabel: (value: string) => void;
  onIncreaseScore: () => void;
  onDecreaseScore: () => void;
  onIncreaseFoul: () => void;
  onDecreaseFoul: () => void;
};

function CompetitorCard({
  label,
  score,
  fouls,
  pencilSide,
  onChangeLabel,
  onIncreaseScore,
  onDecreaseScore,
  onIncreaseFoul,
  onDecreaseFoul,
}: CompetitorCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const gestureStartTime = useRef(0);

  const scoreGestureResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gestureStartTime.current = Date.now();
        },
        onPanResponderRelease: (_, gestureState) => {
          const elapsed = Date.now() - gestureStartTime.current;
          const { dx, dy } = gestureState;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          const isShortTap = elapsed <= 220 && absDx < 12 && absDy < 12;
          if (isShortTap) {
            onIncreaseScore();
            return;
          }

          const isDecrementGesture = dx <= -28 || dy >= 28;
          if (isDecrementGesture) {
            onDecreaseScore();
            return;
          }

          const isIncrementGesture = dx >= 28 || dy <= -28;
          if (isIncrementGesture) {
            onIncreaseScore();
          }
        },
      }),
    [onDecreaseScore, onIncreaseScore]
  );

  const pencilButton = (
    <Pressable style={styles.nameEditButton} onPress={() => setIsEditingName((value) => !value)}>
      <Ionicons name="pencil" size={16} color="#ffffff" />
    </Pressable>
  );

  return (
    <View style={styles.competitorCard}>
      <View style={styles.competitorHeaderRow}>
        {pencilSide === 'left' && pencilButton}

        {isEditingName ? (
          <TextInput
            value={label}
            onChangeText={onChangeLabel}
            placeholder="Nombre"
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={styles.competitorLabelInput}
            autoFocus
            selectTextOnFocus
            onBlur={() => setIsEditingName(false)}
          />
        ) : (
          <Text style={styles.competitorLabelText}>{label}</Text>
        )}

        {pencilSide === 'right' && pencilButton}
      </View>

      <View style={styles.scoreZone} {...scoreGestureResponder.panHandlers}>
        <Text style={styles.scoreValue}>{score}</Text>
      </View>

      <View style={styles.foulsBlock}>
        <Text style={styles.foulsLabel}>Faltas: {fouls}</Text>
        <View style={styles.foulsButtonsRow}>
          <Pressable style={styles.foulButton} onPress={onDecreaseFoul}>
            <Text style={styles.foulButtonText}>-</Text>
          </Pressable>
          <Pressable style={styles.foulButton} onPress={onIncreaseFoul}>
            <Text style={styles.foulButtonText}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b1026',
    position: 'relative',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  leftHalf: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: '#0b51ff',
  },
  rightHalf: {
    position: 'absolute',
    left: '50%',
    top: -120,
    bottom: -120,
    width: '72%',
    backgroundColor: '#dc2626',
    transform: [{ rotate: '-10deg' }],
    shadowColor: '#0b1026',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: -6, height: 0 },
    elevation: 10,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 72,
    gap: 8,
    zIndex: 2,
  },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timerCompactText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
  },
  controlIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    backgroundColor: 'rgba(0,0,0,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightButtons: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  castButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 560,
    height: 170,
  },
  logoCenterOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  infoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  scoreboardRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    position: 'relative',
  },
  competitorCard: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  competitorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    gap: 8,
  },
  competitorLabelText: {
    flex: 1,
    fontSize: 40,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1,
  },
  competitorLabelInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1,
    paddingVertical: 2,
  },
  nameEditButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreZone: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 104,
    fontWeight: '900',
    lineHeight: 108,
    color: '#ffffff',
  },
  foulsBlock: {
    paddingVertical: 6,
    gap: 8,
  },
  foulsLabel: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  foulsButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  foulButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  foulButtonText: {
    fontSize: 30,
    lineHeight: 33,
    fontWeight: '900',
    color: '#ffffff',
  },
  bottomFabRow: {
    position: 'absolute',
    left: '50%',
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    transform: [{ translateX: '-50%' }],
  },
  configFab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  configCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(8, 13, 34, 0.96)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  configTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  configControls: {
    flexDirection: 'row',
    gap: 8,
  },
  configInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  configApplyButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  configApplyText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  configDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 4,
  },
  musicConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  musicVolumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 4,
  },
  volumeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  musicVolumeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    width: 60,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(7, 12, 33, 0.94)',
    padding: 20,
    gap: 8,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },
  modalText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  logoVideoContainer: {
    width: 304,
    height: 304,
    borderRadius: 9999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  logoInner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  videoInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});

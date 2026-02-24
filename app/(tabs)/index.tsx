import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  const [durationInput, setDurationInput] = useState(String(DEFAULT_TIME_SECONDS));
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_TIME_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [activeVideoSource, setActiveVideoSource] = useState<VideoSource>(null);
  const videoOverlayOpacity = useRef(new Animated.Value(0)).current;
  const hasStartedOverlayAnimation = useRef(false);
  const sourceSwapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startVideoOverlayAnimationRef = useRef(startVideoOverlayAnimation);

  startVideoOverlayAnimationRef.current = startVideoOverlayAnimation;

  const videoPlayer = useVideoPlayer(null, (player) => {
    player.loop = false;
  });

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

  function startVideoOverlayAnimation() {
    if (hasStartedOverlayAnimation.current) {
      return;
    }

    hasStartedOverlayAnimation.current = true;

    videoOverlayOpacity.stopAnimation();
    videoOverlayOpacity.setValue(1);

    Animated.sequence([
      Animated.delay(OVERLAY_DURATION_MS - 480),
      Animated.timing(videoOverlayOpacity, {
        toValue: 0,
        duration: 480,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setActiveVideoSource(null);
      hasStartedOverlayAnimation.current = false;
      if (animationFallbackTimeoutRef.current) {
        clearTimeout(animationFallbackTimeoutRef.current);
        animationFallbackTimeoutRef.current = null;
      }
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
    videoOverlayOpacity.stopAnimation();
    videoOverlayOpacity.setValue(0);
  };

  const handleToggleTimer = () => {
    setIsRunning((previous) => {
      const nextIsRunning = !previous;
      if (nextIsRunning) {
        showRandomStartVideo();
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
    videoOverlayOpacity.stopAnimation();
    videoOverlayOpacity.setValue(0);
  };

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          setIsRunning(false);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, remainingSeconds]);

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
    if (color === 'azul') {
      setBlueScore((value) => value + 1);
      return;
    }

    setRedScore((value) => value + 1);
  };

  const decreaseScore = (color: CompetitorColor) => {
    if (color === 'azul') {
      setBlueScore((value) => Math.max(0, value - 1));
      return;
    }

    setRedScore((value) => Math.max(0, value - 1));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={styles.leftHalf} />
        <View style={styles.rightHalf} />
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

          <Pressable style={styles.infoButton} onPress={() => setIsHelpVisible(true)}>
            <Text style={styles.infoIcon}>i</Text>
          </Pressable>
        </View>

        <View style={styles.scoreboardRow}>
          <CompetitorCard
            label="Azul"
            score={blueScore}
            fouls={blueFouls}
            onIncreaseScore={() => increaseScore('azul')}
            onDecreaseScore={() => decreaseScore('azul')}
            onIncreaseFoul={() => setBlueFouls((value) => value + 1)}
            onDecreaseFoul={() => setBlueFouls((value) => Math.max(0, value - 1))}
          />

          <CompetitorCard
            label="Rojo"
            score={redScore}
            fouls={redFouls}
            onIncreaseScore={() => increaseScore('rojo')}
            onDecreaseScore={() => decreaseScore('rojo')}
            onIncreaseFoul={() => setRedFouls((value) => value + 1)}
            onDecreaseFoul={() => setRedFouls((value) => Math.max(0, value - 1))}
          />

          <View pointerEvents="none" style={styles.logoCenterOverlay}>
            <Image source={require('@/assets/images/Berserkers_logo.webp')} style={styles.logo} contentFit="contain" />
          </View>
        </View>

        <Pressable style={styles.configFab} onPress={() => setIsConfigVisible(true)}>
          <Ionicons name="settings-sharp" size={22} color="#ffffff" />
        </Pressable>
      </View>

      {activeVideoSource ? (
        <Animated.View pointerEvents="none" style={[styles.videoOverlayMedia, { opacity: videoOverlayOpacity }]}>
          <VideoView
            player={videoPlayer}
            nativeControls={false}
            contentFit="contain"
            style={StyleSheet.absoluteFillObject}
            onFirstFrameRender={() => startVideoOverlayAnimationRef.current()}
          />
        </Animated.View>
      ) : null}

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

type CompetitorCardProps = {
  label: string;
  score: number;
  fouls: number;
  onIncreaseScore: () => void;
  onDecreaseScore: () => void;
  onIncreaseFoul: () => void;
  onDecreaseFoul: () => void;
};

function CompetitorCard({
  label,
  score,
  fouls,
  onIncreaseScore,
  onDecreaseScore,
  onIncreaseFoul,
  onDecreaseFoul,
}: CompetitorCardProps) {
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

  return (
    <View style={styles.competitorCard}>
      <Text style={styles.competitorLabel}>{label}</Text>

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
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
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
  competitorLabel: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1,
  },
  scoreZone: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 88,
    fontWeight: '900',
    lineHeight: 92,
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
  configFab: {
    position: 'absolute',
    left: '50%',
    bottom: 18,
    marginLeft: -21,
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
  videoOverlayMedia: {
    position: 'absolute',
    zIndex: 20,
    left: '28%',
    top: '7%',
    width: '44%',
    height: '86%',
    backgroundColor: 'transparent',
  },
});

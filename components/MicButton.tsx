import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, shadow } from '../lib/theme';

export type MicPhase = 'idle' | 'recording' | 'transcribing' | 'analyzing';

type Props = {
  phase: MicPhase;
  onToggle: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
};

const PHASE_LABEL: Record<MicPhase, string> = {
  idle: 'Tryck eller håll in för att spela in',
  recording: 'Spelar in – tryck för att stoppa',
  transcribing: 'Transkriberar…',
  analyzing: 'Matchar mot prislistan…',
};

export function MicButton({ phase, onToggle, onHoldStart, onHoldEnd }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const holding = useRef(false);
  const busy = phase === 'transcribing' || phase === 'analyzing';
  const recording = phase === 'recording';

  useEffect(() => {
    if (recording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.35, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
  }, [recording, pulse]);

  return (
    <View style={styles.wrap}>
      <View style={styles.buttonArea}>
        <Animated.View
          style={[
            styles.halo,
            recording ? { transform: [{ scale: pulse }] } : styles.haloHidden,
          ]}
        />
        <Pressable
          disabled={busy}
          onPress={() => {
            if (!holding.current) onToggle();
          }}
          onLongPress={() => {
            holding.current = true;
            onHoldStart();
          }}
          onPressOut={() => {
            if (holding.current) {
              holding.current = false;
              onHoldEnd();
            }
          }}
          style={({ pressed }) => [
            styles.button,
            recording && styles.buttonRecording,
            pressed && !busy && styles.buttonPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Ionicons
              name={recording ? 'stop' : 'mic'}
              size={30}
              color={recording ? colors.text : colors.onAccent}
            />
          )}
        </Pressable>
      </View>
      <Text style={styles.label}>{PHASE_LABEL[phase]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 12,
  },
  buttonArea: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 69, 58, 0.25)',
  },
  haloHidden: {
    opacity: 0,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    ...shadow.button,
  },
  buttonRecording: {
    backgroundColor: colors.recording,
    boxShadow: '0 6px 20px rgba(255, 69, 58, 0.35)',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  label: {
    color: colors.textSecondary,
  },
});

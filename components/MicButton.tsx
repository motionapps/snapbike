import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';
import { colors } from '../lib/theme';
import { styles } from './MicButton.styles';

export type MicPhase = 'idle' | 'recording' | 'transcribing' | 'analyzing';

type Props = {
  phase: MicPhase;
  onToggle: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  /** Skriv över standardtexterna, t.ex. "Matchar…" på besiktningen. */
  labels?: Partial<Record<MicPhase, string>>;
};

const PHASE_LABEL: Record<MicPhase, string> = {
  idle: 'Tryck eller håll in för att spela in',
  recording: 'Spelar in – tryck för att stoppa',
  transcribing: 'Transkriberar…',
  analyzing: 'Matchar mot prislistan…',
};

export function MicButton({ phase, onToggle, onHoldStart, onHoldEnd, labels }: Props) {
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
      <Text style={styles.label}>{labels?.[phase] ?? PHASE_LABEL[phase]}</Text>
    </View>
  );
}

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, TextStyle, View } from 'react-native';

/** Time for the crest to pass one letter. */
const MS_PER_CHAR = 80;

/** Text whose letters rise and brighten in a wave running left to right. */
export function WaveText({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const progress = useRef(new Animated.Value(0)).current;
  const chars = [...text];
  // The wave crest travels past the last letter before the loop restarts.
  const span = chars.length + 4;

  useEffect(() => {
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: span * MS_PER_CHAR,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [progress, span]);

  return (
    <View style={styles.row} pointerEvents="none">
      {chars.map((char, i) => {
        const crest = (i + 2) / span;
        const range = [crest - 2 / span, crest, crest + 2 / span];
        return (
          <Animated.Text
            key={i}
            style={[
              style,
              {
                opacity: progress.interpolate({
                  inputRange: range,
                  outputRange: [0.4, 1, 0.4],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: range,
                      outputRange: [0, -3, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            {char}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});

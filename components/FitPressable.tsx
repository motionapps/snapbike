import { useCallback, useState } from 'react';
import {
  Pressable,
  useWindowDimensions,
  type LayoutChangeEvent,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { PHONE_MAX_WIDTH } from '../lib/theme';

/** Side padding of a fitted button, as a share of its content width. */
const SIDE_PADDING = 0.15;

/**
 * On wider screens (tablet/desktop) a full-width button is centered and sized
 * to its content plus 15% of that width on each side. On phones it is left as is.
 * Spread `style` last into the button's style and pass `onLayout` to the button.
 */
export function useFitButton(): { style?: ViewStyle; onLayout?: (e: LayoutChangeEvent) => void } {
  const { width } = useWindowDimensions();
  const [padding, setPadding] = useState(0);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      // The measured width includes the current padding; strip it to get the content.
      const content = e.nativeEvent.layout.width - 2 * padding;
      const next = Math.round(content * SIDE_PADDING);
      if (next !== padding) setPadding(next);
    },
    [padding],
  );

  if (width < PHONE_MAX_WIDTH) return {};
  return { style: { alignSelf: 'center', paddingHorizontal: padding }, onLayout };
}

/** Pressable for full-width text buttons: fitted and centered on wider screens (see useFitButton). */
export function FitPressable({ style, ...props }: PressableProps) {
  const fit = useFitButton();
  return (
    <Pressable
      {...props}
      onLayout={fit.onLayout}
      style={(state) => [typeof style === 'function' ? style(state) : style, fit.style]}
    />
  );
}
